const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
    userId: { type: String },
    query: { type: String, required: true },
    email: { type: String, required: true },
    status: {
        type: String,
        enum: ["open", "in_progress", "resolved"],
        default: "open"
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ticket", TicketSchema);
