import env from "dotenv";
import fetch from "node-fetch";


env.config();

export const validateRealEmail = async (email) => {
    try {
        // Check format first
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            return {
                success: false,
                message: "Invalid email format"
            };
        }
        // Call Abstract API
        const response = await fetch(
            `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`
        );
        const data = await response.json();
        // Reject fake/undeliverable emails
        if (data.deliverability === "UNDELIVERABLE") {
            return {
                success: false,
                message: "Email does not exist"
            };
        }
        return {
            success: true
        };
    } catch (err) {
        console.log("Email validation error:", err);
        return {
            success: false,
            message: "Could not validate email"
        };
    }
};