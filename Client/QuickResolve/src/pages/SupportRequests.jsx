
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";

import {
    getSupportRequests,
    updateSupportRequestStatus
} from "../api/supportRequestAPI";

import "./SupportRequests.css";

// Backend Socket.IO server URL.
const SOCKET_URL = "http://localhost:5000";

function SupportRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    // Track the real-time connection status.
    const [socketConnected, setSocketConnected] = useState(false);

    // Fetch support requests from the backend.
    // Silent refresh avoids replacing the page with a loading screen.
    const loadRequests = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }

            setError("");

            const response = await getSupportRequests();

            setRequests(
                Array.isArray(response.requests) ? response.requests : []
            );
        } catch (err) {
            setError(err.message || "Unable to load support requests.");
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);

    // Load requests when the page opens.
    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Connect to Socket.IO for real-time notifications.
    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("Socket connection skipped: JWT token not found.");
            setSocketConnected(false);
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: {
                token
            }
        });

        // Update status when the socket successfully connects.
        const handleConnect = () => {
            setSocketConnected(true);
            console.log("Socket.IO connected successfully.");
        };

        // Update status when the socket disconnects.
        const handleDisconnect = (reason) => {
            setSocketConnected(false);
            console.log("Socket.IO disconnected:", reason);
        };

        // Handle connection errors.
        const handleConnectError = (err) => {
            setSocketConnected(false);
            console.error("Socket connection error:", err.message);
        };

        // Listen for new support request notifications.
        const handleNewRequest = () => {
            console.log("New support request received!");

            // Fetch the latest requests without refreshing the page.
            loadRequests(false);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on("new_support_request", handleNewRequest);

        // Remove listeners and disconnect when the page closes.
        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off("new_support_request", handleNewRequest);
            socket.disconnect();
        };
    }, [loadRequests]);

    // Update the status of a customer's support request.
    const handleStatusChange = async (requestId, status) => {
        try {
            setUpdatingId(requestId);
            setError("");

            const response = await updateSupportRequestStatus(
                requestId,
                status
            );

            setRequests((previous) =>
                previous.map((request) =>
                    request._id === requestId
                        ? { ...request, ...response.request }
                        : request
                )
            );
        } catch (err) {
            setError(err.message || "Unable to update request status.");
        } finally {
            setUpdatingId(null);
        }
    };

    // Format dates into readable local date and time.
    const formatDate = (date) => {
        if (!date) return "Date unavailable";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleString();
    };

    // Loading screen.
    if (loading) {
        return (
            <div className="support-requests-page">
                <Link
                    to="/dashboard"
                    className="back-dashboard-button"
                >
                    ← Back to Dashboard
                </Link>

                <p>Loading support requests...</p>
            </div>
        );
    }

    return (
        <div className="support-requests-page">
            <header className="support-requests-header">
                <div>
                    <h1>Support Requests</h1>
                    <p>Review customer requests for human assistance.</p>

                    {/* Actual Socket.IO connection status. */}
                    <div
                        className={`socket-connection-status ${
                            socketConnected ? "connected" : "disconnected"
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        <span className="socket-status-dot"></span>

                        {socketConnected
                            ? "Live connection active"
                            : "Live connection disconnected"}
                    </div>
                </div>

                {/* Header actions: Dashboard navigation and refresh. */}
                <div
                    className="support-requests-header-actions"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap"
                    }}
                >
                    <Link
                        to="/dashboard"
                        className="back-dashboard-button"
                    >
                        ← Back to Dashboard
                    </Link>

                    <button
                        type="button"
                        onClick={() => loadRequests()}
                        className="refresh-requests-button"
                        disabled={loading || updatingId !== null}
                    >
                        Refresh
                    </button>
                </div>
            </header>

            {error && (
                <div className="support-requests-error" role="alert">
                    {error}
                </div>
            )}

            <div className="support-requests-count">
                Total requests: <strong>{requests.length}</strong>
            </div>

            {requests.length === 0 ? (
                <div className="empty-support-requests">
                    <h3>No support requests yet</h3>
                    <p>
                        Customer requests submitted through your chatbot
                        will appear here.
                    </p>
                </div>
            ) : (
                <div className="support-requests-list">
                    {requests.map((request) => (
                        <article
                            className="support-request-card"
                            key={request._id}
                        >
                            <div className="support-request-top">
                                <div>
                                    <h3>
                                        {request.customerName ||
                                            "Unknown customer"}
                                    </h3>

                                    <p className="support-request-date">
                                        {formatDate(request.createdAt)}
                                    </p>
                                </div>

                                <span
                                    className={`support-status ${request.status}`}
                                >
                                    {request.status}
                                </span>
                            </div>

                            <div className="support-request-details">
                                <p>
                                    <strong>Contact:</strong>{" "}
                                    {request.customerContact || "Not provided"}
                                </p>

                                <p>
                                    <strong>Customer issue:</strong>
                                </p>

                                <p className="support-request-issue">
                                    {request.issue || "No issue description."}
                                </p>
                            </div>

                            <div className="support-request-summary">
                                <h4>Conversation Summary</h4>
                                <p>
                                    {request.summary ||
                                        "No conversation summary available."}
                                </p>
                            </div>

                            <div className="support-request-actions">
                                <label htmlFor={`status-${request._id}`}>
                                    Update status
                                </label>

                                <select
                                    id={`status-${request._id}`}
                                    value={request.status}
                                    onChange={(e) =>
                                        handleStatusChange(
                                            request._id,
                                            e.target.value
                                        )
                                    }
                                    disabled={updatingId === request._id}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="responded">Responded</option>
                                    <option value="closed">Closed</option>
                                </select>

                                {updatingId === request._id && (
                                    <span>Updating...</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SupportRequests;
