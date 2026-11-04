
const mongoose = require("mongoose");

const commitmentSchema = new mongoose.Schema(
    {
        business: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true
        },

        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true
        },

        sessionId: {
            type: String,
            required: true,
            maxlength: 128
        },

        // Original chatbot message containing the promise.
        sourceMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        sourceMessage: {
            type: String,
            required: true,
            maxlength: 2000
        },

        // Short description of the detected commitment.
        description: {
            type: String,
            required: true,
            maxlength: 500
        },

        // Owner must review before this becomes an active task.
        reviewStatus: {
            type: String,
            enum: ["pending_review", "approved", "ignored"],
            default: "pending_review"
        },

        // Owner can set or edit the deadline.
        dueAt: {
            type: Date,
            default: null
        },

        taskStatus: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending"
        },

        completedAt: {
            type: Date,
            default: null
        },

        // Business completion and customer resolution are separate.
        resolutionStatus: {
            type: String,
            enum: [
                "not_requested",
                "awaiting_confirmation",
                "resolved",
                "not_resolved"
            ],
            default: "not_requested"
        }
    },
    { timestamps: true }
);

// Prevent duplicate detection of the same conversation message.
commitmentSchema.index(
    {
        business: 1,
        conversation: 1,
        sourceMessageId: 1
    },
    { unique: true }
);

module.exports = mongoose.model("Commitment", commitmentSchema);
