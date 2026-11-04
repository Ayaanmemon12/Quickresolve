
const Business = require("../models/Business");
const Conversation = require("../models/Conversation");
const SupportRequest = require("../models/SupportRequest");

// Create a short summary using the saved conversation.
// This does not call Gemini or consume API quota.
const createConversationSummary = (messages = []) => {
    const recentMessages = messages.slice(-8);

    if (recentMessages.length === 0) {
        return "Customer requested human assistance. No previous messages were available.";
    }

    return recentMessages
        .map((message) => {
            const sender =
                message.sender === "customer" ? "Customer" : "Chatbot";

            return `${sender}: ${message.text}`;
        })
        .join("\n")
        .slice(0, 2000);
};

// Customer submits a human support request.
const createSupportRequest = async (req, res) => {
    try {
        const { publicId } = req.params;
        const { sessionId, customerName, customerContact, issue } = req.body;

        if (
            !sessionId ||
            typeof sessionId !== "string" ||
            sessionId.trim().length > 128
        ) {
            return res.status(400).json({
                message: "A valid chat session is required."
            });
        }

        if (
            !customerName ||
            typeof customerName !== "string" ||
            !customerName.trim() ||
            customerName.trim().length > 100
        ) {
            return res.status(400).json({
                message: "Please provide a valid customer name."
            });
        }

        if (
            !customerContact ||
            typeof customerContact !== "string" ||
            !customerContact.trim() ||
            customerContact.trim().length > 150
        ) {
            return res.status(400).json({
                message: "Please provide valid contact information."
            });
        }

        if (
            !issue ||
            typeof issue !== "string" ||
            !issue.trim() ||
            issue.trim().length > 1000
        ) {
            return res.status(400).json({
                message: "Please describe your issue (maximum 1000 characters)."
            });
        }

        // Find the business and its owner.
        const business = await Business.findOne({ publicId })
            .select("_id user");

        if (!business) {
            return res.status(404).json({
                message: "Business chatbot not found."
            });
        }

        const conversation = await Conversation.findOne({
            business: business._id,
            sessionId: sessionId.trim()
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Chat conversation not found. Please refresh and try again."
            });
        }

        const summary = createConversationSummary(conversation.messages);

        // Save the support request before sending a notification.
        const supportRequest = await SupportRequest.create({
            business: business._id,
            conversation: conversation._id,
            customerName: customerName.trim(),
            customerContact: customerContact.trim(),
            issue: issue.trim(),
            summary
        });

        // Notify the correct business owner through Socket.IO.
        // If Socket.IO fails, the saved request remains successful.
        try {
            const io = req.app.get("io");

            if (io && business.user) {
                io.to(`business:${business.user.toString()}`)
                    .emit("new_support_request", {
                        requestId: supportRequest._id.toString(),
                        message: "A new customer support request has arrived."
                    });
            }
        } catch (socketError) {
            console.error(
                "Support request notification error:",
                socketError.message
            );
        }

        return res.status(201).json({
            message: "Your support request has been sent successfully.",
            request: {
                id: supportRequest._id,
                status: supportRequest.status
            }
        });

    } catch (error) {
        console.error("Create support request error:", error.message);

        return res.status(500).json({
            message: "Unable to submit your support request. Please try again."
        });
    }
};

// Business owner views their support requests.
const getSupportRequests = async (req, res) => {
    try {
        const business = await Business.findOne({
            user: req.user._id
        }).select("_id");

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const requests = await SupportRequest.find({
            business: business._id
        })
            .populate("conversation", "sessionId lastUpdated")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            total: requests.length,
            requests
        });

    } catch (error) {
        console.error("Get support requests error:", error.message);

        return res.status(500).json({
            message: "Unable to load support requests."
        });
    }
};

// Business owner updates a request's status.
const updateSupportRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = ["pending", "responded", "closed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid support request status."
            });
        }

        const business = await Business.findOne({
            user: req.user._id
        }).select("_id");

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }

        const request = await SupportRequest.findOneAndUpdate(
            {
                _id: req.params.requestId,
                business: business._id
            },
            { $set: { status } },
            { new: true, runValidators: true }
        );

        if (!request) {
            return res.status(404).json({
                message: "Support request not found."
            });
        }

        return res.status(200).json({
            message: "Support request status updated.",
            request
        });

    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid support request ID."
            });
        }

        console.error("Update support request error:", error.message);

        return res.status(500).json({
            message: "Unable to update support request."
        });
    }
};

module.exports = {
    createSupportRequest,
    getSupportRequests,
    updateSupportRequestStatus
};
