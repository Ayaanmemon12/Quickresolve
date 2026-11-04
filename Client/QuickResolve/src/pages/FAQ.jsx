import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
    createFAQ,
    getFAQs,
    updateFAQ,
    deleteFAQ
} from "../api/faqAPI";

function FAQ() {
    const [searchParams] = useSearchParams();

    const [faqs, setFaqs] = useState([]);
    const [question, setQuestion] = useState(
        searchParams.get("question") || ""
    );
    const [answer, setAnswer] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const fetchFAQs = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getFAQs();
            setFaqs(data.faqs || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to load FAQs"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFAQs();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (!question.trim() || !answer.trim()) {
            setError("Please enter both question and answer.");
            return;
        }

        try {
            setSaving(true);

            const faqData = {
                question: question.trim(),
                answer: answer.trim()
            };

            if (editingId) {
                await updateFAQ(editingId, faqData);
                setMessage("FAQ updated successfully!");
            } else {
                await createFAQ(faqData);
                setMessage("FAQ created successfully!");
            }

            setQuestion("");
            setAnswer("");
            setEditingId(null);

            await fetchFAQs();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Something went wrong"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (faq) => {
        setEditingId(faq._id);
        setQuestion(faq.question);
        setAnswer(faq.answer);
        setError("");
        setMessage("");
    };

    const handleCancel = () => {
        setEditingId(null);
        setQuestion("");
        setAnswer("");
        setError("");
        setMessage("");
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this FAQ?"
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");

            await deleteFAQ(id);
            setMessage("FAQ deleted successfully!");

            if (editingId === id) {
                handleCancel();
            }

            await fetchFAQs();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to delete FAQ"
            );
        }
    };

    return (
        <div className="faq-page">
            <header className="faq-header">
                <div>
                    <h1>FAQ Manager</h1>
                    <p>Manage the questions your chatbot answers.</p>
                </div>

                <Link
                    to="/dashboard"
                    className="back-dashboard-button"
                >
                    ← Back to Dashboard
                </Link>
            </header>

            <section className="faq-form-card">
                <h2>{editingId ? "Edit FAQ" : "Add New FAQ"}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="faq-form-group">
                        <label htmlFor="question">Question</label>
                        <input
                            id="question"
                            type="text"
                            placeholder="Enter customer question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            maxLength={300}
                            required
                        />
                    </div>

                    <div className="faq-form-group">
                        <label htmlFor="answer">Answer</label>
                        <textarea
                            id="answer"
                            placeholder="Enter the answer"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            maxLength={2000}
                            rows={5}
                            required
                        />
                    </div>

                    {error && <p className="faq-error">{error}</p>}
                    {message && <p className="faq-success">{message}</p>}

                    <div className="faq-form-actions">
                        <button type="submit" disabled={saving}>
                            {saving
                                ? "Saving..."
                                : editingId
                                    ? "Update FAQ"
                                    : "Add FAQ"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="faq-list-section">
                <h2>Your FAQs ({faqs.length})</h2>

                {loading ? (
                    <p>Loading FAQs...</p>
                ) : faqs.length === 0 ? (
                    <p>No FAQs yet. Add your first FAQ above!</p>
                ) : (
                    <div className="faq-list">
                        {faqs.map((faq) => (
                            <div className="faq-item" key={faq._id}>
                                <h3>{faq.question}</h3>
                                <p>{faq.answer}</p>

                                <div className="faq-item-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(faq)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(faq._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default FAQ;