
const mongoose = require("mongoose");
const crypto = require("crypto");

const businessSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        publicId: {
            type: String,
            unique: true,
            default: () => crypto.randomUUID()
        },

        name: {
            type: String,
            required: [true, "Business name is required"],
            trim: true,
            maxlength: [100, "Business name cannot exceed 100 characters"]
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Business", businessSchema);
