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

export const saveOrganisationDetails = async(req,res)=>{
    try{
        console.log("Saving org details");
        const strengthOfpassWord = 10;

        const {orgName,orgEmail,orgType,orgProvince,password} = req.body;

        if(!orgName || !orgEmail || !orgType || !orgProvince || !orgProvince || !password){
            console.log("The organisation did not enter full details");
            return res.status(400).json({
                 message:"Please enter all the details"
            })

        }

        // Validate real email before continuing
        const emailValidation = await validateRealEmail(email);

        if (!emailValidation.success) {
            return res.status(400).json({
                message: emailValidation.message
            });
        }

        const pool = await connectToDB();

        console.log("connected, about to SELECT");
        const results = await pool
        .request()
        .input("email" , sql.VarChar , orgEmail)
        .query(`
            SELECT * FROM Organisation WHERE OrgEmail = @email;
        `)
        console.log("SELECT done, rows:", results.recordset.length);

        if(results.recordset.length > 0){
            return res.status(403);
        }
        console.log("about to hash password");

        const hashedPassword = await bcrypt.hash(password , strengthOfpassWord);

        await pool
        .request()
        .input("orgname" , sql.VarChar , orgName)
        .input("orgemail" ,  sql.VarChar , orgEmail)
        .input("orgtype" , sql.VarChar , orgType)
        .input("orgprovince" , sql.VarChar , orgProvince)
        .input("orgpassword" , sql.VarChar , hashedPassword)
        .query(`    
            INSERT INTO Organisation(OrgName,OrgEmail,Type,Province,Password)
            VALUES(@orgname,@orgemail,@orgtype,@orgprovince,@orgpassword)
        `)

        console.log("INSERT successful"); 

        const transport = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:`${process.env.LUCAS_EMAIL}`,
                pass:`${process.env.LUCAS_APP_PASS}`
            }
        })

        const mailOptions = {
            from:`${process.env.LUCAS_EMAIL}`,
            to:`${orgEmail}`,
            subject: "Registration Received",  
            text: "You have successfully registered on SMILE!"
        }


        try {
            await transport.sendMail(mailOptions);
            console.log("Email sent successfully");
        } catch (emailError) {
            console.log("Email failed but user was still registered:", emailError);
        }
        
        console.log("Successfully registered the organisation!!!");

        return res.sendStatus(201);

    }catch(err){
        console.log(err);
        return res.status(500).json({
            message: "Opps something went wrong!!!!"
        });
    }
}

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