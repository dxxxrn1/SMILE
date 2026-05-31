import { rmSync } from "node:fs";
import fs from "fs";
import path from "path";
import {sql , connectToDB} from "../dbConnection/dbconnection.js";
import bcrypt from "bcryptjs";
import nodemailer from  "nodemailer";
import { error } from "node:console";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { validateRealEmail } from "../utils/validateEmail.js";
import { consumeEmailVerification, isEmailVerified } from "./otpController.js";

dotenv.config();

export const saveStudentDetails = async (req, res) => {
    console.log("The request is received!!")
    try {
        const { firstName, lastName, email, province, educationLevel, password } = req.body;
        if (!firstName || !lastName || !email || !province || !educationLevel || !password) {
            return res.sendStatus(400);
        }

        // Validate real email before continuing
        const emailValidation = await validateRealEmail(email);

        if (!emailValidation.success) {
            return res.status(400).json({
                message: emailValidation.message
            });
        }

        const pool = await connectToDB();
        console.log("the database is connected!!")
        // Check if email already exists
        console.log("connected, about to SELECT");
        const results = await pool
            .request()
            .input("email", sql.VarChar, email)
            .query(`SELECT * FROM Student WHERE StuEmail = @email`);

        if (results.recordset.length > 0) {
            return res.sendStatus(403);
        }
        console.log(" about to hash password");
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool
        .request()
        .input("firstname", sql.VarChar, firstName)
        .input("lastname", sql.VarChar, lastName)
        .input("email", sql.VarChar, email)
        .input("province", sql.VarChar, province)
        .input("educationlevel", sql.VarChar, educationLevel)
        .input("password", sql.VarChar, hashedPassword)
        .query(`
            INSERT INTO Student(StuName, StuLastName, StuEmail, StuProvince, StuEducationLevel, StuPassword)
            VALUES(@firstname, @lastname, @email, @province, @educationlevel, @password)
        `);

        

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.LUCAS_EMAIL,
                pass: process.env.LUCAS_APP_PASS
            }
        });

        const mailOptions = {
            from: process.env.LUCAS_EMAIL,
            to: email,
            subject: "Registration Received",
            text: "You have successfully registered on SMILE!"
        };
        try {
            await transport.sendMail(mailOptions);
            console.log("Email sent successfully");
        } catch (emailError) {
            console.log("Email failed but user was still registered:", emailError);
        }

        return res.sendStatus(201);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// export const saveOrganisationDetails = async(req,res)=>{
//     try{
//         console.log("Saving org details");
//         const strengthOfpassWord = 10;

//         const {orgName,orgEmail,orgType,orgProvince,password} = req.body;

//         if(!orgName || !orgEmail || !orgType || !orgProvince || !orgProvince || !password){
//             console.log("The organisation did not enter full details");
//             return res.status(400).json({
//                  message:"Please enter all the details"
//             })

//         }

//         // Validate real email before continuing
//         const emailValidation = await validateRealEmail(email);

//         if (!emailValidation.success) {
//             return res.status(400).json({
//                 message: emailValidation.message
//             });
//         }

//         const pool = await connectToDB();

//         console.log("connected, about to SELECT");
//         const results = await pool
//         .request()
//         .input("email" , sql.VarChar , orgEmail)
//         .query(`
//             SELECT * FROM Organisation WHERE OrgEmail = @email;
//         `)
//         console.log("SELECT done, rows:", results.recordset.length);

//         if(results.recordset.length > 0){
//             return res.status(403);
//         }
//         console.log("about to hash password");

//         const hashedPassword = await bcrypt.hash(password , strengthOfpassWord);

//         await pool
//         .request()
//         .input("orgname" , sql.VarChar , orgName)
//         .input("orgemail" ,  sql.VarChar , orgEmail)
//         .input("orgtype" , sql.VarChar , orgType)
//         .input("orgprovince" , sql.VarChar , orgProvince)
//         .input("orgpassword" , sql.VarChar , hashedPassword)
//         .query(`
//             INSERT INTO Organisation(OrgName,OrgEmail,Type,Province,Password)
//             VALUES(@orgname,@orgemail,@orgtype,@orgprovince,@orgpassword)
//         `)

//         console.log("INSERT successful");

//         const transport = nodemailer.createTransport({
//             service:"gmail",
//             auth:{
//                 user:`${process.env.LUCAS_EMAIL}`,
//                 pass:`${process.env.LUCAS_APP_PASS}`
//             }
//         })

//         const mailOptions = {
//             from:`${process.env.LUCAS_EMAIL}`,
//             to:`${orgEmail}`,
//             subject: "Registration Received",
//             text: "You have successfully registered on SMILE!"
//         }


//         try {
//             await transport.sendMail(mailOptions);
//             console.log("Email sent successfully");
//         } catch (emailError) {
//             console.log("Email failed but user was still registered:", emailError);
//         }

//         console.log("Successfully registered the organisation!!!");

//         return res.sendStatus(201);

//     }catch(err){
//         console.log(err);
//         return res.status(500).json({
//             message: "Opps something went wrong!!!!"
//         });
//     }
// }

export const saveOrganisationDetails = async (req, res) => {
  try {
    const {
      orgName,
      orgEmail,
      orgType,
      orgProvince,
      password,
      orgDocumentBase64,
      orgDocumentName,
    } = req.body;

    const normalizedOrgEmail = orgEmail?.trim().toLowerCase();

    if (!orgName || !normalizedOrgEmail || !orgType || !orgProvince || !password || !orgDocumentBase64) {
      return res.status(400).json({
        message: "Please enter all the details and upload your NPO/registration document.",
      });
    }

    if (!isEmailVerified(normalizedOrgEmail)) {
      return res.status(403).json({
        message: "Please verify your organisation email before submitting your application.",
      });
    }

    const emailValidation = await validateRealEmail(normalizedOrgEmail);
    if (!emailValidation.success) {
      return res.status(400).json({ message: emailValidation.message });
    }

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.LUCAS_EMAIL,
        pass: process.env.LUCAS_APP_PASS,
      },
    });

    const pool = await connectToDB();

    const existingOrg = await pool
      .request()
      .input("email", sql.VarChar, normalizedOrgEmail)
      .query("SELECT OrgId FROM Organisation WHERE OrgEmail = @email");

    const existingPending = await pool
      .request()
      .input("email", sql.VarChar, normalizedOrgEmail)
      .query("SELECT PendingId FROM PendingOrganisation WHERE OrgEmail = @email");

    if (existingOrg.recordset.length > 0) {
      return res.status(403).json({ message: "This email is already registered." });
    }

    if (existingPending.recordset.length > 0) {
      return res.status(403).json({
        message: "An application with this email is currently pending admin review.",
      });
    }

    let documentUrlPath = null;
    if (orgDocumentBase64.startsWith("data:")) {
      const matches = orgDocumentBase64.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1].toLowerCase();
        const base64Data = matches[2];

        let ext = "pdf";
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
        else if (mimeType.includes("png")) ext = "png";

        const safeDocumentName = String(orgDocumentName || "document")
          .replace(/[^a-z0-9._-]/gi, "_")
          .slice(0, 80);
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `org_doc_${Date.now()}_${safeDocumentName}.${ext}`;
        const docDir = path.join(process.cwd(), "src", "frontEnd", "Assets", "uploads", "documents");

        if (!fs.existsSync(docDir)) {
          fs.mkdirSync(docDir, { recursive: true });
        }

        fs.writeFileSync(path.join(docDir, fileName), buffer);
        documentUrlPath = `/Assets/uploads/documents/${fileName}`;
      }
    }

    if (!documentUrlPath) {
      return res.status(400).json({
        message: "Please upload a valid PDF, JPG, or PNG registration document.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("orgName", sql.VarChar, orgName.trim())
      .input("orgEmail", sql.VarChar, normalizedOrgEmail)
      .input("orgType", sql.VarChar, orgType)
      .input("orgProvince", sql.VarChar, orgProvince)
      .input("password", sql.VarChar, hashedPassword)
      .input("orgDocument", sql.VarChar, documentUrlPath)
      .query(`
        INSERT INTO PendingOrganisation (OrgName, OrgEmail, Type, Province, Password, Status, OrgDocument)
        VALUES (@orgName, @orgEmail, @orgType, @orgProvince, @password, 'Pending', @orgDocument)
      `);

    consumeEmailVerification(normalizedOrgEmail);

    console.log(`Organisation "${orgName}" application received and queued for admin review.`);

    try {
      await transport.sendMail({
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: normalizedOrgEmail,
        subject: "Your SMILE application was received",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Application received, ${orgName}!</h2>
            <p style="color:#374151;line-height:1.6;">
              Thank you for applying to join the <strong>SMILE</strong> platform. Your organisation account has not been activated yet.
            </p>
            <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:16px;border-radius:4px;margin:24px 0;">
              <p style="margin:0;color:#92400E;font-weight:600;">Your application is being reviewed</p>
              <p style="margin:8px 0 0;color:#78350F;font-size:14px;">
                An admin will review your email verification and uploaded registration document. We will email you once your account is approved.
              </p>
            </div>
          </div>
        `,
      });
      console.log(`Under review email sent to ${normalizedOrgEmail}`);
    } catch (emailErr) {
      console.error("Application received email failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
      message: "Application received. Your organisation will be reviewed by an admin before the account is created.",
    });
  } catch (err) {
    console.error("saveOrganisationDetails:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

export const userLogin = async (req, res) => {

    try {
        const { email, password, accountType } = req.body;

        if (!email || !password || !accountType) {
            return res.sendStatus(400);
        }

        const pool = await connectToDB();

        if (accountType === "student") {
            const results = await pool
                .request()
                .input("email", sql.VarChar, email)
                .query(`SELECT * FROM Student WHERE StuEmail = @email`);

            if (results.recordset.length <= 0) {
                return res.sendStatus(401);
            }

            const user = results.recordset[0];
            console.log(user);

            // âœ… correct variable name
            const passwordMatch = await bcrypt.compare(password, user.StuPassword);

            if (!passwordMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // âœ… correct env variable names
            const token = jwt.sign(
                { id: user.StuID, email: user.StuEmail, accountType: "student" },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            let stuName = user.StuName[0];
            let lastName = user.StuLastName[0];

            let initials = stuName + lastName;

            console.log(stuName);

            console.log("âœ… Student login successfully!");
            return res.status(200).json({ token, accountType: "student" , name: user.StuName,userinitials:initials});

        } else if (accountType === "organization") {

    // âœ… Check Admin table first
    const adminResult = await pool
        .request()
        .input("email", sql.VarChar, email)
        .query(`SELECT * FROM Admin WHERE AdminEmail = @email`);

    if (adminResult.recordset.length > 0) {
        // --- ADMIN LOGIN ---
        const admin = adminResult.recordset[0];

        const passwordMatch = await bcrypt.compare(password, admin.AdminPassword);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin.AdminID, email: admin.AdminEmail, accountType: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log("âœ… Admin login via organisation card!");
        return res.status(200).json({ token, accountType: "admin", name: admin.AdminName });
    }

    // âœ… Not an admin â€” check Organisation table as normal
    const orgResult = await pool
        .request()
        .input("email", sql.VarChar, email)
        .query(`SELECT * FROM Organisation WHERE OrgEmail = @email`);

    if (orgResult.recordset.length <= 0) {
        return res.sendStatus(401);
    }

    const user = orgResult.recordset[0];

    const passwordMatch = await bcrypt.compare(password, user.Password);

    if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { id: user.OrgId, email: user.OrgEmail, accountType: "organization" },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log("âœ… Organisation login successfully!");
    return res.status(200).json({ token, accountType: "organization", name: user.OrgName });
}

    } catch (err) {
        console.error("Login error:", err);
        return res.sendStatus(500);
    }
};

//Lucas Bohani Maluleke

// export const userLogin = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.sendStatus(400);
//         }

//         const pool = await connectToDB();

//         // âœ… Try student first
//         const studentResult = await pool
//             .request()
//             .input("email", sql.VarChar, email)
//             .query(`SELECT * FROM Student WHERE StuEmail = @email`);

//         if (studentResult.recordset.length > 0) {
//             const user = studentResult.recordset[0];
//             const passwordMatch = await bcrypt.compare(password, user.StuPassword);
//             if (!passwordMatch) return res.status(401).json({ message: "Invalid credentials" });

//             const token = jwt.sign(
//                 { id: user.StuID, email: user.StuEmail, accountType: "student" },
//                 process.env.JWT_SECRET,
//                 { expiresIn: process.env.JWT_EXPIRES_IN }
//             );

//             res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });

//             const initials = user.StuName[0] + user.StuLastName[0];
//             console.log("âœ… Student login successfully!");
//             return res.status(200).json({ token, accountType: "student", name: user.StuName, userinitials: initials });
//         }

//         // âœ… Try organisation second
//         const orgResult = await pool
//             .request()
//             .input("email", sql.VarChar, email)
//             .query(`SELECT * FROM Organisation WHERE OrgEmail = @email`);

//         if (orgResult.recordset.length > 0) {
//             const user = orgResult.recordset[0];
//             const passwordMatch = await bcrypt.compare(password, user.Password);
//             if (!passwordMatch) return res.status(401).json({ message: "Invalid credentials" });

//             const token = jwt.sign(
//                 { id: user.OrgId, email: user.OrgEmail, accountType: "organization" },
//                 process.env.JWT_SECRET,
//                 { expiresIn: process.env.JWT_EXPIRES_IN }
//             );

//             res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });

//             const initials = user.OrgName[0];
//             console.log("âœ… Organisation login successfully!");
//             return res.status(200).json({ token, accountType: "organization", name: user.OrgName, userinitials: initials });
//         }

//         // âœ… Email not found in either table
//         return res.sendStatus(401);

//     } catch (err) {
//         console.error("âŒ Login error:", err);
//         return res.sendStatus(500);
//     }
// };
