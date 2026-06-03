import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import route from "./routes/userRoutes.js"
import cookieParser from "cookie-parser";
import router from "./routes/adminRoute.js";
import chessRoutes from "./routes/chessRoutes.js";
import { registerChessSockets } from "./controllers/chessSocketController.js";
import documentScannerRoutes from "./routes/documentScannerRoutes.js";
const app = express();

// Configure Helmet to protect headers (XSS, Clickjacking, MIME sniffing)
// CSP is disabled to preserve inline scripts/styles and CDNs in frontend HTML files
app.use(helmet({
  contentSecurityPolicy: false
}));

// Configure Rate Limiting to prevent brute-force attacks on auth and OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // Limit each IP to 50 attempts per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes."
  }
});


app.use("/login", authLimiter);
app.use("/register/student", authLimiter);
app.use("/register/organization", authLimiter);
app.use("/api/send-otp", authLimiter);
app.use("/api/verify-otp", authLimiter);
app.use("/forgot-password", authLimiter);
app.use("/reset-password", authLimiter);

const httpServer = createServer(app);
const io = new Server(httpServer);
const __filepath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "..", "frontEnd")));

app.use(cookieParser())
app.use("/", route)
app.use("/", router)
app.use("/", chessRoutes)
app.use("/", documentScannerRoutes)
registerChessSockets(io);
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
//Lucas Bohani Maluleke and Darren Foster
