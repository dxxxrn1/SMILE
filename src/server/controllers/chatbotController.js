import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const getCareerAdvice = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool.request().input("stuID", sql.Int, req.user.id)
      .query(`SELECT s.StuName, i.TopInterest 
              FROM Student s LEFT JOIN StudentInterests i ON s.StuID = i.StuID 
              WHERE s.StuID = @stuID`);

    const student = result.recordset[0];

    if (!student) {
      return res.status(404).json({ response: "Student profile not found." });
    }

    if (!student.TopInterest) {
      return res.status(400).json({
        response:
          "Please complete the personality quiz first so I can give you personalised career advice!",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are the SMILE Career Guide. Your SOLE purpose is to provide career, education, and professional development advice for South African students.
            Student Name: ${student.StuName}. Top Interest: ${student.TopInterest}.
            
            STRICT RULES:
            1. If the user asks about ANYTHING unrelated to careers, universities, jobs, or studying, politely refuse and steer back to their career path.
            2. When suggesting careers, always provide 3 South African options that fit their personality, including Required Subjects, Study Duration, and ZAR Salary range.
            3. Keep your tone encouraging, professional, and focused on their future.`,
        },
        { role: "user", content: req.body.userPrompt },
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ response: "AI connection error." });
  }
};

export const generateDocFromChat = async (req, res) => {
  try {
    const { history } = req.body;
    const pool = await connectToDB();

    const result = await pool.request().input("stuID", sql.Int, req.user.id)
      .query(`SELECT s.StuName, s.StuProvince, i.TopInterest
              FROM Student s LEFT JOIN StudentInterests i ON s.StuID = i.StuID
              WHERE s.StuID = @stuID`);

    const student = result.recordset[0];

    const summary = history
      .map((m) => `${m.role === "user" ? "Student" : "AI"}: ${m.content}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are the SMILE Career Guide. Based on a career counselling chat, generate a structured career path document for ${student.StuName} from ${student.StuProvince}, whose top interest is ${student.TopInterest}.`,
        },
        {
          role: "user",
          content: `Here is our career counselling conversation:\n\n${summary}\n\nGenerate a career path document with these sections:
## Career Overview
## Required High School Subjects
## Qualifications & Universities in South Africa
## Step-by-Step Career Path
## Expected ZAR Salary Progression
## Top Employers in South Africa
## Next Steps to Get Started`,
        },
      ],
    });

    const docContent = completion.choices[0].message.content;

    await pool
      .request()
      .input("stuID", sql.Int, req.user.id)
      .input("title", sql.VarChar(100), `Career Path - ${student.TopInterest}`)
      .input("content", sql.NVarChar(sql.MAX), docContent)
      .query(
        `INSERT INTO SavedCareerDocs (StuID, CareerTitle, DocContent) VALUES (@stuID, @title, @content)`,
      );

    res.json({ doc: docContent });
  } catch (err) {
    console.error("Doc Gen Error:", err);
    res.status(500).json({ doc: "Error generating document." });
  }
};

export const getMyInterests = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool
      .request()
      .input("stuID", sql.Int, req.user.id)
      .query(`SELECT TopInterest FROM StudentInterests WHERE StuID = @stuID`);

    if (result.recordset.length > 0 && result.recordset[0].TopInterest) {
      res.json({ exists: true, interest: result.recordset[0].TopInterest });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Error fetching interests:", err);
    res.status(500).json({ exists: false });
  }
};

export const saveInterests = async (req, res) => {
  try {
    const stuID = req.user.id;
    const scores = {
      Realistic: Number(req.body.Realistic) || 0,
      Investigative: Number(req.body.Investigative) || 0,
      Artistic: Number(req.body.Artistic) || 0,
      Social: Number(req.body.Social) || 0,
      Enterprising: Number(req.body.Enterprising) || 0,
      Conventional: Number(req.body.Conventional) || 0,
    };

    const topInterest = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b,
    );

    const pool = await connectToDB();
    await pool
      .request()
      .input("stuID", sql.Int, stuID)
      .input("R", sql.Int, scores.Realistic)
      .input("I", sql.Int, scores.Investigative)
      .input("A", sql.Int, scores.Artistic)
      .input("S", sql.Int, scores.Social)
      .input("E", sql.Int, scores.Enterprising)
      .input("C", sql.Int, scores.Conventional)
      .input("top", sql.VarChar(50), topInterest).query(`
        IF EXISTS (SELECT 1 FROM StudentInterests WHERE StuID = @stuID)
          UPDATE StudentInterests 
          SET Realistic=@R, Investigative=@I, Artistic=@A, Social=@S, Enterprising=@E, Conventional=@C, TopInterest=@top, DateTaken=GETDATE()
          WHERE StuID = @stuID
        ELSE
          INSERT INTO StudentInterests (StuID, Realistic, Investigative, Artistic, Social, Enterprising, Conventional, TopInterest)
          VALUES (@stuID, @R, @I, @A, @S, @E, @C, @top)
      `);

    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving interests:", err);
    res.sendStatus(500);
  }
};

export const getSavedDocs = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool.request().input("stuID", sql.Int, req.user.id)
      .query(`SELECT DocID, CareerTitle, DateSaved 
              FROM SavedCareerDocs WHERE StuID = @stuID 
              ORDER BY DateSaved DESC`);
    res.json({ docs: result.recordset });
  } catch (err) {
    res.status(500).json({ docs: [] });
  }
};

export const getSingleDoc = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool
      .request()
      .input("docID", sql.Int, req.params.id)
      .input("stuID", sql.Int, req.user.id)
      .query(
        `SELECT * FROM SavedCareerDocs WHERE DocID = @docID AND StuID = @stuID`,
      );
    res.json({ doc: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ doc: null });
  }
};
