import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getBusinessProfile,
    saveBusinessProfile
} from "../api/businessAPI";
import "./Business.css";

function BackToDashboard() {
    return (
        <Link
            to="/dashboard"
            className="back-dashboard-button"
        >
            ← Back to Dashboard
        </Link>
    );
}

function Business() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [publicId, setPublicId] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [copyMessage, setCopyMessage] = useState("");

    useEffect(() => {
        const loadBusiness = async () => {
            try {
                const response = await getBusinessProfile();

                setName(response.business.name || "");
                setDescription(response.business.description || "");
                setPublicId(response.business.publicId || "");
            } catch (err) {
                if (err.response?.status !== 404) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load your business profile."
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        loadBusiness();
    }, []);

    const handleCopyLink = async () => {
        if (!publicId) return;

        const chatbotUrl =
            `${window.location.origin}/chatbot/${encodeURIComponent(publicId)}`;

        setCopyMessage("");

        try {
            await navigator.clipboard.writeText(chatbotUrl);
            setCopyMessage("Chatbot link copied successfully!");
        } catch (err) {
            setCopyMessage(
                "Unable to copy automatically. Please copy the link manually."
            );
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");
        setCopyMessage("");

        if (!name.trim()) {
            setError("Please enter your business name.");
            return;
        }

        try {
            setSaving(true);

            const response = await saveBusinessProfile({
                name: name.trim(),
                description: description.trim()
            });

            setName(response.business.name || "");
            setDescription(response.business.description || "");
            setPublicId(response.business.publicId || "");

            setMessage(
                response.message || "Business profile saved successfully."
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to save business profile."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="business-page">
                <div className="business-card">
                    <BackToDashboard />
                    <p>Loading business profile...</p>
                </div>
            </div>
        );
    }

    const chatbotUrl = publicId
        ? `${window.location.origin}/chatbot/${encodeURIComponent(publicId)}`
        : "";

    return (
        <div className="business-page">
            <div className="business-card">
                <BackToDashboard />

                <h1>Business Profile</h1>
                <p>Tell us a little about your business.</p>

                {publicId && (
                    <div className="business-public-id">
                        <label>Your Public Chatbot Link</label>

                        <p
                            style={{
                                wordBreak: "break-all",
                                marginTop: "10px"
                            }}
                        >
                            {chatbotUrl}
                        </p>

                        <button
                            type="button"
                            onClick={handleCopyLink}
                        >
                            Copy Chatbot Link
                        </button>

                        {copyMessage && (
                            <small
                                style={{
                                    display: "block",
                                    marginTop: "10px"
                                }}
                                role="status"
                            >
                                {copyMessage}
                            </small>
                        )}

                        <small>
                            Share this link in your Instagram bio,
                            WhatsApp, Facebook, or website.
                        </small>
                    </div>
                )}

                {error && (
                    <div className="business-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="business-success">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="business-form-group">
                        <label htmlFor="businessName">
                            Business Name
                        </label>

                        <input
                            id="businessName"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            placeholder="e.g. Ali's Electronics"
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="business-form-group">
                        <label htmlFor="businessDescription">
                            Business Description (Optional)
                        </label>

                        <textarea
                            id="businessDescription"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Tell customers what your business offers..."
                            maxLength={500}
                            rows={5}
                        />
                    </div>

                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Business Profile"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Business;