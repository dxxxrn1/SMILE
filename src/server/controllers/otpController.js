import dotenv from "dotenv";

import nodemailer from 'nodemailer';
import { connectToDB, sql } from '../dbConnection/dbconnection.js';

dotenv.config()
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'loaded' : 'MISSING ❌');

const otpStore = {};

export const sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const pool = await connectToDB();

    // Check if email exists in Student table
    const studentCheck = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Student WHERE StuEmail = @email');

    // Check if email exists in Organisation table
    const orgCheck = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Organisation WHERE OrgEmail = @email');

    if (studentCheck.recordset.length > 0 || orgCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'This email is already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"SMILE" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your SMILE verification code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#333;">Verify your email</h2>
          <p style="color:#555;">Use the code below to complete your SMILE registration:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0;">
            ${otp}
          </div>
          <p style="color:#999;font-size:12px;">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent' });

  } catch (err) {
    console.error('sendOTP error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

export const verifyOTP = (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect code. Try again.' });

  delete otpStore[email];
  res.json({ success: true, message: 'Email verified' });
};