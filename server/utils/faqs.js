const technicalFaqs = [
    {
        question: "How do I reset my password?",
        answer:
            "You can reset your password from the login page by clicking 'Forgot Password', or directly from your profile settings.",
        metadata: { sourceType: "faq", tags: ["account", "password"] },
    },
    {
        question: "I forgot my email or username, what can I do?",
        answer:
            "Please login to your account then access dashboard and find settings option and follow instructions from there.",
        metadata: { sourceType: "faq", tags: ["account", "login"] },
    },
    {
        question: "I’m not receiving the verification email.",
        answer:
            "Check your spam folder, and make sure your email is correct in profile settings. If the issue continues, raise a ticket.",
        metadata: { sourceType: "faq", tags: ["account", "verification"] },
    },
    {
        question: "My payment failed, what should I do?",
        answer:
            "If a payment fails, try again with a valid method. If still failing, contact support with your transaction ID.",
        metadata: { sourceType: "faq", tags: ["payment", "billing"] },
    },
    {
        question: "Can I get a refund for a course?",
        answer:
            "Refunds are available within 7 days of purchase if less than 20% of the course is completed.",
        metadata: { sourceType: "faq", tags: ["payment", "refund"] },
    },
    {
        question: "How do I enroll in a course?",
        answer:
            "Browse the course catalog, click 'Enroll', and complete payment if required.",
        metadata: { sourceType: "faq", tags: ["courses", "enrollment"] },
    },
    {
        question: "How can I contact support?",
        answer:
            "You can raise a support ticket from /dashboard/tickets or visit the Help Center.",
        metadata: { sourceType: "faq", tags: ["support", "help"] },
    },
];

module.exports = technicalFaqs;