
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authAPI";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await loginUser(formData);

            if (!data.token || !data.user) {
                throw new Error("Invalid login response from server.");
            }

            const userData = {
                ...data.user,
                subscriptionPlan:
                    data.subscriptionPlan ||
                    data.user.subscriptionPlan ||
                    "free"
            };

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(userData));

            navigate("/dashboard");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                error.message ||
                "Login failed. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h1>Welcome back</h1>
                <p>Log in to your QuickResolve account.</p>

                {error && <p className="error-message">{error}</p>}

                <label htmlFor="email">Email address</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>

                <p>
                    Don't have an account?{" "}
                    <Link to="/register">Create one</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;
