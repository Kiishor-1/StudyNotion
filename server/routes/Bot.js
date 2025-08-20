const express = require("express");
const { chatWithBot, addQuery, generateTicket, getAllTickets, resolveTicket, getFaqs } = require("../controllers/Bot");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

router.route('/add-query').post(auth, isAdmin, addQuery);
router.route('/chat').post(chatWithBot);
router.route("/tickets")
    .get(auth, getAllTickets)
    .post(auth, generateTicket);
router.route('/tickets/:id').put(auth, isAdmin, resolveTicket);
router.route('/faqs').get(auth, getFaqs);

module.exports = router;