
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/commitments",
    headers: {
        "Content-Type": "application/json"
    }
});

const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Please log in first.");
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

// Get all commitments belonging to the logged-in business.
export const getCommitments = async () => {
    const response = await API.get("/", getAuthConfig());
    return response.data;
};

// Approve or ignore a detected commitment.
export const reviewCommitment = async (commitmentId, data) => {
    const response = await API.patch(
        `/${commitmentId}/review`,
        data,
        getAuthConfig()
    );

    return response.data;
};

// Mark an approved commitment as completed.
export const completeCommitment = async (commitmentId) => {
    const response = await API.patch(
        `/${commitmentId}/complete`,
        {},
        getAuthConfig()
    );

    return response.data;
};
