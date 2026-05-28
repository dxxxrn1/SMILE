import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import nodemailer from "nodemailer";

const createSmileMailTransport = () => {
    if (!process.env.LUCAS_EMAIL || !process.env.LUCAS_APP_PASS) {
        throw new Error("SMILE email credentials are missing. Check LUCAS_EMAIL and LUCAS_APP_PASS in .env.");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.LUCAS_EMAIL,
            pass: process.env.LUCAS_APP_PASS
        }
    });
};

// POST /api/newsletter/subscribe
export const subscribeToNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address." });
        }

        const pool = await connectToDB();

        // Check if already subscribed
        const check = await pool.request()
            .input("Email", sql.VarChar, email)
            .query("SELECT Id FROM NewsletterSubscriptions WHERE Email = @Email");

        if (check.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "This email address is already subscribed!" });
        }

        // Insert into database
        await pool.request()
            .input("Email", sql.VarChar, email)
            .query("INSERT INTO NewsletterSubscriptions (Email) VALUES (@Email)");

        console.log(`✉️ New newsletter subscriber: ${email}`);

        // Send Welcome Email
        try {
            const transport = createSmileMailTransport();
            await transport.sendMail({
                from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
                to: email,
                subject: "✨ Welcome to the SMILE Newsletter!",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h2 style="color: #ec4899; margin: 0 0 8px; font-weight: 800; font-size: 24px;">SMILE PLATFORM</h2>
                            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Empowering South African Youth</p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;">
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #f8fafc; margin-bottom: 16px;">
                            Hi there,
                        </p>
                        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
                            Thank you for subscribing to our newsletter! You've taken an exciting step toward unlocking your full potential. 
                            From now on, you will receive the latest high-impact opportunities, learning paths, bootcamps, and career advice directly in your inbox.
                        </p>

                        <div style="background: rgba(236, 72, 153, 0.05); border-left: 4px solid #ec4899; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <h4 style="margin: 0 0 6px; color: #f8fafc; font-size: 15px; font-weight: 600;">🚀 What's Next?</h4>
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                                While you wait for our next issue, make sure to log in to your dashboard to view active opportunities, access career advice via our AI bot, and discover opportunities near you!
                            </p>
                        </div>

                        <div style="text-align: center; margin: 32px 0 16px;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/login-page" 
                               style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.2);">
                               Explore SMILE Now
                            </a>
                        </div>

                        <hr style="border: none; border-top: 1px solid #334155; margin: 28px 0 16px;">
                        <p style="color: #64748b; font-size: 11px; text-align: center; line-height: 1.4; margin: 0;">
                            You received this email because you subscribed to the SMILE newsletter.<br>
                            If you'd like to unsubscribe, click <a href="#" style="color: #ec4899; text-decoration: none;">here</a>.
                        </p>
                    </div>
                `
            });
            console.log(`📧 Newsletter welcome email sent to ${email}`);
        } catch (emailErr) {
            console.error("Newsletter email failed (non-fatal):", emailErr.message);
        }

        return res.status(200).json({ success: true, message: "Thank you for subscribing!" });

    } catch (err) {
        console.error("subscribeToNewsletter error:", err);
        return res.status(500).json({ success: false, message: "Failed to subscribe. Please try again later." });
    }
};
