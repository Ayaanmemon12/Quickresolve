
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/support-requests",
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 15000
});

// Attach the logged-in owner's token.
const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Please log in to continue.");
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

// Customer submits a human support request.
export const createSupportRequest = async (
    publicId,
    requestData
) => {
    if (!publicId || typeof publicId !== "string") {
        throw new Error("A valid chatbot ID is required.");
    }

    try {
        const response = await API.post(
            `/public/${encodeURIComponent(publicId)}`,
            requestData
        );

        return response.data;
    } catch (error) {
        console.error("Submit support request error:", error.message);

        if (error.response) {
            throw new Error(
                error.response.data?.message ||
                "Unable to submit your support request."
            );
        }

        if (error.code === "ECONNABORTED") {
            throw new Error("The request timed out. Please try again.");
        }

        throw new Error("Unable to connect to the server.");
    }
};

// Owner loads their business support requests.
export const getSupportRequests = async () => {
    try {
        const response = await API.get("/", getAuthConfig());
        return response.data;
    } catch (error) {
        console.error("Load support requests error:", error.message);

        if (error.response) {
            throw new Error(
                error.response.data?.message ||
                "Unable to load support requests."
            );
        }

        throw new Error("Unable to connect to the server.");
    }
};

// Owner changes a request's status.
export const updateSupportRequestStatus = async (
    requestId,
    status
) => {
    if (!requestId || !status) {
        throw new Error("A valid request ID and status are required.");
    }

    try {
        const response = await API.patch(
            `/${encodeURIComponent(requestId)}/status`,
            { status },
            getAuthConfig()
        );

        return response.data;
    } catch (error) {
        console.error("Update support request error:", error.message);

        if (error.response) {
            throw new Error(
                error.response.data?.message ||
                "Unable to update support request."
            );
        }

        throw new Error("Unable to connect to the server.");
    }
};
