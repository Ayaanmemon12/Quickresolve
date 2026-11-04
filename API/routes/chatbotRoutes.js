
const express = require("express");

const {
    getPublicChatbot,
    sendChatbotMessage,
    saveFAQConversation
} = require("../controllers/chatbotController");

const router = express.Router();

router.get("/:publicId", getPublicChatbot);

router.post("/:publicId/message", sendChatbotMessage);

router.post("/:publicId/faq-message", saveFAQConversation);

module.exports = router;
