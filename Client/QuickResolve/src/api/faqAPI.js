
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/faqs",
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


export const createFAQ = async (faqData) => {
    const response = await API.post(
        "/",
        faqData,
        getAuthConfig()
    );

    return response.data;
};


export const getFAQs = async () => {
    const response = await API.get(
        "/",
        getAuthConfig()
    );

    return response.data;
};

export const updateFAQ = async (id, faqData) => {
    const response = await API.put(
        `/${id}`,
        faqData,
        getAuthConfig()
    );

    return response.data;
};


export const deleteFAQ = async (id) => {
    const response = await API.delete(
        `/${id}`,
        getAuthConfig()
    );

    return response.data;
};
