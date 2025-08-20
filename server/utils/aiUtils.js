const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");
const Query = require("../models/Query");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "embedding-001";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// -------------------------
// Vector / Embedding Utils
// -------------------------
function normalizeVec(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function safeCosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function generateEmbedding(rawText) {
  const text = (rawText || "").toString().trim();
  if (!text) throw new Error("Empty text passed to generateEmbedding");
  if (!genAI) throw new Error("GEMINI_API_KEY not configured for embeddings");

  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const vec = result?.embedding?.values;
  if (!Array.isArray(vec) || vec.length === 0) throw new Error("Empty embedding returned");
  return normalizeVec(vec);
}

function hashSource(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

// -------------------------
// Text / Parsing Helpers
// -------------------------
function escapeRegex(str = "") {
  if (typeof str !== "string") {
    str = String(str || "");
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCourseNameFromText(text = "") {
  const m = /Course:\s*([^\.]+?)(?:\.|$)/i.exec(text);
  return m ? m[1].trim() : undefined;
}

function compactJoin(parts) {
  return parts.filter(Boolean).join(". ");
}

function inferCourseTitle(doc) {
  return (
    doc?.metadata?.courseName ||
    parseCourseNameFromText(doc?.text) ||
    "this course"
  );
}

// Async semantic query normalization
async function normalizeQueryText(rawText) {
  if (!rawText) return "";
  let original = rawText.trim();

  const prompt = `
  Correct the following query for spelling/grammar ONLY if you're highly confident.
  Do NOT change brand names, proper nouns, or course titles.
  Return only the corrected text.

  Query: "${original}"
  `;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const corrected = (result?.response?.text() || "").trim();
    return corrected || original;
  } catch (err) {
    console.error("❌ Error normalizing query:", err);
    return original;
  }
}

// Extract course-related query phrase
async function extractPossibleCourseQuery(q = "") {
  const text = await normalizeQueryText(q);
  if (!text) return "";

  const m = text.match(
    /(?:tell me about|price(?:\s*for)?|cost(?:\s*of)?|details (?:on|for)|info on|do you have)\s+(.+)/i
  );
  if (m && m[1]) return m[1].trim();

  const words = text.split(/\s+/);
  if (words.length >= 2) return words.slice(-3).join(" ");

  return text;
}

// -------------------------
// Intent / Safety
// -------------------------
function isSupportIntent(q = "") {
  return /(login|signup|payment|error|issue|bug|support|help|reset|refund|invoice|ticket)/i.test(q);
}

function isAffirmingThat(q = "") {
  return /^(yes|yep|yeah|that one|this one|tell me more|details|reviews?|price)$/i.test(q.trim());
}

function isUnsafeQuery(q = "") {
  return /(bypass|disable auth|admin password|drop table|sql|hack|injection)/i.test(q);
}

function isInappropriate(q = "") {
  if (isUnsafeQuery(q)) return true;
  return /\b(nsfw|nude|explicit|hate|abuse)\b/i.test(q);
}

function detectInsightIntent(q = "") {
  const s = (q || "").toLowerCase();
  if (/\b(highest|top)\s*rated\b/.test(s) || /\bbest\b.*\b(course|class)/.test(s)) {
    return "highestRatedCourse";
  }
  return null;
}

// -------------------------
// Context Builder
// -------------------------
function buildContext(scoredDocs = [], maxChars = 6000) {
  let context = "";
  const seen = new Set();
  for (const d of scoredDocs) {
    const t = (d?.text || "").trim();
    if (!t || seen.has(t)) continue;
    if ((context + "\n" + t).length > maxChars) break;
    context += (context ? "\n" : "") + t;
    seen.add(t);
  }
  return context;
}

// -------------------------
// Persistence
// -------------------------
async function saveQueryWithEmbedding(text, metadata = {}) {
  const embedding = await generateEmbedding(text);
  const query = new Query({ text, embedding, metadata });
  await query.save();
  return query;
}

module.exports = {
  // vectors
  generateEmbedding,
  safeCosineSimilarity,
  hashSource,

  // parsing
  escapeRegex,
  parseCourseNameFromText,
  inferCourseTitle,
  extractPossibleCourseQuery,
  normalizeQueryText,

  // intent / safety
  isSupportIntent,
  isAffirmingThat,
  isUnsafeQuery,
  isInappropriate,
  detectInsightIntent,

  // context
  buildContext,

  // persistence
  saveQueryWithEmbedding,
  compactJoin
};