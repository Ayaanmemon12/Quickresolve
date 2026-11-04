
const Business = require("../models/Business");
const Commitment = require("../models/Commitment");

const getOwnerBusiness = async (userId) => {
    return Business.findOne({ user: userId }).select("_id");
};

// Owner views their commitments.
const getCommitments = async (req, res) => {
    try {
        const business = await getOwnerBusiness(req.user._id);

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const commitments = await Commitment.find({
            business: business._id
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            total: commitments.length,
            commitments
        });
    } catch (error) {
        console.error("Get commitments error:", error.message);

        return res.status(500).json({
            message: "Unable to load commitments."
        });
    }
};

// Owner approves or ignores a detected commitment.
const reviewCommitment = async (req, res) => {
    try {
        const { reviewStatus, dueAt, description } = req.body || {};

        if (!["approved", "ignored"].includes(reviewStatus)) {
            return res.status(400).json({
                message: "Review status must be approved or ignored."
            });
        }

        const update = { reviewStatus };

        if (reviewStatus === "approved") {
            if (dueAt !== undefined) {
                const parsedDate = new Date(dueAt);

                if (Number.isNaN(parsedDate.getTime())) {
                    return res.status(400).json({
                        message: "Please provide a valid deadline."
                    });
                }

                if (parsedDate <= new Date()) {
                    return res.status(400).json({
                        message: "The deadline must be in the future."
                    });
                }

                update.dueAt = parsedDate;
            }

            if (description !== undefined) {
                if (
                    typeof description !== "string" ||
                    !description.trim() ||
                    description.trim().length > 500
                ) {
                    return res.status(400).json({
                        message: "Description must contain 1–500 characters."
                    });
                }

                update.description = description.trim();
            }
        }

        const business = await getOwnerBusiness(req.user._id);

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const commitment = await Commitment.findOneAndUpdate(
            {
                _id: req.params.commitmentId,
                business: business._id,
                reviewStatus: "pending_review"
            },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!commitment) {
            return res.status(404).json({
                message: "Pending commitment not found."
            });
        }

        return res.status(200).json({
            message: "Commitment review updated.",
            commitment
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid commitment ID."
            });
        }

        console.error("Review commitment error:", error.message);

        return res.status(500).json({
            message: "Unable to review commitment."
        });
    }
};

// Owner marks an approved commitment as completed.
const completeCommitment = async (req, res) => {
    try {
        const business = await getOwnerBusiness(req.user._id);

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const commitment = await Commitment.findOneAndUpdate(
            {
                _id: req.params.commitmentId,
                business: business._id,
                reviewStatus: "approved",
                taskStatus: "pending"
            },
            {
                $set: {
                    taskStatus: "completed",
                    completedAt: new Date(),
                    resolutionStatus: "awaiting_confirmation"
                }
            },
            { new: true, runValidators: true }
        );

        if (!commitment) {
            return res.status(404).json({
                message: "Pending approved commitment not found."
            });
        }

        return res.status(200).json({
            message: "Business action marked as completed.",
            commitment
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid commitment ID."
            });
        }

        console.error("Complete commitment error:", error.message);

        return res.status(500).json({
            message: "Unable to complete commitment."
        });
    }
};

module.exports = {
    getCommitments,
    reviewCommitment,
    completeCommitment
};
