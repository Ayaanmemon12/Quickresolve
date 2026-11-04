import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupportGaps } from "../api/conversationAPI";

function BackToDashboard() {
    return (
        <Link to="/dashboard" className="back-dashboard-button">
            ← Back to Dashboard
        </Link>
    );
}

function SupportGapsPage() {
    const [gaps, setGaps] = useState([]);
    const [totalGaps, setTotalGaps] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadSupportGaps = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getSupportGaps();

                if (cancelled) return;

                setGaps(Array.isArray(response.gaps) ? response.gaps : []);
                setTotalGaps(response.totalGaps || 0);
                setTotalQuestions(response.totalPotentialQuestions || 0);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message || "Unable to load Support Gap Radar."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadSupportGaps();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="support-gaps-page">
                <BackToDashboard />
                <p>Loading Support Gap Radar...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="support-gaps-page">
                <BackToDashboard />
                <h2>Support Gap Radar</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="support-gaps-page">
            <BackToDashboard />

            <h1>Support Gap Radar</h1>
            <p>Discover customer questions that may need new FAQs.</p>

            <div className="support-gap-stats">
                <div className="support-gap-card">
                    <h3>Potential FAQ Gaps</h3>
                    <h2>{totalGaps}</h2>
                </div>

                <div className="support-gap-card">
                    <h3>Customer Questions</h3>
                    <h2>{totalQuestions}</h2>
                </div>
            </div>

            <h2>Frequently Asked Unlisted Questions</h2>

            {gaps.length === 0 ? (
                <p>
                    No potential FAQ gaps found yet. Customer questions
                    handled by Gemini or fallback will appear here.
                </p>
            ) : (
                <div className="support-gap-list">
                    {gaps.map((gap, index) => (
                        <div
                            className="support-gap-item"
                            key={`${gap.question}-${index}`}
                        >
                            <div>
                                <strong>{gap.question}</strong>
                                <p>
                                    Last asked:{" "}
                                    {gap.lastAsked
                                        ? new Date(gap.lastAsked).toLocaleString()
                                        : "Unknown"}
                                </p>
                            </div>

                            <div>
                                <span>
                                    Asked {gap.count}{" "}
                                    {gap.count === 1 ? "time" : "times"}
                                </span>

                                <Link
                                    to={`/faqs?question=${encodeURIComponent(gap.question)}`}
                                >
                                    Add to FAQs →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SupportGapsPage;