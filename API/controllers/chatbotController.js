
const Business = require("../models/Business");
const FAQ = require("../models/FAQ");
const Conversation = require("../models/Conversation");
const Commitment = require("../models/Commitment");

const { generateAIAnswer } = require("../services/aiService");
const { detectCommitment } = require("../services/commitmentDetectionService");

const {
    checkMonthlyMessageLimit
} = require("../services/subscriptionLimitService");

const AI_TIMEOUT_MS = 180000;

// Detect and save a possible promise from a chatbot response.
// Detection errors must never interrupt the normal chatbot response.
const detectAndSaveCommitment = async ({
    businessId,
    conversation,
    sessionId,
    botMessage
}) => {
    try {
        if (!conversation || !botMessage?._id) return;

        const detected = detectCommitment(botMessage.text);

        if (!detected) return;

        await Commitment.updateOne(
            {
                business: businessId,
                conversation: conversation._id,
                sourceMessageId: botMessage._id
            },
            {
                $setOnInsert: {
                    business: businessId,
                    conversation: conversation._id,
                    sessionId,
                    sourceMessageId: botMessage._id,
                    sourceMessage: detected.sourceMessage,
                    description: detected.description
                }
            },
            { upsert: true }
        );

        console.log("[Commitment] Possible promise detected.");
    } catch (error) {
        console.error("[Commitment] Detection failed:", error.message);
    }
};

const withTimeout = (promise, timeoutMs) => {
    let timer;

    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const error = new Error("Gemini request timed out.");
            error.code = "AI_TIMEOUT";
            reject(error);
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise])
        .finally(() => clearTimeout(timer));
};

const findPublicBusiness = async (publicId) => {
    return Business.findOne({ publicId })
        .select("name description publicId user");
};

// Check whether the business owner can receive another customer message.
const enforceMessageLimit = async (business, res) => {
    const usage = await checkMonthlyMessageLimit(
        business.user,
        business._id
    );

    if (usage.allowed) {
        return true;
    }

    res.status(403).json({
        success: false,
        code: "MESSAGE_LIMIT_REACHED",
        message: `Your ${usage.plan.toUpperCase()} plan allows ${usage.limit} customer messages per month. You have used ${usage.used}. Upgrade your plan to continue.`,
        usage: {
            plan: usage.plan,
            used: usage.used,
            limit: usage.limit
        }
    });

    return false;
};

const getPublicChatbot = async (req, res) => {
    try {
        const { publicId } = req.params;

        if (typeof publicId !== "string" || !publicId.trim()) {
            return res.status(400).json({
                message: "A valid chatbot ID is required."
            });
        }

        const business = await findPublicBusiness(publicId);

        if (!business) {
            return res.status(404).json({
                message: "Chatbot not found."
            });
        }

        const faqs = await FAQ.find({
            user: business.user
        })
            .select("_id question answer")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            business: {
                name: business.name,
                description: business.description,
                publicId: business.publicId
            },
            faqs
        });
    } catch (error) {
        console.error("Get public chatbot error:", error.message);

        return res.status(500).json({
            message: "Unable to load this chatbot."
        });
    }
};

const saveFAQConversation = async (req, res) => {
    try {
        const { publicId } = req.params;
        const { faqId, sessionId } = req.body || {};

        if (typeof publicId !== "string" || !publicId.trim()) {
            return res.status(400).json({
                message: "A valid chatbot ID is required."
            });
        }

        if (
            typeof sessionId !== "string" ||
            !sessionId.trim() ||
            sessionId.trim().length > 128
        ) {
            return res.status(400).json({
                message: "A valid conversation session is required."
            });
        }

        if (
            typeof faqId !== "string" ||
            !/^[a-f\d]{24}$/i.test(faqId)
        ) {
            return res.status(400).json({
                message: "A valid FAQ ID is required."
            });
        }

        const business = await findPublicBusiness(publicId);

        if (!business) {
            return res.status(404).json({
                message: "Chatbot not found."
            });
        }

        const faq = await FAQ.findOne({
            _id: faqId,
            user: business.user
        }).lean();

        if (!faq) {
            return res.status(404).json({
                message: "FAQ not found."
            });
        }

        // Enforce the subscription limit before saving the conversation.
        const allowed = await enforceMessageLimit(business, res);

        if (!allowed) return;

        const now = new Date();

        const savedConversation = await Conversation.findOneAndUpdate(
            {
                business: business._id,
                sessionId: sessionId.trim()
            },
            {
                $set: {
                    lastUpdated: now
                },
                $setOnInsert: {
                    business: business._id,
                    sessionId: sessionId.trim()
                },
                $push: {
                    messages: {
                        $each: [
                            {
                                sender: "customer",
                                text: faq.question,
                                source: "faq",
                                timestamp: now
                            },
                            {
                                sender: "bot",
                                text: faq.answer,
                                source: "faq",
                                timestamp: now
                            }
                        ]
                    }
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        const botMessage =
            savedConversation?.messages?.[
                savedConversation.messages.length - 1
            ];

        await detectAndSaveCommitment({
            businessId: business._id,
            conversation: savedConversation,
            sessionId: sessionId.trim(),
            botMessage
        });

        return res.status(200).json({
            message: "FAQ conversation saved successfully.",
            answer: faq.answer
        });

    } catch (error) {
        console.error("Save FAQ conversation error:", error.message);

        return res.status(500).json({
            message: "Unable to save FAQ conversation."
        });
    }
};

const sendChatbotMessage = async (req, res) => {
    const requestStartedAt = Date.now();

    try {
        console.log("[Chatbot] Incoming message request.");

        const { publicId } = req.params;
        const { message, sessionId } = req.body || {};

        if (typeof publicId !== "string" || !publicId.trim()) {
            return res.status(400).json({
                message: "A valid chatbot ID is required."
            });
        }

        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.trim().length > 1000
        ) {
            return res.status(400).json({
                message: "Message must contain 1–1000 characters."
            });
        }

        if (
            typeof sessionId !== "string" ||
            !sessionId.trim() ||
            sessionId.trim().length > 128
        ) {
            return res.status(400).json({
                message: "A valid conversation session is required."
            });
        }

        console.log("[Chatbot] Looking up business.");

        const business = await findPublicBusiness(publicId);

        if (!business) {
            return res.status(404).json({
                message: "Chatbot not found."
            });
        }

        // Enforce the subscription limit before calling Gemini.
        const allowed = await enforceMessageLimit(business, res);

        if (!allowed) return;

        console.log("[Chatbot] Business found:", business.name);
        console.log("[Chatbot] Loading saved FAQs.");

        const faqs = await FAQ.find({
            user: business.user
        })
            .select("_id question answer")
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        console.log(`[Chatbot] Loaded ${faqs.length} FAQs.`);
        console.log("[Chatbot] Starting Gemini request.");

        const geminiStartedAt = Date.now();

        const answer = await withTimeout(
            generateAIAnswer(message.trim(), business, faqs),
            AI_TIMEOUT_MS
        );

        console.log(
            `[Chatbot] Gemini responded in ${Date.now() - geminiStartedAt}ms.`
        );

        if (typeof answer !== "string" || !answer.trim()) {
            return res.status(502).json({
                message: "The AI assistant returned an empty response."
            });
        }

        try {
            const now = new Date();

            const savedConversation = await Conversation.findOneAndUpdate(
                {
                    business: business._id,
                    sessionId: sessionId.trim()
                },
                {
                    $set: {
                        lastUpdated: now
                    },
                    $setOnInsert: {
                        business: business._id,
                        sessionId: sessionId.trim()
                    },
                    $push: {
                        messages: {
                            $each: [
                                {
                                    sender: "customer",
                                    text: message.trim(),
                                    source: "gemini",
                                    timestamp: now
                                },
                                {
                                    sender: "bot",
                                    text: answer.trim(),
                                    source: "gemini",
                                    timestamp: now
                                }
                            ]
                        }
                    }
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true
                }
            );

            console.log("[Chatbot] Conversation saved successfully.");

            const botMessage =
                savedConversation?.messages?.[
                    savedConversation.messages.length - 1
                ];

            await detectAndSaveCommitment({
                businessId: business._id,
                conversation: savedConversation,
                sessionId: sessionId.trim(),
                botMessage
            });

        } catch (saveError) {
            console.error(
                "[Chatbot] Conversation saving failed:",
                saveError.message
            );
        }

        console.log(
            `[Chatbot] Request completed in ${Date.now() - requestStartedAt}ms.`
        );

        return res.status(200).json({
            answer: answer.trim()
        });
    } catch (error) {
        const duration = Date.now() - requestStartedAt;

        console.error("[Chatbot] Message request failed:", {
            code: error.code || "UNKNOWN",
            status: error.status || error.statusCode || "UNKNOWN",
            duration: `${duration}ms`,
            message: error.message || "Unknown error"
        });

        if (error.code === "AI_TIMEOUT") {
            return res.status(504).json({
                message: "The AI response took too long. Please try again later."
            });
        }

        const status = Number(error.status || error.statusCode);

        if (status === 429) {
            return res.status(429).json({
                message: "The AI service rate limit or quota has been reached. Please try again later."
            });
        }

        if (status === 503) {
            return res.status(503).json({
                message: "The AI service is temporarily unavailable. Please try again later."
            });
        }

        if (status === 400) {
            return res.status(400).json({
                message: "The AI service rejected the request."
            });
        }

        if (status === 401 || status === 403) {
            return res.status(502).json({
                message: "The AI service authentication or permission check failed."
            });
        }

        return res.status(502).json({
            message: "Sorry, the AI assistant could not process your message."
        });
    }
};

module.exports = {
    getPublicChatbot,
    sendChatbotMessage,
    saveFAQConversation
};
