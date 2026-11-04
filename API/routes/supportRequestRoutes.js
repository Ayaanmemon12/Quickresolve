const express = require("express");

const {
    createSupportRequest,
    getSupportRequests,
    updateSupportRequestStatus
} = require("../controllers/supportRequestController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route: customer submits a support request.
router.post("/public/:publicId", createSupportRequest);

// Protected routes: business owner manages requests.
router.get("/", protect, getSupportRequests);
router.patch("/:requestId/status", protect, updateSupportRequestStatus);

module.exports = router;