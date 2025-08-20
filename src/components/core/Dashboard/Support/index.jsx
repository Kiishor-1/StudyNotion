import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { apiConnector } from "../../../../services/apiConnector"
import SupportFaqs from "../../FAQs/SupportFaqs"
import { botEndpoints } from "../../../../services/apis"
import toast from "react-hot-toast"

export default function Support() {
    const { user } = useSelector((state) => state.profile)
    const { token } = useSelector((state) => state.auth)
    const [faqs, setFaqs] = useState([])
    const [query, setQuery] = useState("")
    const [submitState, setSubmitState] = useState({ loading: false, message: "", error: "" })
    const navigate = useNavigate();

    const fetchFaqs = async () => {
        try {
            const res = await apiConnector(
                "GET",
                botEndpoints.FETCH_FAQs,
                null,
                {
                    Authorization: `Bearer ${token}`,
                }
            )
            const data = res.data.faqs
            setFaqs(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to fetch FAQs:", error)
            setFaqs([])
        }
    }

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return;
        }
        fetchFaqs()
    }, [])


    const createTicket = async () => {
        if (!query.trim()) {
            setSubmitState({ loading: false, message: "", error: "Please describe your issue." })
            return
        }
        if (!user) {
            setSubmitState({ loading: false, message: "", error: "Please login to continue" })
            return
        }
        setSubmitState({ loading: true, message: "", error: "" })
        try {
            const res = await apiConnector(
                "POST",
                botEndpoints.CREATE_SUPPORT_TICKET,
                { query },
                {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            )
            const data = res.data;
            if (!data?.success) throw new Error(data?.error || "Failed to create ticket")
            setSubmitState({ loading: false, message: "", error: "" })
            toast.success('Support Ticket Created')
            setQuery("")
        } catch (err) {
            console.log("Error: ",err)
            setSubmitState({ loading: false, message: "", error: err.message || "Failed to create ticket" })
        }
    }

    return (
        <main className="flex-1 flex md:flex-row flex-col-reverse gap-6 bg-richblack-900 text-richblack-25 overflow-auto">
            <section id="faqs" className="mx-auto flex-1">
                <h3 className="text-2xl font-semibold text-richblack-5 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-3">
                    {faqs.length === 0 ? (
                        <div className="text-sm text-richblack-200">No FAQs available yet.</div>
                    ) : (
                        <SupportFaqs faqs={faqs} />
                    )}
                </div>
            </section>

            <section id="ticket" className="w-full mx-auto flex-1">
                <h3 className="text-2xl font-semibold text-richblack-5 mb-4">Create Support Ticket</h3>
                <div className="bg-richblack-800 p-5 rounded-xl">
                    <div className="grid gap-4">
                        <div className="text-sm">
                            <label className="block text-richblack-200 mb-1">Email</label>
                            <input
                                disabled
                                value={user?.email || ""}
                                className="w-full rounded-lg border border-richblack-600 bg-richblack-700 px-3 py-2 text-richblack-5"
                            />
                        </div>
                        <div className="text-sm">
                            <label className="block text-richblack-200 mb-1">
                                Describe your issue
                            </label>
                            <textarea
                                rows={4}
                                className="w-full rounded-lg border border-richblack-600 bg-richblack-700 px-3 py-2 text-richblack-5"
                                placeholder="I am unable to access the CSS course after purchase…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={createTicket}
                                disabled={submitState.loading}
                                className="bg-yellow-50 text-black font-semibold px-4 py-2 rounded-lg hover:brightness-95 disabled:opacity-60"
                            >
                                {submitState.loading ? "Submitting…" : "Submit Ticket"}
                            </button>
                            {submitState.message && (
                                <span className="text-green-400 text-sm">{submitState.message}</span>
                            )}
                            {submitState.error && (
                                <span className="text-pink-400 text-sm">{submitState.error}</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}