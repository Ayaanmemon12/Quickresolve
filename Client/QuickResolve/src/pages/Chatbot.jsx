
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
    getPublicChatbot,
    sendChatbotMessage,
    getChatSessionId,
    saveFAQMessage
} from "../api/chatbotAPI";

import { createSupportRequest } from "../api/supportRequestAPI";

import "./Chatbot.css";

const SUGGESTED_QUESTIONS = [
    "What payment methods do you accept?",
    "My refund is delayed. Can someone check it and update me?",
    "What are your opening hours?"
];

function Chatbot() {
    const { publicId } = useParams();

    const [business, setBusiness] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [messages, setMessages] = useState([]);

    // Human support state
    const [showHandoff, setShowHandoff] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [customerContact, setCustomerContact] = useState("");
    const [issue, setIssue] = useState("");
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [handoffError, setHandoffError] = useState("");
    const [handoffSuccess, setHandoffSuccess] = useState("");

    const sendingRef = useRef(false);
    const messageIdRef = useRef(0);

    const createMessageId = () => {
        messageIdRef.current += 1;
        return `${Date.now()}-${messageIdRef.current}`;
    };

    const normalizeText = (text) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}\s]/gu, "")
            .replace(/\s+/g, " ");
    };

    // Match the three predefined suggestions with actual saved FAQs.
    const suggestedFAQs = SUGGESTED_QUESTIONS.map((question) => {
        return faqs.find((faq) =>
            faq &&
            typeof faq.question === "string" &&
            typeof faq.answer === "string" &&
            faq._id &&
            normalizeText(faq.question) === normalizeText(question)
        );
    }).filter(Boolean);

    useEffect(() => {
        let cancelled = false;

        const loadChatbot = async () => {
            try {
                setLoading(true);
                setError("");
                setBusiness(null);
                setFaqs([]);
                setMessages([]);

                if (!publicId) {
                    throw new Error("A chatbot ID is required.");
                }

                const response = await getPublicChatbot(publicId);

                if (cancelled) return;

                if (
                    !response ||
                    !response.business ||
                    typeof response.business.name !== "string" ||
                    !response.business.name.trim()
                ) {
                    throw new Error("Invalid chatbot information received.");
                }

                const loadedFaqs = Array.isArray(response.faqs)
                    ? response.faqs
                    : [];

                setBusiness(response.business);
                setFaqs(loadedFaqs);

                setMessages([
                    {
                        id: createMessageId(),
                        sender: "bot",
                        text: `Hi there! 👋 Welcome to ${response.business.name}. How can I help you today?`
                    }
                ]);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load this chatbot."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadChatbot();

        return () => {
            cancelled = true;
        };
    }, [publicId]);

    const handleSend = async (e, selectedFAQ = null) => {
        if (e) {
            e.preventDefault();
        }

        const isSuggestedQuestion = selectedFAQ !== null;

        const trimmedMessage = isSuggestedQuestion
            ? selectedFAQ.question.trim()
            : message.trim();

        if (
            !trimmedMessage ||
            sendingRef.current ||
            sending ||
            !publicId
        ) {
            return;
        }

        if (trimmedMessage.length > 1000) {
            setMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    sender: "bot",
                    text: "Your message cannot exceed 1000 characters."
                }
            ]);
            return;
        }

        sendingRef.current = true;
        setSending(true);

        setMessages((prev) => [
            ...prev,
            {
                id: createMessageId(),
                sender: "user",
                text: trimmedMessage
            }
        ]);

        if (!isSuggestedQuestion) {
            setMessage("");
        }

        try {
            const sessionId = getChatSessionId(publicId);

            // Suggested questions always use their saved FAQ.
            // They never call Gemini.
            const matchedFAQ = isSuggestedQuestion
                ? selectedFAQ
                : faqs.find((faq) => {
                    if (
                        typeof faq.question !== "string" ||
                        typeof faq.answer !== "string"
                    ) {
                        return false;
                    }

                    return (
                        normalizeText(faq.question) ===
                        normalizeText(trimmedMessage)
                    );
                });

            let botReply;

            if (matchedFAQ) {
                const response = await saveFAQMessage(
                    publicId,
                    matchedFAQ._id,
                    sessionId
                );

                if (
                    !response ||
                    typeof response.answer !== "string" ||
                    !response.answer.trim()
                ) {
                    throw new Error(
                        "The saved FAQ returned an invalid response."
                    );
                }

                botReply = response.answer.trim();
            } else if (isSuggestedQuestion) {
                // Safety check: never send a suggested question to Gemini.
                throw new Error(
                    "This suggested FAQ could not be found. Please contact the business owner."
                );
            } else {
                // Only manually typed questions that do not exactly
                // match a saved FAQ reach Gemini.
                const response = await sendChatbotMessage(
                    publicId,
                    trimmedMessage,
                    sessionId
                );

                if (
                    !response ||
                    typeof response.answer !== "string" ||
                    !response.answer.trim()
                ) {
                    throw new Error(
                        "The AI assistant returned an invalid response."
                    );
                }

                botReply = response.answer.trim();
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    sender: "bot",
                    text: botReply
                }
            ]);
        } catch (err) {
            console.error("Chatbot message error:", err);

            let errorMessage;

            if (err.response?.data?.code === "MESSAGE_LIMIT_REACHED") {
                errorMessage =
                    "This business has reached its monthly chatbot message limit. Please connect with the business owner directly for further assistance.";
            } else {
                errorMessage =
                    err.response?.data?.message ||
                    err.message ||
                    "Sorry, I couldn't process your message right now. Please try again.";
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    sender: "bot",
                    text: errorMessage
                }
            ]);
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    };

    const handleHandoffSubmit = async (e) => {
        e.preventDefault();

        if (submittingRequest) return;

        if (!messages.some((msg) => msg.sender === "user")) {
            setHandoffError(
                "Please send at least one message before requesting human support."
            );
            return;
        }

        if (
            !customerName.trim() ||
            !customerContact.trim() ||
            !issue.trim()
        ) {
            setHandoffError("Please complete all fields.");
            return;
        }

        setSubmittingRequest(true);
        setHandoffError("");
        setHandoffSuccess("");

        try {
            const sessionId = getChatSessionId(publicId);

            const response = await createSupportRequest(publicId, {
                sessionId,
                customerName: customerName.trim(),
                customerContact: customerContact.trim(),
                issue: issue.trim()
            });

            setHandoffSuccess(
                response.message ||
                "Your support request has been submitted successfully."
            );

            setCustomerName("");
            setCustomerContact("");
            setIssue("");
        } catch (err) {
            console.error("Human handoff error:", err);

            setHandoffError(
                err.message ||
                "Unable to submit your request. Please try again."
            );
        } finally {
            setSubmittingRequest(false);
        }
    };

    if (loading) {
        return (
            <div className="chatbot-page">
                Loading chatbot...
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="chatbot-page">
                <div className="chatbot-window">
                    <p>{error || "Chatbot not found."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chatbot-page">
            <div className="chatbot-window">

                <header className="chatbot-header">
                    <div className="chatbot-profile">
                        <div className="chatbot-avatar">
                            🤖
                        </div>

                        <div>
                            <h2>{business.name} Assistant</h2>
                            <span>● Online · Ready to help</span>
                        </div>
                    </div>
                </header>

                <main className="chatbot-messages">
                    <div className="chatbot-date">
                        Today
                    </div>

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`chat-message ${msg.sender}`}
                        >
                            <div className="chat-bubble">
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="chat-message bot">
                            <div className="chat-bubble">
                                Thinking...
                            </div>
                        </div>
                    )}
                </main>

                {/* Three saved FAQ suggestions */}
                {messages.length === 1 && (
                    <div className="suggested-questions">
                        <p>Suggested questions:</p>

                        {suggestedFAQs.map((faq) => (
                            <button
                                key={faq._id}
                                type="button"
                                className="suggested-question-button"
                                onClick={() => handleSend(null, faq)}
                                disabled={sending}
                            >
                                {SUGGESTED_QUESTIONS.find(
                                    (question) =>
                                        normalizeText(question) ===
                                        normalizeText(faq.question)
                                )}
                            </button>
                        ))}

                        {suggestedFAQs.length === 0 && (
                            <p>
                                No matching suggested FAQs are available.
                            </p>
                        )}
                    </div>
                )}

                <form
                    className="chatbot-input-area"
                    onSubmit={handleSend}
                >
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={sending}
                        maxLength={1000}
                    />

                    <button
                        type="submit"
                        disabled={!message.trim() || sending}
                    >
                        {sending ? "..." : "➤"}
                    </button>
                </form>

                {/* Human handoff */}
                <div className="handoff-section">
                    <button
                        type="button"
                        className="handoff-toggle-button"
                        onClick={() => {
                            setShowHandoff((prev) => !prev);
                            setHandoffError("");
                            setHandoffSuccess("");
                        }}
                        disabled={sending || submittingRequest}
                    >
                        {showHandoff
                            ? "Cancel human support"
                            : "👤 Connect with Business Owner"}
                    </button>

                    {showHandoff && (
                        <form
                            className="handoff-form"
                            onSubmit={handleHandoffSubmit}
                        >
                            <h3>Request Human Support</h3>

                            <p>
                                Leave your details and describe your issue.
                                The business owner can review your request.
                            </p>

                            <input
                                type="text"
                                placeholder="Your name"
                                value={customerName}
                                onChange={(e) =>
                                    setCustomerName(e.target.value)
                                }
                                maxLength={100}
                                required
                            />

                            <input
                                type="text"
                                placeholder="Email or phone number"
                                value={customerContact}
                                onChange={(e) =>
                                    setCustomerContact(e.target.value)
                                }
                                maxLength={150}
                                required
                            />

                            <textarea
                                placeholder="Describe your issue..."
                                value={issue}
                                onChange={(e) =>
                                    setIssue(e.target.value)
                                }
                                maxLength={1000}
                                rows={4}
                                required
                            />

                            {handoffError && (
                                <p className="handoff-error">
                                    {handoffError}
                                </p>
                            )}

                            {handoffSuccess && (
                                <p className="handoff-success">
                                    {handoffSuccess}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="handoff-submit-button"
                                disabled={submittingRequest}
                            >
                                {submittingRequest
                                    ? "Submitting..."
                                    : "Submit Support Request"}
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}

export default Chatbot;
