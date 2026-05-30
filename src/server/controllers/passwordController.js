import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { connectToDB, sql } from "../dbConnection/dbconnection.js"; // ✅ fixed

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {

        user: process.env.LUCAS_EMAIL,

        pass: process.env.LUCAS_APP_PASS

    }

});

// STEP 1 — User submits their email
export const forgotPassword = async (req, res) => {
    try {
        const { email, accountType } = req.body;

        if (!email || !accountType) {
            return res.status(400).json({ message: "Email and account type are required" });
        }

        const pool = await connectToDB();

        // Check which table to look in
        const table = accountType === "student" ? "Student" : "Organisation";

        const emailCol = accountType === "student" ? "StuEmail" : "OrgEmail";

        const result = await pool
            .request()
            .input("email", sql.VarChar, email)
            .query(`SELECT * FROM ${table} WHERE ${emailCol} = @email`);

        // Always return success even if email not found — security best practice
        if (result.recordset.length === 0) {
            return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");

        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const idCol = accountType === "student" ? "StuID" : "OrgId";

        const userId = result.recordset[0][idCol];

        // Save token to DB
        await pool
            .request()
            .input("token", sql.VarChar, token)
            .input("expiry", sql.DateTime, expiry)
            .input("id", sql.Int, userId)
            .query(`UPDATE ${table} SET ResetToken = @token, ResetTokenExpiry = @expiry WHERE ${idCol} = @id`);

        // Send email
        const resetLink = `http://localhost:3000/reset-password?token=${token}&type=${accountType}`;

        await transporter.sendMail({
            from: process.env.LUCAS_EMAIL,
            to: email,
            subject: "SMILE - Password Reset Request",
            html: `
                <h2>Password Reset</h2>
                <p>You requested a password reset for your SMILE account.</p>
                <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                <a href="${resetLink}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
                    Reset Password
                </a>
                <p>If you did not request this, ignore this email.</p>
            `
        });

        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });

    } catch (err) {

        console.error("❌ Forgot password error:", err);

        return res.status(500).json({ message: "Something went wrong" });

    }
};

// STEP 2 — User submits new password
export const resetPassword = async (req, res) => {
    try {
        const { token, accountType, newPassword } = req.body;

        if (!token || !accountType || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const pool = await connectToDB();

        const table = accountType === "student" ? "Student" : "Organisation";
        const idCol = accountType === "student" ? "StuID" : "OrgId";
        const passwordCol = accountType === "student" ? "StuPassword" : "Password";

        // Find user by token and check expiry
        const result = await pool
            .request()
            .input("token", sql.VarChar, token)
            .query(`SELECT * FROM ${table} WHERE ResetToken = @token`);

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: "Invalid or expired reset link" });
        }

        const user = result.recordset[0];

        // Check token hasn't expired
        if (new Date() > new Date(user.ResetTokenExpiry)) {
            return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear token
        await pool
            .request()
            .input("password", sql.VarChar, hashedPassword)
            .input("id", sql.Int, user[idCol])
            .query(`
                UPDATE ${table} 
                SET ${passwordCol} = @password, ResetToken = NULL, ResetTokenExpiry = NULL 
                WHERE ${idCol} = @id
            `);

        return res.status(200).json({ message: "Password reset successful" });

    } catch (err) {

        console.error("❌ Reset password error:", err);

        return res.status(500).json({ message: "Something went wrong" });

    }
};