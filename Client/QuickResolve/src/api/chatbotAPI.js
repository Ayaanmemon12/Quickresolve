
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/chatbot",
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 30000
});

const validatePublicId = (publicId) => {
    if (typeof publicId !== "string" || !publicId.trim()) {
        throw new Error("A valid chatbot ID is required.");
    }

    return publicId.trim();
};


export const getChatSessionId = (publicId) => {
    const validPublicId = validatePublicId(publicId);
    const storageKey = `quickresolve_session_${validPublicId}`;

    try {
        let sessionId = sessionStorage.getItem(storageKey);

        if (!sessionId) {
            sessionId = typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            sessionStorage.setItem(storageKey, sessionId);
        }

        return sessionId;
    } catch (error) {

        return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
};

export const getPublicChatbot = async (publicId) => {
    const validPublicId = validatePublicId(publicId);

    try {
        const response = await API.get(
            `/${encodeURIComponent(validPublicId)}`
        );

        return response.data;
    } catch (error) {
        console.error("Load chatbot API error:", error.message);

        if (error.response) throw error;

        if (error.code === "ECONNABORTED") {
            throw new Error("The server took too long to respond.");
        }

        throw new Error(
            "Unable to connect to the chatbot server. Please try again."
        );
    }
};

export const sendChatbotMessage = async (publicId, message, sessionId) => {
    const validPublicId = validatePublicId(publicId);

    if (typeof message !== "string" || !message.trim()) {
        throw new Error("Please enter a valid message.");
    }

    if (message.trim().length > 1000) {
        throw new Error("Message cannot exceed 1000 characters.");
    }

    if (typeof sessionId !== "string" || !sessionId.trim()) {
        throw new Error("A valid chat session is required.");
    }

    try {
        const response = await API.post(
            `/${encodeURIComponent(validPublicId)}/message`,
            {
                message: message.trim(),
                sessionId: sessionId.trim()
            },
            {
                timeout: 210000
            }
        );

        return response.data;
    } catch (error) {
        console.error("Send chatbot message API error:", error.message);

        if (error.response) throw error;

        if (error.code === "ECONNABORTED") {
            throw new Error("The AI response timed out. Please try again.");
        }

        throw new Error(
            "Unable to connect to the chatbot server. Please try again."
        );
    }
};

export const saveFAQMessage = async (publicId, faqId, sessionId) => {
    const validPublicId = validatePublicId(publicId);

    if (!faqId || typeof faqId !== "string") {
        throw new Error("A valid FAQ ID is required.");
    }

    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
        throw new Error("A valid chat session is required.");
    }

    try {
        const response = await API.post(
            `/${encodeURIComponent(validPublicId)}/faq-message`,
            {
                faqId,
                sessionId: sessionId.trim()
            }
        );

        return response.data;
    } catch (error) {
        console.error("Save FAQ message API error:", error.message);

        if (error.response) throw error;
        if (error.code === "ECONNABORTED") {
            throw new Error("Saving the FAQ response timed out.");
        }

        throw new Error("Unable to save the FAQ response. Please try again.");
    }
};
