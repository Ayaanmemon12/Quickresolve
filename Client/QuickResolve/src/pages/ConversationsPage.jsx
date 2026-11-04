import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConversations } from "../api/conversationAPI";

function formatTime(date) {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Date unavailable";

    return parsed.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function ConversationsPage() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedChat, setSelectedChat] = useState(null);

    const loadConversations = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getConversations();
            const chats = Array.isArray(data.conversations)
                ? data.conversations
                : [];

            setConversations(chats);

            setSelectedChat((current) => {
                if (!chats.length) return null;

                return chats.find((chat) => chat._id === current?._id)
                    || chats[0];
            });
        } catch (err) {
            setError(
                err.message || "Failed to load customer conversations."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, []);

    const totalMessages = conversations.reduce(
        (total, chat) => total + (chat.messages?.length || 0),
        0
    );

    const totalCustomers = conversations.reduce(
        (total, chat) =>
            total + (chat.messages || []).filter(
                (message) => message.sender === "customer"
            ).length,
        0
    );

    if (loading) {
        return (
            <div className="conversation-loading">
                <Link
                    to="/dashboard"
                    className="back-dashboard-button"
                >
                    ← Back to Dashboard
                </Link>

                <div className="conversation-loader"></div>
                <h2>Loading conversations</h2>
                <p>Preparing your customer support inbox...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="conversation-error">
                <Link
                    to="/dashboard"
                    className="back-dashboard-button"
                >
                    ← Back to Dashboard
                </Link>

                <div className="conversation-error-icon">!</div>
                <h2>Unable to load conversations</h2>
                <p>{error}</p>
                <button onClick={loadConversations}>
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="conversations-page">
            <header className="conversations-header">
                <div>
                    <span className="conversations-eyebrow">
                        QUICKRESOLVE WORKSPACE
                    </span>
                    <h1>Customer Inbox</h1>
                    <p>
                        Manage and review your customer support conversations.
                    </p>
                </div>

                <div className="conversation-header-actions">
                    <Link
                        to="/dashboard"
                        className="back-dashboard-button"
                    >
                        ← Back to Dashboard
                    </Link>

                    <button
                        className="conversation-refresh-button"
                        onClick={loadConversations}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </header>

            <section className="conversation-stat-grid">
                <div className="conversation-stat-card">
                    <span className="stat-icon">💬</span>
                    <div>
                        <p>Total Conversations</p>
                        <h2>{conversations.length}</h2>
                    </div>
                </div>

                <div className="conversation-stat-card">
                    <span className="stat-icon">👥</span>
                    <div>
                        <p>Customer Messages</p>
                        <h2>{totalCustomers}</h2>
                    </div>
                </div>

                <div className="conversation-stat-card">
                    <span className="stat-icon">✉️</span>
                    <div>
                        <p>Total Messages</p>
                        <h2>{totalMessages}</h2>
                    </div>
                </div>
            </section>

            {conversations.length === 0 ? (
                <div className="conversation-empty">
                    <div className="empty-icon">💬</div>
                    <h2>No conversations yet</h2>
                    <p>
                        Customer conversations will appear here when someone
                        starts chatting with your public chatbot.
                    </p>
                </div>
            ) : (
                <section className="conversation-workspace">
                    <aside className="conversation-sidebar">
                        <div className="conversation-sidebar-header">
                            <div>
                                <h2>Recent Chats</h2>
                                <p>{conversations.length} conversations</p>
                            </div>
                            <span className="online-indicator"></span>
                        </div>

                        <div className="conversation-list">
                            {conversations.map((chat) => {
                                const isSelected =
                                    selectedChat?._id === chat._id;

                                const messages = chat.messages || [];
                                const lastMessage =
                                    messages[messages.length - 1];

                                return (
                                    <button
                                        type="button"
                                        key={chat._id}
                                        className={`conversation-list-item ${
                                            isSelected ? "active" : ""
                                        }`}
                                        onClick={() => setSelectedChat(chat)}
                                    >
                                        <div className="conversation-avatar">
                                            C
                                        </div>

                                        <div className="conversation-preview">
                                            <div className="conversation-preview-top">
                                                <strong>Customer</strong>
                                                <span>
                                                    {formatTime(
                                                        lastMessage?.timestamp ||
                                                        chat.lastUpdated
                                                    )}
                                                </span>
                                            </div>

                                            <p>
                                                {lastMessage?.text ||
                                                    "No messages yet"}
                                            </p>

                                            <small>
                                                {messages.length} messages
                                            </small>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <main className="conversation-chat-panel">
                        {selectedChat && (
                            <>
                                <div className="conversation-chat-header">
                                    <div className="conversation-avatar large">
                                        C
                                    </div>

                                    <div className="chat-header-details">
                                        <h2>Customer Conversation</h2>
                                        <p>
                                            Session:{" "}
                                            {selectedChat.sessionId}
                                        </p>
                                    </div>

                                    <span className="chat-status">
                                        Saved
                                    </span>
                                </div>

                                <div className="conversation-date-divider">
                                    <span>
                                        {formatDate(
                                            selectedChat.createdAt ||
                                            selectedChat.lastUpdated
                                        )}
                                    </span>
                                </div>

                                <div className="conversation-messages">
                                    {selectedChat.messages?.map(
                                        (msg, index) => {
                                            const isCustomer =
                                                msg.sender === "customer";

                                            return (
                                                <div
                                                    key={`${selectedChat._id}-${index}`}
                                                    className={`chat-message-row ${
                                                        isCustomer
                                                            ? "customer-row"
                                                            : "bot-row"
                                                    }`}
                                                >
                                                    <div className="chat-message-content">
                                                        <div className="chat-message-meta">
                                                            <strong>
                                                                {isCustomer
                                                                    ? "Customer"
                                                                    : "QuickResolve AI"}
                                                            </strong>

                                                            <span>
                                                                {formatTime(
                                                                    msg.timestamp
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className={`chat-bubble ${
                                                                isCustomer
                                                                    ? "customer-bubble"
                                                                    : "bot-bubble"
                                                            }`}
                                                        >
                                                            {msg.text}
                                                        </div>

                                                        {!isCustomer && (
                                                            <span className="message-source">
                                                                {msg.source === "faq"
                                                                    ? "✓ Saved FAQ"
                                                                    : msg.source === "gemini"
                                                                        ? "✦ AI response"
                                                                        : "Support response"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>

                                <div className="conversation-footer">
                                    <span>
                                        🔒 Conversation saved securely
                                    </span>
                                    <span>
                                        {selectedChat.messages?.length || 0} messages
                                    </span>
                                </div>
                            </>
                        )}
                    </main>
                </section>
            )}
        </div>
    );
}

export default ConversationsPage;