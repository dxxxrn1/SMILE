import { rmSync } from "node:fs";
import {sql , connectToDB} from "../dbConnection/dbconnection.js";
import bcrypt from "bcrypt";
import nodemailer from  "nodemailer";
import { error } from "node:console";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { validateRealEmail } from "../utils/validateEmail.js";

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
        console.log("3️⃣ connected, about to SELECT");
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
    const { orgName, orgEmail, orgType, orgProvince, password } = req.body;
 
    // ── Validation ────────────────────────────────────────────
    if (!orgName || !orgEmail || !orgType || !orgProvince || !password) {
      return res.status(400).json({ message: "Please enter all the details." });
    }


     const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.LUCAS_EMAIL,
                pass: process.env.LUCAS_APP_PASS
            }
        });

 
    const pool = await connectToDB();
 
    // ── Duplicate email check ─────────────────────────────────
    const existing = await pool
      .request()
      .input("email", sql.VarChar, orgEmail)
      .query("SELECT OrgId FROM Organisation WHERE OrgEmail = @email");
 
    if (existing.recordset.length > 0) {
      return res.status(403).json({ message: "This email is already registered." });
    }
 
    // ── Hash password ─────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);
 
    // ── Insert with Status = 'Pending' ────────────────────────
    await pool
      .request()
      .input("orgName",     sql.VarChar, orgName)
      .input("orgEmail",    sql.VarChar, orgEmail)
      .input("orgType",     sql.VarChar, orgType)
      .input("orgProvince", sql.VarChar, orgProvince)
      .input("password",    sql.VarChar, hashedPassword)
      .query(`
        INSERT INTO Organisation (OrgName, OrgEmail, Type, Province, Password, Status)
        VALUES (@orgName, @orgEmail, @orgType, @orgProvince, @password, 'Pending')
      `);
 
    console.log(`✅ Organisation "${orgName}" registered — awaiting approval`);
 
    // ── Send "under review" email ─────────────────────────────
    try {
      await transporter.sendMail({
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: orgEmail,
        subject: "Your SMILE Registration is Under Review",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Thank you for registering, ${orgName}!</h2>
            <p style="color:#374151;line-height:1.6;">
              Your organisation has been successfully registered on the <strong>SMILE platform</strong>.
              Your account is currently <strong>under review</strong> by our admin team.
            </p>
            <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:16px;border-radius:4px;margin:24px 0;">
              <p style="margin:0;color:#92400E;font-weight:600;">⏳ What happens next?</p>
              <p style="margin:8px 0 0;color:#78350F;font-size:14px;">
                Our team will review your application within <strong>2–3 business days</strong>.
                You will receive a confirmation email once your account has been approved.
              </p>
            </div>
            <p style="color:#6B7280;font-size:13px;">
              If you have any questions, please contact us at
              <a href="mailto:${process.env.LUCAS_EMAIL}" style="color:#3B82F6;">${process.env.LUCAS_EMAIL}</a>.
            </p>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
            <p style="color:#9CA3AF;font-size:12px;text-align:center;">
              © SMILE Platform — Empowering South African Youth
            </p>
          </div>
        `,
      });
      console.log(`📧 "Under review" email sent to ${orgEmail}`);
    } catch (emailErr) {
      console.error("Email send failed (non-fatal):", emailErr.message);
    }
 
    return res.status(201).json({
      message: "Registration submitted. You will receive an email once your account is approved.",
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

            // ✅ correct variable name
            const passwordMatch = await bcrypt.compare(password, user.StuPassword);

            if (!passwordMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // ✅ correct env variable names
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

            console.log("✅ Student login successfully!");
            return res.status(200).json({ token, accountType: "student" , name: user.StuName,userinitials:initials});

        } else if (accountType === "organization") {

    // ✅ Check Admin table first
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

        console.log("✅ Admin login via organisation card!");
        return res.status(200).json({ token, accountType: "admin", name: admin.AdminName });
    }

    // ✅ Not an admin — check Organisation table as normal
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

    console.log("✅ Organisation login successfully!");
    return res.status(200).json({ token, accountType: "organization", name: user.OrgName });
}

    } catch (err) {
        console.error("❌ Login error:", err);
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

//         // ✅ Try student first
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
//             console.log("✅ Student login successfully!");
//             return res.status(200).json({ token, accountType: "student", name: user.StuName, userinitials: initials });
//         }

//         // ✅ Try organisation second
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
//             console.log("✅ Organisation login successfully!");
//             return res.status(200).json({ token, accountType: "organization", name: user.OrgName, userinitials: initials });
//         }

//         // ✅ Email not found in either table
//         return res.sendStatus(401);

//     } catch (err) {
//         console.error("❌ Login error:", err);
//         return res.sendStatus(500);
//     }
// };