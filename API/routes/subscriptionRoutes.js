
const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
    updateSubscription,
    getSubscription
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/", protect, getSubscription);
router.put("/", protect, updateSubscription);

module.exports = router;
