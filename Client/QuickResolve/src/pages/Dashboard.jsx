
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import { getBusinessProfile } from "../api/businessAPI";
import { getSubscription } from "../api/subscriptionAPI";
import { getSupportRequests } from "../api/supportRequestAPI";

const SOCKET_URL = "http://localhost:5000";

function Dashboard() {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const navigate = useNavigate();

    const [publicId, setPublicId] = useState("");
    const [loadingBusiness, setLoadingBusiness] = useState(true);
    const [businessError, setBusinessError] = useState("");

    const [subscriptionPlan, setSubscriptionPlan] = useState(
        user?.subscriptionPlan || "free"
    );

    const [loadingSubscription, setLoadingSubscription] = useState(true);

    // Real-time support request states.
    const [pendingRequestCount, setPendingRequestCount] = useState(0);
    const [requestNotification, setRequestNotification] = useState("");

    // Fetch the latest pending support request count.
    const loadSupportRequestCount = useCallback(async () => {
        try {
            const response = await getSupportRequests();

            const requests = Array.isArray(response.requests)
                ? response.requests
                : [];

            const pendingCount = requests.filter(
                (request) => request.status?.toLowerCase() === "pending"
            ).length;

            setPendingRequestCount(pendingCount);
        } catch (error) {
            console.error(
                "Unable to load support request count:",
                error.message
            );
        }
    }, []);

    // Load business and subscription information.
    useEffect(() => {
        const loadBusiness = async () => {
            try {
                const response = await getBusinessProfile();
                setPublicId(response.business?.publicId || "");
            } catch (error) {
                setBusinessError(
                    error.response?.data?.message ||
                    "Unable to load your business chatbot."
                );
            } finally {
                setLoadingBusiness(false);
            }
        };

        const loadSubscription = async () => {
            try {
                const response = await getSubscription();
                const plan = response.subscriptionPlan || "free";

                setSubscriptionPlan(plan);

                const savedUser = JSON.parse(
                    localStorage.getItem("user") || "{}"
                );

                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...savedUser,
                        subscriptionPlan: plan
                    })
                );
            } catch (error) {
                console.error(
                    "Unable to load subscription:",
                    error.message
                );
            } finally {
                setLoadingSubscription(false);
            }
        };

        loadBusiness();
        loadSubscription();
    }, []);

    // Load the initial support request count.
    useEffect(() => {
        loadSupportRequestCount();
    }, [loadSupportRequestCount]);

    // Connect the dashboard to Socket.IO.
    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("Dashboard socket connection skipped: JWT missing.");
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: {
                token
            }
        });

        const handleConnect = () => {
            console.log("Dashboard Socket.IO connected.");
        };

        const handleNewRequest = () => {
            console.log("New support request received on dashboard.");

            setRequestNotification(
                "A new customer support request has arrived!"
            );

            // Update the count using the existing REST API.
            loadSupportRequestCount();
        };

        const handleDisconnect = (reason) => {
            console.log("Dashboard Socket.IO disconnected:", reason);
        };

        const handleConnectError = (error) => {
            console.error(
                "Dashboard Socket.IO connection error:",
                error.message
            );
        };

        socket.on("connect", handleConnect);
        socket.on("new_support_request", handleNewRequest);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("new_support_request", handleNewRequest);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.disconnect();
        };
    }, [loadSupportRequestCount]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    const handleOpenChatbot = () => {
        if (!publicId) {
            navigate("/business");
            return;
        }

        navigate(`/chatbot/${encodeURIComponent(publicId)}`);
    };

    const handleCopyLink = async () => {
        if (!publicId) return;

        const link =
            `${window.location.origin}/chatbot/${encodeURIComponent(publicId)}`;

        try {
            await navigator.clipboard.writeText(link);
            alert("Public chatbot link copied successfully!");
        } catch (error) {
            window.prompt("Copy your public chatbot link:", link);
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>QuickResolve</h1>
                    <p>AI-Powered Customer Support</p>
                </div>

                <button onClick={handleLogout}>
                    Log out
                </button>
            </header>

            <main className="dashboard-content">
                <h2>
                    Welcome{user?.name ? `, ${user.name}` : ""}!
                </h2>

                <p>Your QuickResolve workspace is ready.</p>

                {/* Real-time support request notification. */}
                {requestNotification && (
                    <div className="dashboard-live-notification" role="status">
                        <div>
                            <strong>New Support Request</strong>
                            <p>{requestNotification}</p>
                        </div>

                        <div className="dashboard-notification-actions">
                            <Link
                                to="/support-requests"
                                onClick={() => setRequestNotification("")}
                            >
                                View Request →
                            </Link>

                            <button
                                type="button"
                                onClick={() => setRequestNotification("")}
                                aria-label="Dismiss notification"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="dashboard-grid">

                    {/* Subscription */}
                    <Link
                        to="/subscription"
                        className="dashboard-card dashboard-card-link"
                    >
                        <h3>Your Subscription</h3>

                        {loadingSubscription ? (
                            <p>Loading subscription...</p>
                        ) : (
                            <>
                                <div className="dashboard-plan">
                                    {subscriptionPlan.toUpperCase()} PLAN
                                </div>

                                <p>
                                    Manage your current subscription
                                    or explore other available plans.
                                </p>

                                <span>
                                    Manage Subscription →
                                </span>
                            </>
                        )}
                    </Link>

                    {/* Public Chatbot */}
                    <div
                        className="dashboard-card dashboard-card-link"
                        role="link"
                        tabIndex={0}
                        onClick={handleOpenChatbot}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter" ||
                                event.key === " "
                            ) {
                                event.preventDefault();
                                handleOpenChatbot();
                            }
                        }}
                    >
                        <h3>Your Public Chatbot</h3>

                        <p>
                            Open your chatbot or share its public link
                            with customers through social media and websites.
                        </p>

                        {loadingBusiness ? (
                            <p>Loading your chatbot...</p>
                        ) : publicId ? (
                            <>
                                <div
                                    className="dashboard-chatbot-actions"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <button onClick={handleOpenChatbot}>
                                        Open My Chatbot
                                    </button>

                                    <button
                                        className="dashboard-secondary-button"
                                        onClick={handleCopyLink}
                                    >
                                        Copy Public Link
                                    </button>
                                </div>

                                <p className="dashboard-public-url">
                                    {window.location.origin}/chatbot/{publicId}
                                </p>
                            </>
                        ) : (
                            <>
                                <p>
                                    {businessError ||
                                        "Please create your business profile first."}
                                </p>

                                <Link
                                    to="/business"
                                    className="dashboard-card-action"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    Set Up Business Profile →
                                </Link>
                            </>
                        )}
                    </div>

                    {/* FAQ Manager */}
                    <Link to="/faqs" className="dashboard-card dashboard-card-link">
                        <h3>FAQ Manager</h3>
                        <p>
                            Manage the questions and answers your chatbot
                            uses to help customers.
                        </p>
                        <span>Manage FAQs →</span>
                    </Link>

                    {/* Business Profile */}
                    <Link to="/business" className="dashboard-card dashboard-card-link">
                        <h3>Business Profile</h3>
                        <p>
                            Set up your business name and description so
                            customers know who they're chatting with.
                        </p>
                        <span>Manage Business Profile →</span>
                    </Link>

                    {/* Conversation History */}
                    <Link to="/conversations" className="dashboard-card dashboard-card-link">
                        <h3>Conversation History</h3>
                        <p>
                            View customer conversations and review previous
                            chatbot interactions.
                        </p>
                        <span>View Conversations →</span>
                    </Link>

                    {/* Support Gap Radar */}
                    <Link to="/support-gaps" className="dashboard-card dashboard-card-link">
                        <h3>Support Gap Radar</h3>
                        <p>
                            Discover questions your current FAQs don't answer.
                        </p>
                        <span>View Support Gaps →</span>
                    </Link>

                    {/* Human Support Requests */}
                    <Link to="/support-requests" className="dashboard-card dashboard-card-link">
                        <h3>
                            Human Support Requests
                            {pendingRequestCount > 0 && (
                                <span className="dashboard-request-badge">
                                    {pendingRequestCount}
                                </span>
                            )}
                        </h3>

                        <p>
                            Review customer requests and manage human
                            support follow-ups.
                        </p>

                        <span>View Support Requests →</span>
                    </Link>

                    {/* Commitment Tracker */}
                    <Link to="/commitments" className="dashboard-card dashboard-card-link">
                        <h3>Commitment Tracker</h3>
                        <p>
                            Review chatbot promises, manage business
                            follow-ups, set deadlines, and track completed tasks.
                        </p>
                        <span>Manage Commitments →</span>
                    </Link>

                </div>
            </main>
        </div>
    );
}

export default Dashboard;
