
const User = require("../models/User");
const Business = require("../models/Business");

const {
    PLAN_LIMITS,
    checkFaqLimit,
    checkMonthlyMessageLimit
} = require("../services/subscriptionLimitService");

const formatLimit = (limit) => {
    return Number.isFinite(limit) ? limit : "Unlimited";
};

const updateSubscription = async (req, res) => {
    try {
        const { plan } = req.body;

        const allowedPlans = ["free", "basic", "pro"];

        if (!plan || !allowedPlans.includes(plan)) {
            return res.status(400).json({
                message: "Please select a valid subscription plan."
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        user.subscriptionPlan = plan;
        await user.save();

        return res.status(200).json({
            message: "Subscription plan updated successfully.",
            subscriptionPlan: user.subscriptionPlan
        });
    } catch (error) {
        console.error("Subscription update error:", error);

        return res.status(500).json({
            message: "Unable to update subscription plan."
        });
    }
};

const getSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select(
            "subscriptionPlan"
        );

        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        const plan = PLAN_LIMITS[user.subscriptionPlan]
            ? user.subscriptionPlan
            : "free";

        const faqUsage = await checkFaqLimit(req.user._id);

        const business = await Business.findOne({
            user: req.user._id
        }).select("_id");

        let messageUsage = {
            used: 0,
            limit: PLAN_LIMITS[plan].monthlyMessages
        };

        if (business) {
            const usage = await checkMonthlyMessageLimit(
                req.user._id,
                business._id
            );

            messageUsage = {
                used: usage.used,
                limit: usage.limit
            };
        }

        return res.status(200).json({
            subscriptionPlan: plan,
            usage: {
                faqs: {
                    used: faqUsage.used,
                    limit: formatLimit(faqUsage.limit)
                },
                monthlyMessages: {
                    used: messageUsage.used,
                    limit: formatLimit(messageUsage.limit)
                }
            }
        });
    } catch (error) {
        console.error("Get subscription error:", error);

        return res.status(500).json({
            message: "Unable to retrieve subscription information."
        });
    }
};

module.exports = {
    updateSubscription,
    getSubscription
};
