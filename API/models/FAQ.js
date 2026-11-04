
const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        question: {
            type: String,
            required: [true, "Question is required"],
            trim: true,
            maxlength: [300, "Question cannot exceed 300 characters"]
        },

        answer: {
            type: String,
            required: [true, "Answer is required"],
            trim: true,
            maxlength: [2000, "Answer cannot exceed 2000 characters"]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("FAQ", faqSchema);
