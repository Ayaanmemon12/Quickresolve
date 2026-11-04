
const express = require("express");
const cors = require("cors");

const protect = require("./middleware/authMiddleware").protect;

const authRoutes = require("./routes/authRoutes");
const faqRoutes = require("./routes/faqRoutes");
const businessRoutes = require("./routes/businessRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const supportRequestRoutes = require("./routes/supportRequestRoutes");
const commitmentRoutes = require("./routes/commitmentRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/support-requests", supportRequestRoutes);
app.use("/api/commitments", commitmentRoutes);
app.use("/api/subscription", subscriptionRoutes);


app.get("/", (req, res) => {
    res.send("QuickResolve API is running!");
});

app.get("/api/auth/me", protect, (req, res) => {
    res.status(200).json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
        }
    });
});

module.exports = app;
