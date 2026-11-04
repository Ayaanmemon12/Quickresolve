
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/subscription",
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

export const getSubscription = async () => {
    const response = await API.get("/", getAuthConfig());
    return response.data;
};

export const updateSubscription = async (plan) => {
    const response = await API.put(
        "/",
        { plan },
        getAuthConfig()
    );

    return response.data;
};
