import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    getCommitments,
    reviewCommitment,
    completeCommitment
} from "../api/commitmentAPI";

import "./CommitmentTracker.css";

function CommitmentTracker() {
    const [commitments, setCommitments] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [success, setSuccess] = useState("");
    const [processingId, setProcessingId] = useState("");

    // Load commitments from the backend.
    const loadCommitments = async (isRefresh = false) => {
        try {
            setError("");

            // Show refresh feedback without hiding the existing page.
            if (isRefresh) {
                setRefreshing(true);
            }

            const response = await getCommitments();

            const items = Array.isArray(response.commitments)
                ? response.commitments
                : [];

            setCommitments(items);

            // Prepare editable drafts for each commitment.
            const initialDrafts = {};

            items.forEach((item) => {
                initialDrafts[item._id] = {
                    description: item.description || "",
                    dueAt: item.dueAt
                        ? item.dueAt.slice(0, 10)
                        : ""
                };
            });

            setDrafts(initialDrafts);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load commitments."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load commitments when the page first opens.
    useEffect(() => {
        loadCommitments();
    }, []);

    // Update description or deadline in the form.
    const handleDraftChange = (id, field, value) => {
        setDrafts((previous) => ({
            ...previous,
            [id]: {
                ...previous[id],
                [field]: value
            }
        }));
    };

    // Approve or ignore a commitment.
    const handleReview = async (commitment, status) => {
        const id = commitment._id;
        const draft = drafts[id];

        if (status === "approved") {
            if (!draft?.description?.trim()) {
                setActionError("Please enter a commitment description.");
                return;
            }

            if (draft.description.trim().length > 500) {
                setActionError("Description cannot exceed 500 characters.");
                return;
            }

            if (draft.dueAt) {
                const deadline = new Date(
                    `${draft.dueAt}T23:59:00`
                );

                if (
                    Number.isNaN(deadline.getTime()) ||
                    deadline <= new Date()
                ) {
                    setActionError("Please select a future deadline.");
                    return;
                }
            }
        }

        try {
            setProcessingId(id);
            setActionError("");
            setSuccess("");

            const data = {
                reviewStatus: status
            };

            if (status === "approved") {
                data.description = draft.description.trim();

                if (draft.dueAt) {
                    data.dueAt = new Date(
                        `${draft.dueAt}T23:59:00`
                    ).toISOString();
                }
            }

            const response = await reviewCommitment(id, data);

            setSuccess(
                response.message ||
                `Commitment ${status} successfully.`
            );

            await loadCommitments();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                err.message ||
                "Unable to update commitment."
            );
        } finally {
            setProcessingId("");
        }
    };

    // Mark an approved commitment as completed.
    const handleComplete = async (id) => {
        try {
            setProcessingId(id);
            setActionError("");
            setSuccess("");

            const response = await completeCommitment(id);

            setSuccess(
                response.message ||
                "Commitment marked as completed."
            );

            await loadCommitments();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                err.message ||
                "Unable to complete commitment."
            );
        } finally {
            setProcessingId("");
        }
    };

    // Separate commitments according to their status.
    const pendingCommitments = commitments.filter(
        (item) => item.reviewStatus === "pending_review"
    );

    const approvedCommitments = commitments.filter(
        (item) =>
            item.reviewStatus === "approved" &&
            item.taskStatus === "pending"
    );

    const completedCommitments = commitments.filter(
        (item) =>
            item.reviewStatus === "approved" &&
            item.taskStatus === "completed"
    );

    const ignoredCommitments = commitments.filter(
        (item) => item.reviewStatus === "ignored"
    );

    // Format dates for display.
    const formatDate = (date) => {
        if (!date) return "No deadline";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleDateString();
    };

    // Display the original chatbot message that triggered a commitment.
    const renderCommitmentMessage = (item) => (
        <div className="commitment-message">
            <p className="commitment-label">Detected chatbot message</p>
            <p>{item.sourceMessage}</p>
        </div>
    );

    // Render commitments waiting for approval.
    const renderPendingCard = (item) => (
        <div className="commitment-card" key={item._id}>
            {renderCommitmentMessage(item)}

            <div className="commitment-form">
                <label htmlFor={`description-${item._id}`}>
                    Commitment Description
                </label>

                <textarea
                    id={`description-${item._id}`}
                    value={drafts[item._id]?.description || ""}
                    maxLength={500}
                    onChange={(e) =>
                        handleDraftChange(
                            item._id,
                            "description",
                            e.target.value
                        )
                    }
                    placeholder="Edit the commitment description..."
                    rows={3}
                />

                <label htmlFor={`deadline-${item._id}`}>
                    Deadline (Optional)
                </label>

                <input
                    id={`deadline-${item._id}`}
                    type="date"
                    value={drafts[item._id]?.dueAt || ""}
                    onChange={(e) =>
                        handleDraftChange(
                            item._id,
                            "dueAt",
                            e.target.value
                        )
                    }
                />
            </div>

            <div className="commitment-actions">
                <button
                    className="commitment-approve-btn"
                    disabled={processingId === item._id}
                    onClick={() => handleReview(item, "approved")}
                >
                    {processingId === item._id
                        ? "Please wait..."
                        : "Approve"}
                </button>

                <button
                    className="commitment-ignore-btn"
                    disabled={processingId === item._id}
                    onClick={() => handleReview(item, "ignored")}
                >
                    Ignore
                </button>
            </div>
        </div>
    );

    // Render approved commitments that are still pending.
    const renderApprovedCard = (item) => (
        <div className="commitment-card" key={item._id}>
            <p className="commitment-description">
                {item.description}
            </p>

            {renderCommitmentMessage(item)}

            <p className="commitment-deadline">
                <strong>Deadline:</strong> {formatDate(item.dueAt)}
            </p>

            <button
                className="commitment-complete-btn"
                disabled={processingId === item._id}
                onClick={() => handleComplete(item._id)}
            >
                {processingId === item._id
                    ? "Please wait..."
                    : "Mark as Completed"}
            </button>
        </div>
    );

    // Render completed commitments.
    const renderCompletedCard = (item) => (
        <div className="commitment-card" key={item._id}>
            <p className="commitment-description">
                {item.description}
            </p>

            <p className="commitment-deadline">
                <strong>Deadline:</strong> {formatDate(item.dueAt)}
            </p>

            <p className="commitment-completed-date">
                Completed on: {formatDate(item.completedAt)}
            </p>

            <span className="commitment-status">
                Completed
            </span>
        </div>
    );

    return (
        <div className="commitment-page">
            <header className="commitment-header">
                <div>
                    <h1>Commitment Tracker</h1>
                    <p>
                        Manage promises made by your chatbot
                        and track business follow-ups.
                    </p>
                </div>

                {/* Dashboard navigation and refresh buttons. */}
                <div className="commitment-header-actions">
                    <Link
                        to="/dashboard"
                        className="commitment-back-btn"
                    >
                        ← Back to Dashboard
                    </Link>

                    <button
                        type="button"
                        onClick={() => loadCommitments(true)}
                        disabled={loading || refreshing}
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </header>

            <div className="commitment-summary">
                <div className="commitment-summary-card">
                    <h3>{pendingCommitments.length}</h3>
                    <p>Pending Review</p>
                </div>

                <div className="commitment-summary-card">
                    <h3>{approvedCommitments.length}</h3>
                    <p>Active Tasks</p>
                </div>

                <div className="commitment-summary-card">
                    <h3>{completedCommitments.length}</h3>
                    <p>Completed</p>
                </div>

                <div className="commitment-summary-card">
                    <h3>{ignoredCommitments.length}</h3>
                    <p>Ignored</p>
                </div>
            </div>

            <div className="commitment-notifications">
                {error && (
                    <p className="commitment-error">{error}</p>
                )}

                {actionError && (
                    <p className="commitment-error">{actionError}</p>
                )}

                {success && (
                    <p className="commitment-success">{success}</p>
                )}
            </div>

            <div className="commitment-toolbar">
                <h2>Your Commitments</h2>
            </div>

            {loading ? (
                <p className="commitment-empty">
                    Loading commitments...
                </p>
            ) : (
                <>
                    <section className="commitment-section">
                        <h2>
                            Pending Review ({pendingCommitments.length})
                        </h2>

                        {pendingCommitments.length === 0 ? (
                            <p className="commitment-empty">
                                No commitments waiting for review.
                            </p>
                        ) : (
                            <div className="commitment-grid">
                                {pendingCommitments.map(renderPendingCard)}
                            </div>
                        )}
                    </section>

                    <section className="commitment-section">
                        <h2>
                            Approved Tasks ({approvedCommitments.length})
                        </h2>

                        {approvedCommitments.length === 0 ? (
                            <p className="commitment-empty">
                                No active tasks right now.
                            </p>
                        ) : (
                            <div className="commitment-grid">
                                {approvedCommitments.map(renderApprovedCard)}
                            </div>
                        )}
                    </section>

                    <section className="commitment-section">
                        <h2>
                            Completed Tasks ({completedCommitments.length})
                        </h2>

                        {completedCommitments.length === 0 ? (
                            <p className="commitment-empty">
                                No completed tasks yet.
                            </p>
                        ) : (
                            <div className="commitment-grid">
                                {completedCommitments.map(renderCompletedCard)}
                            </div>
                        )}
                    </section>

                    <section className="commitment-section">
                        <h2>
                            Ignored Commitments ({ignoredCommitments.length})
                        </h2>

                        {ignoredCommitments.length === 0 ? (
                            <p className="commitment-empty">
                                No ignored commitments.
                            </p>
                        ) : (
                            <div className="commitment-grid">
                                {ignoredCommitments.map((item) => (
                                    <div
                                        className="commitment-card"
                                        key={item._id}
                                    >
                                        {renderCommitmentMessage(item)}

                                        <span className="commitment-status">
                                            Ignored
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default CommitmentTracker;