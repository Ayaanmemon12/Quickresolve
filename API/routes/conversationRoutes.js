
const express = require("express");

const {
    getBusinessConversations,
    getSupportGaps
} = require("../controllers/conversationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getBusinessConversations);

router.get("/support-gaps", protect, getSupportGaps);

module.exports = router;
