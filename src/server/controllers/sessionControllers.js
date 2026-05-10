import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = (req, res, next) => {
    try {
        // ✅ Check localStorage token sent via header (API calls)
         console.log("🍪 Cookies received:", req.cookies);
        
        const authHeader = req.headers['authorization'];
        const headerToken = authHeader && authHeader.split(' ')[1];
        const cookieToken = req.cookies?.token;

        console.log("🔑 Header token:", headerToken);
        console.log("🔑 Cookie token:", cookieToken);

        const token = headerToken || cookieToken;

        if (!token) {
            console.log("❌ No token found - redirecting to login");
            return res.redirect('/login-page');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (err) {
        console.error("❌ Token error:", err.message);

        if (err.name === 'TokenExpiredError') {

            return res.redirect('/login-page');

        }

        return res.redirect('/login-page');
    }
};