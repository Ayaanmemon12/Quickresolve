
const Conversation = require("../models/Conversation");
const Business = require("../models/Business");


const getBusinessConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const business = await Business.findOne({ user: userId });

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const conversations = await Conversation.find({
            business: business._id
        })
            .sort({ lastUpdated: -1 })
            .limit(50);

        return res.status(200).json({
            conversations
        });
    } catch (error) {
        console.error("Get conversations error:", error.message);

        return res.status(500).json({
            message: "Server error while fetching conversations."
        });
    }
};


const getSupportGaps = async (req, res) => {
    try {
        const userId = req.user.id;

        const business = await Business.findOne({ user: userId });

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const conversations = await Conversation.find({
            business: business._id
        }).select("messages lastUpdated");

        const questionGroups = new Map();

        conversations.forEach((conversation) => {
            const messages = conversation.messages || [];

            messages.forEach((message, index) => {
                if (
                    message.sender !== "customer" ||
                    !["gemini", "fallback"].includes(message.source)
                ) {
                    return;
                }

                const question = message.text?.trim();

                if (!question) {
                    return;
                }

                const normalizedQuestion = question
                    .toLowerCase()
                    .replace(/[^\p{L}\p{N}\s]/gu, "")
                    .replace(/\s+/g, " ")
                    .trim();

                if (!normalizedQuestion) {
                    return;
                }

                if (!questionGroups.has(normalizedQuestion)) {
                    questionGroups.set(normalizedQuestion, {
                        question,
                        count: 0,
                        lastAsked: message.timestamp || conversation.lastUpdated
                    });
                }

                const group = questionGroups.get(normalizedQuestion);

                group.count += 1;

                const messageDate = message.timestamp
                    ? new Date(message.timestamp)
                    : new Date(conversation.lastUpdated);

                if (messageDate > new Date(group.lastAsked)) {
                    group.lastAsked = messageDate;
                }
            });
        });

        const gaps = Array.from(questionGroups.values())
            .sort((a, b) => b.count - a.count);

        return res.status(200).json({
            totalGaps: gaps.length,
            totalPotentialQuestions: gaps.reduce(
                (total, gap) => total + gap.count,
                0
            ),
            gaps
        });
    } catch (error) {
        console.error("Get support gaps error:", error.message);

        return res.status(500).json({
            message: "Server error while analyzing support gaps."
        });
    }
};

module.exports = {
    getBusinessConversations,
    getSupportGaps
};
