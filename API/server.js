require("dotenv").config();

const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = require("./App");
const connectDB = require("./config/db");
const User = require("./models/User");

const PORT = process.env.PORT || 5000;

// Create HTTP server using the existing Express app
const httpServer = createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Make Socket.IO accessible inside Express controllers
app.set("io", io);

// Authenticate Socket.IO connections using JWT
io.use(async (socket, next) => {
    try {
        const authToken = socket.handshake.auth?.token;

        const token =
            typeof authToken === "string"
                ? authToken.replace(/^Bearer\s+/i, "")
                : "";

        if (!token) {
            return next(new Error("Authentication required."));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            return next(new Error("User account not found."));
        }

        // Store authenticated user information
        socket.data.userId = user._id.toString();

        // Give each business owner a private notification room
        socket.join(`business:${user._id}`);

        next();

    } catch (error) {
        console.error("Socket authentication failed:", error.message);

        next(new Error("Socket authentication failed."));
    }
});

// Handle successful socket connections
io.on("connection", (socket) => {
    console.log(`User connected through Socket.IO: ${socket.data.userId}`);

    socket.on("disconnect", (reason) => {
        console.log(
            `Socket disconnected: ${socket.data.userId}`,
            reason
        );
    });
});

// Start the application
const startServer = async () => {
    try {
        await connectDB();

        httpServer.listen(PORT, () => {
            console.log(`QuickResolve server running on port ${PORT}`);
            console.log("Socket.IO server is ready!");
        });

    } catch (error) {
        console.error(
            "Server startup failed because the database is unavailable.",
            error.message
        );

        process.exit(1);
    }
};

startServer();