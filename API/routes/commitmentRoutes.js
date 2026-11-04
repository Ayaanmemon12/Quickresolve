
const express = require("express");

const {
    getCommitments,
    reviewCommitment,
    completeCommitment
} = require("../controllers/commitmentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All commitment management routes require owner authentication.
router.use(protect);

router.get("/", getCommitments);

router.patch("/:commitmentId/review", reviewCommitment);

router.patch("/:commitmentId/complete", completeCommitment);

module.exports = router;
