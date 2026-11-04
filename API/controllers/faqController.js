
const mongoose = require("mongoose");
const FAQ = require("../models/FAQ");

const {
    checkFaqLimit
} = require("../services/subscriptionLimitService");

const createFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;

        if (
            typeof question !== "string" ||
            typeof answer !== "string" ||
            !question.trim() ||
            !answer.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Question and answer are required"
            });
        }

        const usage = await checkFaqLimit(req.user._id);

        if (!usage.allowed) {
            return res.status(403).json({
                success: false,
                code: "FAQ_LIMIT_REACHED",
                message: `Your ${usage.plan.toUpperCase()} plan allows ${usage.limit} FAQs. You are currently using ${usage.used}. Upgrade your plan to create more FAQs.`,
                usage: {
                    used: usage.used,
                    limit: usage.limit,
                    plan: usage.plan
                }
            });
        }

        const faq = await FAQ.create({
            user: req.user._id,
            question: question.trim(),
            answer: answer.trim()
        });

        return res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            faq
        });
    } catch (error) {
        console.error("Create FAQ error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create FAQ"
        });
    }
};

const getFAQs = async (req, res) => {
    try {
        const faqs = await FAQ.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: faqs.length,
            faqs
        });
    } catch (error) {
        console.error("Get FAQs error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs"
        });
    }
};

const updateFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID"
            });
        }

        if (
            typeof question !== "string" ||
            typeof answer !== "string" ||
            !question.trim() ||
            !answer.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Question and answer are required"
            });
        }

        const faq = await FAQ.findOneAndUpdate(
            {
                _id: id,
                user: req.user._id
            },
            {
                question: question.trim(),
                answer: answer.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            faq
        });
    } catch (error) {
        console.error("Update FAQ error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update FAQ"
        });
    }
};

const deleteFAQ = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID"
            });
        }

        const faq = await FAQ.findOneAndDelete({
            _id: id,
            user: req.user._id
        });

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully"
        });
    } catch (error) {
        console.error("Delete FAQ error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to delete FAQ"
        });
    }
};

module.exports = {
    createFAQ,
    getFAQs,
    updateFAQ,
    deleteFAQ
};
