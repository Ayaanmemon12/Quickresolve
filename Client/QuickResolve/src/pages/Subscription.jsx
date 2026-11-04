import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getSubscription,
    updateSubscription
} from "../api/subscriptionAPI";
import "./Subscription.css";

const plans = [
    {
        id: "free",
        name: "Free",
        description: "Start building better customer relationships with AI-powered support.",
        price: "Rs 0",
        features: [
            "AI-powered customer chatbot",
            "Manage up to 10 FAQs",
            "100 customer messages per month",
            "Customer conversation history",
            "Automatic commitment detection"
        ]
    },
    {
        id: "basic",
        name: "Basic",
        description: "Expand your customer support capabilities as your business grows.",
        price: "Basic Plan",
        features: [
            "Everything included in Free",
            "Manage up to 50 FAQs",
            "1,000 customer messages per month",
            "AI-powered customer responses",
            "Customer conversation tracking",
            "Business commitment tracking"
        ]
    },
    {
        id: "pro",
        name: "Pro",
        description: "Get unlimited capacity to manage customer enquiries and support.",
        price: "Pro Plan",
        features: [
            "Everything included in Basic",
            "Unlimited FAQ management",
            "Unlimited monthly customer messages",
            "No FAQ usage restrictions",
            "No monthly message restrictions",
            "Full access to commitment tracking"
        ]
    }
];

function Subscription() {
    const [currentPlan, setCurrentPlan] = useState("free");
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingPlan, setUpdatingPlan] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const savePlanLocally = (plan) => {
        try {
            const user = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...user,
                    subscriptionPlan: plan
                })
            );
        } catch (error) {
            console.error("Unable to update local user data:", error);
        }
    };

    const loadSubscription = async () => {
        try {
            setError("");

            const response = await getSubscription();
            const plan = response.subscriptionPlan || "free";

            setCurrentPlan(plan);
            setUsage(response.usage || null);
            savePlanLocally(plan);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to load subscription information."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubscription();
    }, []);

    const handleSelectPlan = async (plan) => {
        if (plan === currentPlan) return;

        setError("");
        setSuccess("");
        setUpdatingPlan(plan);

        try {
            const response = await updateSubscription(plan);

            const updatedPlan =
                response.subscriptionPlan || plan;

            setCurrentPlan(updatedPlan);
            savePlanLocally(updatedPlan);

            const refreshedData = await getSubscription();

            const finalPlan =
                refreshedData.subscriptionPlan || updatedPlan;

            setUsage(refreshedData.usage || null);
            setCurrentPlan(finalPlan);
            savePlanLocally(finalPlan);

            setSuccess(
                `Your plan has been changed to ${finalPlan.toUpperCase()}.`
            );
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to update or refresh your subscription."
            );
        } finally {
            setUpdatingPlan("");
        }
    };

    const getRemaining = (item) => {
        if (!item) return "Unavailable";

        if (item.limit === "Unlimited") {
            return "Unlimited";
        }

        return Math.max(0, item.limit - item.used);
    };

    if (loading) {
        return (
            <div className="subscription-container">
                <p>Loading subscription information...</p>
            </div>
        );
    }

    return (
        <div className="subscription-container">
            <header className="subscription-header">
                <Link
                    to="/dashboard"
                    className="back-dashboard-button"
                >
                    ← Back to Dashboard
                </Link>

                <h1>QuickResolve Subscription</h1>
                <p>Choose the plan that suits your business.</p>
            </header>

            <div className="current-plan">
                <h3>Your Current Plan</h3>
                <h2>{currentPlan.toUpperCase()}</h2>
            </div>

            {error && (
                <p className="subscription-error">{error}</p>
            )}

            {success && (
                <p className="subscription-success">{success}</p>
            )}

            <section className="subscription-usage">
                <h2>Your Subscription Usage</h2>
                <p>
                    Monitor how much of your current plan you have used.
                </p>

                {usage ? (
                    <div className="usage-grid">
                        <div className="usage-card">
                            <h3>FAQs</h3>

                            <h2>
                                {usage.faqs.used} / {usage.faqs.limit}
                            </h2>

                            <p>
                                Remaining: {getRemaining(usage.faqs)}
                            </p>
                        </div>

                        <div className="usage-card">
                            <h3>Monthly Customer Messages</h3>

                            <h2>
                                {usage.monthlyMessages.used} /{" "}
                                {usage.monthlyMessages.limit}
                            </h2>

                            <p>
                                Remaining:{" "}
                                {getRemaining(usage.monthlyMessages)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p>Usage information is currently unavailable.</p>
                )}

                <p className="usage-note">
                    Customer message usage resets at the beginning
                    of each UTC calendar month.
                </p>
            </section>

            <div className="subscription-plans">
                {plans.map((plan) => (
                    <div
                        className={`subscription-card ${
                            currentPlan === plan.id
                                ? "selected-plan"
                                : ""
                        }`}
                        key={plan.id}
                    >
                        <h2>{plan.name}</h2>

                        <h3>{plan.price}</h3>

                        <p>{plan.description}</p>

                        <ul>
                            {plan.features.map((feature) => (
                                <li key={feature}>{feature}</li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={
                                currentPlan === plan.id ||
                                updatingPlan !== ""
                            }
                        >
                            {updatingPlan === plan.id
                                ? "Updating..."
                                : currentPlan === plan.id
                                    ? "Current Plan"
                                    : `Select ${plan.name}`}
                        </button>
                    </div>
                ))}
            </div>

            <p className="subscription-note">
                Subscription selection is currently a demonstration.
                No real payments are processed.
            </p>
        </div>
    );
}

export default Subscription;