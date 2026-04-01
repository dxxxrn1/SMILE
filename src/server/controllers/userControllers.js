import { rmSync } from "node:fs";
import {sql , connectToDB} from "../dbConnection/dbconnection.js";
import bcrypt from "bcrypt";
import nodemailer from  "nodemailer";
import { error } from "node:console";
import dotenv from "dotenv";

dotenv.config();
 
export const saveStudentDetails = async (req, res) => {
    try {
        const { firstName, lastName, email, province, educationLevel, password } = req.body;

        if (!firstName || !lastName || !email || !province || !educationLevel || !password) {
            return res.sendStatus(400);
        }

        const pool = await connectToDB();

        // Check if email already exists
        const results = await pool
            .request()
            .input("email", sql.VarChar, email)
            .query(`SELECT * FROM Student WHERE StuEmail = @email`);

        if (results.recordset.length > 0) {
            return res.sendStatus(403); // ✅ Bug 1 fixed - actually sends the response
        }

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

        // ✅ Bug 2 fixed - await only, no callback
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

        const strengthOfpassWord = 10;

        const {orgName,orgEmail,orgType,orgProvince,password} = req.body;

        if(!orgName || !orgEmail || !orgType || !orgProvince || !orgProvince || !password){
            console.log("The organisation did not enter full details");
            return res.status(400).json({
                 message:"Please enter all the details"
            })

        }
        
        const results = await pool
        .request()
        .input("email" , sql.VarChar , orgEmail)
        .query(`
            SELECT * FROM Student WHERE StuEmail = @email;
        `)

        if(results.recordset.length > 0){
            return res.status(403);
        }

        const hashedPassword = await bcrypt.hash(password , strengthOfpassWord);

        const pool = await connectToDB();

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