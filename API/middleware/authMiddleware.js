
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;


        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. Please log in."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Authentication token is missing."
            });
        }


        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Confirm that the user still exists
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "User account no longer exists."
            });
        }

        // Make the authenticated user available to the route
        req.user = user;

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token. Please log in again."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            message: "Authentication could not be completed."
        });
    }
};

module.exports = { protect };
