const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema(
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

        customerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        customerContact: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        issue: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        summary: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: ["pending", "responded", "closed"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("SupportRequest", supportRequestSchema);