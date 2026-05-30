import dotenv from "dotenv";

import nodemailer from 'nodemailer';
import { connectToDB, sql } from '../dbConnection/dbconnection.js';

dotenv.config()
console.log('EMAIL_USER:', process.env.LUCAS_EMAIL);
console.log('EMAIL_PASS:',process.env.LUCAS_APP_PASS) ? 'loaded' : 'MISSING';


const otpStore = {};
const verifiedEmailStore = {};
const VERIFIED_EMAIL_TTL_MS = 30 * 60 * 1000;

const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const isEmailVerified = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const record = verifiedEmailStore[normalizedEmail];

  if (!record) return false;

  if (Date.now() > record.expires) {
    delete verifiedEmailStore[normalizedEmail];
    return false;
  }

  return true;
};

export const consumeEmailVerification = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const verified = isEmailVerified(normalizedEmail);
  if (verified) {
    delete verifiedEmailStore[normalizedEmail];
  }
  return verified;
};

export const sendOTP = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter an email address' });
    }

    const pool = await connectToDB();

    // Check if email exists in Student table
    const studentCheck = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Student WHERE StuEmail = @email');

    // Check if email exists in Organisation table
    const orgCheck = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Organisation WHERE OrgEmail = @email');

    // Check if email exists in PendingOrganisation table
    const pendingCheck = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM PendingOrganisation WHERE OrgEmail = @email');

    if (studentCheck.recordset.length > 0 || orgCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'This email is already registered' });
    }

    if (pendingCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'An application with this email is currently pending admin review' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    delete verifiedEmailStore[email];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.LUCAS_EMAIL,
        pass: process.env.LUCAS_APP_PASS
      }
    });

    await transporter.sendMail({
      from: `"SMILE" <${process.env.LUCAS_EMAIL}>`,
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
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();
  const record = otpStore[email];

  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  if (!record) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect code. Try again.' });

  delete otpStore[email];
  verifiedEmailStore[email] = { expires: Date.now() + VERIFIED_EMAIL_TTL_MS };
  res.json({ success: true, message: 'Email verified' });
};
