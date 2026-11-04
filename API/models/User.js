const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false
        },

        // Subscription plan
        subscriptionPlan: {
            type: String,
            enum: ["free", "basic", "pro"],
            default: "free"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);