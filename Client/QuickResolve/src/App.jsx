
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import FAQ from "./pages/FAQ";
import Chatbot from "./pages/Chatbot";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Business from "./pages/business";
import ConversationsPage from "./pages/ConversationsPage";
import SupportGapsPage from "./pages/SupportGapsPage";
import SupportRequests from "./pages/SupportRequests";
import CommitmentTracker from "./pages/CommitmentTracker";
import Subscription from "./pages/Subscription";

import "./App.css";

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/register" replace />}
                />

                <Route path="/register" element={<Register />} />

                <Route path="/login" element={<Login />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/subscription"
                    element={
                        <ProtectedRoute>
                            <Subscription />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/faqs"
                    element={
                        <ProtectedRoute>
                            <FAQ />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/conversations"
                    element={
                        <ProtectedRoute>
                            <ConversationsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/support-gaps"
                    element={
                        <ProtectedRoute>
                            <SupportGapsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/support-requests"
                    element={
                        <ProtectedRoute>
                            <SupportRequests />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/commitments"
                    element={
                        <ProtectedRoute>
                            <CommitmentTracker />
                        </ProtectedRoute>
                    }
                />

                {/* Public chatbot route */}
                <Route
                    path="/chatbot/:publicId"
                    element={<Chatbot />}
                />

                {/* Protected internal chatbot route */}
                <Route
                    path="/chatbot"
                    element={
                        <ProtectedRoute>
                            <Chatbot />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/business"
                    element={
                        <ProtectedRoute>
                            <Business />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={<Navigate to="/register" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
