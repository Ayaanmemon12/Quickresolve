
const mongoose = require("mongoose");

// Phrases that may indicate a business commitment.
const COMMITMENT_PATTERNS = [
    /\bwe(?:'ll| will) call you\b/i,
    /\bwe(?:'ll| will) contact you\b/i,
    /\bwe(?:'ll| will) update you\b/i,
    /\bwe(?:'ll| will) get back to you\b/i,
    /\bwe(?:'ll| will) send you\b/i,
    /\bwe(?:'ll| will) check\b/i,
    /\bwe(?:'ll| will) investigate\b/i,
    /\bwe(?:'ll| will) arrange\b/i,
    /\bwe(?:'ll| will) process\b/i,
    /\bwe(?:'ll| will) resolve\b/i,
    /\bour team will\b/i,
    /\bour representative will\b/i
];

const detectCommitment = (message) => {
    if (
        typeof message !== "string" ||
        !message.trim()
    ) {
        return null;
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage.length > 2000) {
        return null;
    }

    const matchedPattern = COMMITMENT_PATTERNS.find((pattern) =>
        pattern.test(normalizedMessage)
    );

    if (!matchedPattern) {
        return null;
    }

    return {
        description: normalizedMessage.slice(0, 500),
        sourceMessage: normalizedMessage
    };
};

const isValidMessageId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
    detectCommitment,
    isValidMessageId
};
