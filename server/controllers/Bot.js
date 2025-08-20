const Ticket = require("../models/Ticket");
const Query = require("../models/Query");
const redisClient = require("../config/redisClient");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendTicketNotification, sendTicketAcknowledgement } = require("../utils/emailTemplate");
const mailSender = require("../utils/mailSender");

const {
    // embeddings + math
    generateEmbedding,
    safeCosineSimilarity,

    // parsing / detection
    escapeRegex,
    inferCourseTitle,
    extractPossibleCourseQuery,
    isAffirmingThat,
    isUnsafeQuery,
    isInappropriate,
    detectInsightIntent,
    buildContext,
    saveQueryWithEmbedding,
} = require("../utils/aiUtils");
const technicalFaqs = require("../utils/faqs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHAT_MODEL = process.env.MODEL || "gemini-1.5-flash";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const chatModel = genAI ? genAI.getGenerativeModel({ model: CHAT_MODEL }) : null;

const DEFAULT_TOP_K = Number(process.env.TOP_K || 6);
const MIN_EXACT_SCORE = Number(process.env.MIN_EXACT_SCORE || 0.92); // cosine for exact-ish FAQ
const MIN_SIMILAR_SCORE = Number(process.env.MIN_SIMILAR_SCORE || 0.55); // partial matches
const MAX_CONTEXT_CHARS = Number(process.env.MAX_CONTEXT_CHARS || 6000);

// --- Guardrail system prompt (kept local to handler) ---
function guardrailSystemPrompt() {
    return `
    You are a helpful support assistant for an edtech platform.

    Rules:
    - Always prioritize direct FAQ answers (if available).
    - Prefer factual, actionable details from metadata (courseName, price, rating).
    - Answer ONLY from the provided context or summarized chat history.
    - If the query is inappropriate or unsafe, politely refuse.
    - If context is insufficient, suggest creating a support ticket.
    - Be concise, clear, and friendly.`;
}

// -------------------- TIER 1: Exact matches --------------------
async function tier1ExactMatch(userText) {
    // 1) Exact FAQ (question text equals query)
    const faq = await Query.findOne({
        "metadata.sourceType": "faq",
        text: { $regex: `^${escapeRegex(userText)}$`, $options: "i" },
    }).lean();

    if (faq?.answer) {
        return { tier: 1, answer: faq.answer, contextUsed: [faq] };
    }

    // 2) Course direct hit by title heuristic
    const candidate = await extractPossibleCourseQuery(userText);
    if (candidate) {
        const course = await Query.findOne({
            "metadata.sourceType": "course",
            "metadata.courseName": { $regex: escapeRegex(candidate), $options: "i" },
        }).lean();

        if (course) {
            const title = inferCourseTitle(course);
            const price =
                typeof course?.metadata?.price === "number"
                    ? ` It costs ₹${course.metadata.price}.`
                    : "";
            return {
                tier: 1,
                answer: `The course **${title}** is available.${price}`,
                contextUsed: [course],
            };
        }
    }

    return null;
}

// -------------------- TIER 2: Partial/similar matches --------------------
async function embedAndSearch(userText, topK = DEFAULT_TOP_K) {
    const qvec = await generateEmbedding(userText);
    const docs = await Query.find(
        {},
        { text: 1, answer: 1, embedding: 1, metadata: 1 }
    ).lean();

    const scored = [];
    for (const d of docs) {
        const sim = safeCosineSimilarity(qvec, d.embedding || []);
        if (sim >= 0.30) {
            scored.push({ ...d, similarity: sim });
        }
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
}

async function tier2Similar(userText, topK) {
    const scored = await embedAndSearch(userText, topK);
    if (!scored.length) return null;

    const top = scored[0];

    // If we have a canonical FAQ answer and it's a near-exact semantic hit, return it.
    if (top.answer && top.similarity >= MIN_EXACT_SCORE) {
        return { tier: 2, answer: top.answer, contextUsed: [top] };
    }

    // If the best hit is a course, answer directly with metadata
    if (top?.metadata?.sourceType === "course") {
        const title = inferCourseTitle(top);
        const price =
            typeof top?.metadata?.price === "number"
                ? ` at ₹${top.metadata.price}`
                : "";
        return {
            tier: 2,
            answer: `The course **${title}** is available${price}.`,
            contextUsed: [top],
        };
    }

    // Otherwise synthesize: use the top-K as context
    const contextText = buildContext(scored, MAX_CONTEXT_CHARS);

    // If no LLM available, degrade to a helpful template with suggestions
    if (!chatModel) {
        const shortList = scored
            .filter((d) => d?.metadata?.courseName || d?.metadata?.sectionName || d?.metadata?.subSectionTitle)
            .slice(0, 3)
            .map((d) => {
                const title =
                    d?.metadata?.courseName ||
                    d?.metadata?.sectionName ||
                    d?.metadata?.subSectionTitle ||
                    "Related item";
                const price =
                    typeof d?.metadata?.price === "number"
                        ? ` (₹${d.metadata.price})`
                        : "";
                return `• ${title}${price}`;
            })
            .join("\n");

        return {
            tier: 2,
            answer:
                shortList
                    ? `I found related content that might help:\n${shortList}\n\nTell me which one you want to explore.`
                    : "I found related information in our knowledge base. Could you be more specific?",
            contextUsed: scored,
        };
    }

    const prompt = `${guardrailSystemPrompt()}

    Context:
    ${contextText}

    User question: ${userText}

    Instructions:
    - If multiple relevant items exist, list up to 3 with short bullets (title + price if available).
    - Do not invent data; only use the context above.
    - End with a brief next step suggestion.`;

    const gen = await chatModel.generateContent(prompt);
    const text = (gen?.response?.text() || "").trim();

    return {
        tier: 2,
        answer: text || "I found similar content that might help. Which topic do you want?",
        contextUsed: scored,
    };
}

// Robust insightHighestRatedCourse — handles ObjectId/string mismatches when joining reviews -> course
async function insightHighestRatedCourse({ filter = {} } = {}) {
    // Build match for reviews
    const match = { "metadata.sourceType": "review" };
    if (filter.courseId) match["metadata.courseId"] = filter.courseId;
    if (filter.tag) match["metadata.tags"] = filter.tag;

    // Aggregate average rating by courseId
    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: "$metadata.courseId",
                avgRating: { $avg: "$metadata.rating" },
                count: { $sum: 1 },
            },
        },
        { $sort: { avgRating: -1, count: -1 } },
        { $limit: 1 },
    ];

    const agg = await Query.aggregate(pipeline);
    if (!agg || !agg.length) return null;

    const topAgg = agg[0];
    const topCourseId = topAgg._id;
    const topCourseIdStr = String(topCourseId);

    // Try a few ways to find the course doc in Query (sourceType: 'course')
    let courseDoc = null;

    // 1) Direct match (works if types align)
    courseDoc = await Query.findOne({
        "metadata.sourceType": "course",
        "metadata.courseId": topCourseId,
    }).lean();

    // 2) Match by string (covers case where stored as string)
    if (!courseDoc) {
        courseDoc = await Query.findOne({
            "metadata.sourceType": "course",
            "metadata.courseId": topCourseIdStr,
        }).lean();
    }

    // 3) Aggregation fallback: convert stored metadata.courseId to string and compare
    if (!courseDoc) {
        try {
            const courseAgg = await Query.aggregate([
                { $match: { "metadata.sourceType": "course" } },
                // Add a stringified version of metadata.courseId and compare
                { $addFields: { _courseIdStr: { $toString: "$metadata.courseId" } } },
                { $match: { _courseIdStr: topCourseIdStr } },
                { $limit: 1 },
            ]);
            if (courseAgg && courseAgg.length) {
                // courseAgg[0] is an aggregation doc — use it as the course doc
                courseDoc = courseAgg[0];
            }
        } catch (e) {
            // If $toString or aggregation not supported, ignore and continue
            console.warn("insightHighestRatedCourse: aggregation fallback failed:", e?.message || e);
        }
    }

    // If still not found, return graceful message including rating
    if (!courseDoc) {
        return {
            answer: `Highest average rating: ${topAgg.avgRating.toFixed(
                2
            )} (course metadata not found).`,
            contextUsed: agg,
        };
    }

    // Compose final answer using courseDoc metadata
    const title = courseDoc?.metadata?.courseName || "this course";
    const price =
        typeof courseDoc?.metadata?.price === "number"
            ? ` at ₹${courseDoc.metadata.price}`
            : "";

    return {
        answer: `The highest-rated course is **${title}** with an average rating of **${topAgg.avgRating.toFixed(
            2
        )}** based on ${topAgg.count} review(s)${price}.`,
        contextUsed: [{ ...courseDoc, avgRating: topAgg.avgRating, reviewCount: topAgg.count }],
    };
}


// -------------------- Public Handler --------------------
exports.chatWithBot = async (req, res) => {
    try {
        let { text, topK = DEFAULT_TOP_K, email } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Query text is required" });
        }

        const sid = email || req.ip; // session id key
        let cleanText = text.trim();

        // Safety / inappropriate queries
        if (isUnsafeQuery(cleanText) || isInappropriate(cleanText)) {
            return res.json({
                answer:
                    "⚠️ I can’t help with that request. Please keep queries professional and related to learning.",
            });
        }

        // Insight intents (run early)
        const insight = detectInsightIntent(cleanText);
        if (insight === "highestRatedCourse") {
            const best = await insightHighestRatedCourse();
            if (best) {
                // save context with the courseName if available
                const name = best?.contextUsed?.[0]?.metadata?.courseName;
                if (name) await redisClient.set(`currentContext:${sid}`, name, "EX", 1800);
                // Summarize history (short)
                if (email) {
                    const key = `chatSummary:${sid}`;
                    const prev = (await redisClient.get(key)) || "";
                    const summary = (prev + ` User: ${cleanText}. Bot: ${best.answer}.`).slice(-500);
                    await redisClient.set(key, summary, "EX", 3600);
                }
                return res.json({ tier: "insight", ...best });
            }
        }

        // Affirmations like "yes / tell me more / price" use last known context
        if (isAffirmingThat(cleanText)) {
            const ctx = await redisClient.get(`currentContext:${sid}`);
            if (ctx) {
                cleanText = `tell me about ${ctx}`;
            }
        }

        // TIER 1: exact match (FAQ or direct course by name)
        const exact = await tier1ExactMatch(cleanText);
        if (exact) {
            const ctxName = inferCourseTitle(exact.contextUsed?.[0]);
            if (ctxName) await redisClient.set(`currentContext:${sid}`, ctxName, "EX", 1800);

            if (email) {
                const key = `chatSummary:${sid}`;
                const prev = (await redisClient.get(key)) || "";
                const summary = (prev + ` User: ${cleanText}. Bot: ${exact.answer}.`).slice(-500);
                await redisClient.set(key, summary, "EX", 3600);
            }
            return res.json({
                ...exact,
                success: true,
                showTicketOption: false,
            });
        }

        // TIER 2: similar/partial semantic search
        const scored = await embedAndSearch(cleanText, topK);

        // TIER 3: nothing relevant
        if (!scored.length || (scored[0]?.similarity || 0) < MIN_SIMILAR_SCORE) {
            return res.json({
                tier: 3,
                answer:
                    "I couldn’t find relevant information. Would you like me to create a support ticket for this?",
                contextUsed: [],
                showTicketOption: true,
            });
        }

        // If top is FAQ with strong similarity → answer directly
        const top = scored[0];
        if (top?.answer && top.similarity >= MIN_EXACT_SCORE) {
            const ctxName = inferCourseTitle(top);
            if (ctxName) await redisClient.set(`currentContext:${sid}`, ctxName, "EX", 1800);

            if (email) {
                const key = `chatSummary:${sid}`;
                const prev = (await redisClient.get(key)) || "";
                const summary = (prev + ` User: ${cleanText}. Bot: ${top.answer}.`).slice(-500);
                await redisClient.set(key, summary, "EX", 3600);
            }

            return res.json({ tier: 2, answer: top.answer, contextUsed: [top] });
        }

        // If top is a course → reply with explicit course info
        if (top?.metadata?.sourceType === "course") {
            const title = inferCourseTitle(top);
            const price =
                typeof top?.metadata?.price === "number" ? ` at ₹${top.metadata.price}` : "";
            await redisClient.set(`currentContext:${sid}`, title, "EX", 1800);

            if (email) {
                const key = `chatSummary:${sid}`;
                const prev = (await redisClient.get(key)) || "";
                const msg = `The course **${title}** is available${price}.`;
                const summary = (prev + ` User: ${cleanText}. Bot: ${msg}.`).slice(-500);
                await redisClient.set(key, summary, "EX", 3600);
            }

            return res.json({
                tier: 2,
                answer: `The course **${title}** is available${price}.`,
                contextUsed: [top],
            });
        }

        // Otherwise: synthesize with LLM or degrade gracefully
        const ctxText = buildContext(scored, MAX_CONTEXT_CHARS);

        if (!chatModel) {
            const bullets = scored
                .filter((d) => d?.metadata?.courseName || d?.metadata?.sectionName || d?.metadata?.subSectionTitle)
                .slice(0, 3)
                .map((d) => {
                    const title =
                        d?.metadata?.courseName ||
                        d?.metadata?.sectionName ||
                        d?.metadata?.subSectionTitle ||
                        "Related item";
                    const price =
                        typeof d?.metadata?.price === "number" ? ` (₹${d.metadata.price})` : "";
                    return `• ${title}${price}`;
                })
                .join("\n");

            const text =
                bullets
                    ? `I found related content that might help:\n${bullets}\n\nTell me which one you want to explore.`
                    : "I found related information in our knowledge base. Could you be more specific?";

            // store context/summary
            if (top?.metadata?.courseName) {
                await redisClient.set(`currentContext:${sid}`, top.metadata.courseName, "EX", 1800);
            }
            if (email) {
                const key = `chatSummary:${sid}`;
                const prev = (await redisClient.get(key)) || "";
                const summary = (prev + ` User: ${cleanText}. Bot: ${text}.`).slice(-500);
                await redisClient.set(key, summary, "EX", 3600);
            }

            return res.json({ tier: 2, answer: text, contextUsed: scored, showTicketOption: !bullets, });
        }

        const prompt = `${guardrailSystemPrompt()}

        Conversation summary: ${(await redisClient.get(`chatSummary:${sid}`)) || ""}

        Context:
        ${ctxText}

        User question: ${cleanText}

        Instructions:
        - If multiple relevant items exist, list up to 3 (title + price when available).
        - Use ONLY the context above; don't invent data.
        - End with a brief next step suggestion.`;

        const result = await chatModel.generateContent(prompt);
        const responseText = (result?.response?.text() || "").trim();

        if (top?.metadata?.courseName) {
            await redisClient.set(`currentContext:${sid}`, top.metadata.courseName, "EX", 1800);
        }
        if (email) {
            const key = `chatSummary:${sid}`;
            const prev = (await redisClient.get(key)) || "";
            const summary = (prev + ` User: ${cleanText}. Bot: ${responseText}.`).slice(-500);
            await redisClient.set(key, summary, "EX", 3600);
        }

        return res.json({ tier: 2, answer: responseText, contextUsed: scored, showTicketOption: /I couldn’t find|not sure/i.test(responseText), });
    } catch (err) {
        console.error("Chatbot error:", err);
        return res.status(500).json({ error: "Error in chatbot" });
    }
};

exports.addQuery = async (req, res) => {
    try {
        const { text, metadata } = req.body || {};
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text is required" });
        }
        const query = await saveQueryWithEmbedding(text.trim(), metadata || {});
        res.status(201).json(query);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to store embedding" });
    }
}

exports.generateTicket = async (req, res) => {
    try {
        const { query } = req.body;
        const user = req.user;
        if (!query || !user.email) {
            return res.status(400).json({ error: "Query and email are required" });
        }

        const ticket = new Ticket({ userId: user?._id, query, email: user?.email });
        await ticket.save();

        try {
            await mailSender(
                process.env.SUPPORT_EMAIL,
                `New Support Ticket #${ticket._id}`,
                sendTicketNotification(ticket)
            )
            await mailSender(
                ticket.email,
                `Your support request has been received (#${ticket._id})`,
                sendTicketAcknowledgement(ticket)
            )
        } catch (error) {
            // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
            console.error("Error occurred while sending email:", error)
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            })
        }

        res.json({
            success:true,
            message: "✅ Your support request has been logged. We’ve sent you a confirmation email.",
            ticketId: ticket._id,
        });
    } catch (err) {
        console.error("❌ Ticket creation failed:", err);
        res.status(500).json({ error: "Failed to create ticket" });
    }
}

exports.resolveTicket = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        res.json(ticket);
    } catch (err) {
        console.error("❌ Ticket update failed:", err);
        res.status(500).json({ error: "Failed to update ticket" });
    }
}

exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        console.error("❌ Failed to fetch tickets:", err);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
}

exports.getFaqs = async (req, res) => {
    return res.status(200).json({
        success: true,
        faqs: technicalFaqs
    });
}