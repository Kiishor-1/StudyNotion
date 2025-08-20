import { useEffect, useMemo, useRef, useState } from "react"
import { FiMessageCircle, FiX, FiArrowUp } from "react-icons/fi"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { botEndpoints } from "../../services/apis"
import { apiConnector } from "../../services/apiConnector"

function formatBotText(text) {
    if (!text) return ""

    let html = text
        // bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // bullets (markdown-style "* item")
        .replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>")
        // newlines
        .replace(/\n/g, "<br/>")

    // wrap orphan <li> into <ul>
    if (html.includes("<li>")) {
        html = `<ul class="list-disc list-inside ">${html}</ul>`
    }

    return html
}

export default function Chatbot() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState([
        { sender: "bot", text: "Hi! Ask me about courses, pricing, or anything on StudyNotion." },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const scrollRef = useRef(null)
    const navigate = useNavigate()
    const { user } = useSelector((state) => state.profile)

    const showSupportCTA = useMemo(() => {
        const last = messages[messages.length - 1]
        if (!last) return false
        const t = (last.text || "").toLowerCase()
        return (
            t.includes("out of context") ||
            t.includes("couldn’t find") ||
            t.includes("could not find") ||
            t.includes("no exact course") ||
            t.includes("still need help") ||
            (last?.sender === "bot" && last?.showTicketOption) ||
            t.includes("support ticket")
        )
    }, [messages])


    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, loading])

    const sendMessage = async () => {
        const text = input.trim()
        if (!text) return
        setError("")

        if (!user || !user.email) {
            const userMsg = { sender: "user", text }
            setMessages((prev) => [
                ...prev,
                userMsg,
                { sender: "bot", text: "⚠️ Please login to chat with us." }
            ])
            setInput("")
            return
        }

        const userMsg = { sender: "user", text }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const response = await apiConnector("POST", botEndpoints.CHAT_WITH_BOT, {
                text,
                email: user?.email,
            })
            const data = response.data;
            let answer = data?.answer || "Hmm… I couldn’t understand that."
            if (Array.isArray(data?.suggestions) && data.suggestions.length) {
                answer += `\n\nTry: ${data.suggestions.map((s) => `“${s}”`).join(", ")}`
            }

            setMessages((prev) => [
                ...prev,
                {
                    sender: "bot",
                    text: answer,
                    showTicketOption: data?.showTicketOption || false,  // 👈 store flag here
                },
            ])
        } catch (err) {
            console.log("Error during chatting with bot: ",err)
            setMessages((prev) => [...prev, { sender: "bot", text: "⚠️ Error reaching server." }])
            setError("Network error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 bg-yellow-400 text-black p-4 rounded-full shadow-xl z-[9999] hover:brightness-95 transition"
                aria-label="Open chat"
            >
                <FiMessageCircle className="w-6 h-6" />
            </button>

            {/* Popup modal */}
            {open && (
                <div className="fixed bottom-20 sm:right-5 right-2 sm:w-[380px] w-[95%] max-h-[70vh] h-full bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col border">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-2xl">
                        <div className="font-semibold text-gray-900">Chat with us</div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded hover:bg-gray-200"
                            aria-label="Close chat"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-wrap leading-relaxed text-sm ${m.sender === "user" ? "bg-yellow-100" : "bg-gray-100"
                                        }`}
                                    // render formatted HTML only for bot
                                    dangerouslySetInnerHTML={
                                        m.sender === "bot" ? { __html: formatBotText(m.text) } : undefined
                                    }
                                >
                                    {m.sender === "user" ? m.text : null}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                                Thinking…
                            </div>
                        )}
                    </div>

                    {/* Support CTA */}
                    {showSupportCTA && (
                        <div className="px-3 pb-2">
                            <button
                                onClick={() => {
                                    setOpen(false)
                                    navigate("/dashboard/tickets")
                                }}
                                className="w-full text-center bg-black text-white rounded-lg py-2 text-sm hover:opacity-90 transition"
                            >
                                Create Support Ticket
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t p-2 flex gap-2">
                        <input
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-0"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Type your message…"
                            aria-label="Chat message"
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-yellow-400 text-black px-3 py-2 rounded-lg font-semibold hover:brightness-95 transition"
                            disabled={loading}
                        >
                            {loading ? (
                                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                            ) : (
                                <FiArrowUp className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}