import axios from "axios";

const API_URL = "http://localhost:5000/api/conversations";

// Helper to get auth headers with JWT token
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

// Fetch all conversations for the business owner
export const getConversations = async () => {
    try {
        const response = await axios.get(API_URL, getAuthHeaders());
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Failed to fetch conversations" };
    }
};

export const getSupportGaps = async () => {
    try {
        const response = await axios.get(
            `${API_URL}/support-gaps`,
            getAuthHeaders()
        );

        return response.data;
    } catch (error) {
        console.error(
            "Get support gaps error:",
            error.response?.data || error.message
        );

        throw error.response?.data || {
            message: "Failed to fetch support gaps."
        };
    }
};
