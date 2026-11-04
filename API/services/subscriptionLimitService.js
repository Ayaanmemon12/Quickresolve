const mongoose = require("mongoose");

const User = require("../models/User");
const FAQ = require("../models/FAQ");
const Conversation = require("../models/Conversation");

const PLAN_LIMITS = {
    free: {
        faqs: 10,
        monthlyMessages: 100
    },
    basic: {
        faqs: 50,
        monthlyMessages: 1000
    },
    pro: {
        faqs: Infinity,
        monthlyMessages: Infinity
    }
};

// Get the user's current plan.
// If the plan is missing, safely treat the user as Free.
const getUserPlan = async (userId) => {
    const user = await User.findById(userId)
        .select("subscriptionPlan")
        .lean();

    if (!user) {
        throw new Error("User not found.");
    }

    const plan = PLAN_LIMITS[user.subscriptionPlan]
        ? user.subscriptionPlan
        : "free";

    return {
        plan,
        limits: PLAN_LIMITS[plan]
    };
};

// Check how many FAQs the user currently has.
const checkFaqLimit = async (userId) => {
    const { plan, limits } = await getUserPlan(userId);

    const used = await FAQ.countDocuments({
        user: userId
    });

    return {
        plan,
        used,
        limit: limits.faqs,
        allowed: used < limits.faqs
    };
};

// Count customer messages during the current UTC calendar month.
const checkMonthlyMessageLimit = async (userId, businessId) => {
    if (!mongoose.isValidObjectId(businessId)) {
        throw new Error("Invalid business ID.");
    }

    const { plan, limits } = await getUserPlan(userId);

    const now = new Date();

    const monthStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1
    ));

    const nextMonthStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
    ));

    const result = await Conversation.aggregate([
        {
            $match: {
                business: new mongoose.Types.ObjectId(businessId)
            }
        },
        {
            $unwind: "$messages"
        },
        {
            $match: {
                "messages.sender": "customer",
                "messages.timestamp": {
                    $gte: monthStart,
                    $lt: nextMonthStart
                }
            }
        },
        {
            $count: "total"
        }
    ]);

    const used = result.length > 0 ? result[0].total : 0;

    return {
        plan,
        used,
        limit: limits.monthlyMessages,
        allowed: used < limits.monthlyMessages
    };
};

module.exports = {
    PLAN_LIMITS,
    getUserPlan,
    checkFaqLimit,
    checkMonthlyMessageLimit
};