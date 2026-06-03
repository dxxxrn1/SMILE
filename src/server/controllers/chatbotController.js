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

    const { history = [] } = req.body;
    const hasScannedDocumentContext = history.some(
      (message) =>
        message?.role === "user" &&
        typeof message.content === "string" &&
        message.content.includes("SCANNED_SCHOOL_DOCUMENT_CONTEXT"),
    );

    if (!student.TopInterest && !hasScannedDocumentContext) {
      return res.status(400).json({
        response:
          "Please complete the personality quiz first so I can give you personalised career advice!",
      });
    }

    // 🟢 Grab the whole history from the frontend!
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are the SMILE Career Guide. Your SOLE purpose is to provide career, education, and professional development advice for South African students.
            Student Name: ${student.StuName}. 
            Quiz Result Top Interest: ${student.TopInterest || "Not completed yet; use scanned document context if provided."}.
            
            STRICT RULES:
            1. If the user asks about ANYTHING unrelated to careers, universities, jobs, or studying, politely refuse and steer back to their career path.
            2. STAY IN CONTEXT. If the student says they want to pursue a specific career (e.g., Web Development), ignore their Quiz Result and help them with their chosen path!
            3. When suggesting careers, always provide 3 South African options including Required High School Subjects, Study Duration, and ZAR Salary range.
            4. If the user provides SCANNED_SCHOOL_DOCUMENT_CONTEXT, use the scanned subjects, marks, grade, and document type as the main evidence for the career path.
            5. Keep your tone encouraging, professional, and focused on their future.`,
        },
        // 🟢 Spread the entire chat history right here so the AI remembers everything!
        ...history,
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ response: "AI connection error." });
  }
};
// 
export const generateDocFromChat = async (req, res) => {
  try {
    const { history, academicSubjects } = req.body;
    const pool = await connectToDB();

    const result = await pool.request().input("stuID", sql.Int, req.user.id)
      .query(`SELECT s.StuName, s.StuProvince, s.StuBio, s.StuAcademicSubjects, i.TopInterest
              FROM Student s LEFT JOIN StudentInterests i ON s.StuID = i.StuID
              WHERE s.StuID = @stuID`);

    const student = result.recordset[0];

    // Build summary only if chat has meaningful content
    const hasRealChat = history && history.length >= 2;

    const summary = hasRealChat
      ? history
          .map((m) => `${m.role === "user" ? "Student" : "AI"}: ${m.content}`)
          .join("\n")
      : null;

    const finalAcademicSubjects = student.StuAcademicSubjects || academicSubjects || null;

    const academicContext = finalAcademicSubjects
      ? `\nAcademic Record (Scanned Subjects & Marks): ${finalAcademicSubjects}`
      : "";
    const bioContext = student.StuBio
      ? `\nStudent Biography / Core Passion: ${student.StuBio}`
      : "";

    const userPrompt = hasRealChat
      ? `Here is our career counselling conversation:\n\n${summary}\n\nBased on what was discussed, generate a career path document. If no specific career was chosen, use the student's top interest (${student.TopInterest || "Not completed"}) and academic details as the focus.${academicContext}${bioContext}`
      : `No detailed conversation happened yet. Generate a comprehensive career path document based on the student's top interest: ${student.TopInterest || "Not completed"}.${academicContext}${bioContext}`;

    const systemPromptContent = `You are the SMILE Career Guide. Generate a detailed, structured career path document for ${student.StuName} from ${student.StuProvince}.
    
    Current Top Interest (Quiz Result): ${student.TopInterest || "Not completed yet"}.
    ${academicContext}
    ${bioContext}
    
    CRITICAL CONTEXT RULES:
    1. IF ACADEMIC MARKS ARE PROVIDED: These verified subjects and marks are the student's baseline reality. Use them. If they scored 80% in Math but say they want to be an artist, or scored 50% in Math but want to be a data scientist, address it warmly and realistically. Recommend realistic paths, bridging programs, bursaries, or specific career paths that fit their actual marks, but align with their passions/top interest.
    2. Always produce a FULL document even if no specific career was discussed. If no specific career was chosen, synthesize a career path that dynamically bridges their top interest/personality with their academic strengths. Do not rely on just static interests.
    3. LANGUAGE: Completely ban corporate jargon (e.g., do not use "proactive professional"). Use authentic phrases like "My drive", "My hustle", "My core strengths".`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: systemPromptContent,
        },
        {
          role: "user",
          content: `${userPrompt}

Generate a career path document with these sections:
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

    // Detect the career title from the AI response or fallback to TopInterest
    const titleMatch = docContent.match(/##\s*Career Overview[\s\S]*?(?:as a|in|for)\s+([A-Z][a-zA-Z\s]+)/);
    const careerTitle = titleMatch ? titleMatch[1].trim() : student.TopInterest;

    await pool
      .request()
      .input("stuID", sql.Int, req.user.id)
      .input("title", sql.VarChar(100), `Career Path - ${careerTitle}`)
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

export const getProfileBioAdvice = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool.request().input("stuID", sql.Int, req.user.id)
      .query(`SELECT s.StuName, s.StuBio, i.TopInterest 
              FROM Student s LEFT JOIN StudentInterests i ON s.StuID = i.StuID 
              WHERE s.StuID = @stuID`);

    const student = result.recordset[0];

    if (!student) {
      return res.status(404).json({ success: false, response: "Student profile not found." });
    }

    const { message, chatHistory, scannedData, history } = req.body;

    let processedMessage = message || "";
    let actualHistory = chatHistory || history || [];

    // Gracefully handle older client payloads (where only history was sent)
    if (!message && actualHistory.length > 0) {
      const lastMsg = actualHistory[actualHistory.length - 1];
      if (lastMsg.role === "user") {
        processedMessage = lastMsg.content;
        actualHistory = actualHistory.slice(0, -1);
      }
    }

    // If a document was uploaded, inject it as a hidden system injection flag so the AI learns it instantly
    if (scannedData && scannedData.hasUploaded) {
      processedMessage = `[SYSTEM DATA MATCH]: User uploaded an official document from ${scannedData.schoolName || "unknown school"}. 
      Scanned Marks: ${scannedData.topSubjects}. 
      User Message: ${processedMessage}`;
    }

    const systemInstruction = {
      role: "system",
      content: `You are the SMILE Hybrid Career Coach. Your job is to help South African youth build a standout summary profile card. 
      Student Name: ${student.StuName}.
      Current Top Interest (Quiz Result): ${student.TopInterest || "Not completed yet"}.
      You must balance raw academic data with human personality—never rely on just one.

      CRITICAL CONTEXT RULES:
      1. Check if the user has uploaded an academic document (passed in the prompt as [SYSTEM DATA MATCH]).
      2. IF A DOC IS UPLOADED: Use those exact marks as your foundational reality. Do not guess. If they scored 80% in Math but say they want to be an artist, or scored 50% in Math but want to be a data scientist, address it warmly and realistically. Suggest bridging programs, bursaries, or specific career paths that fit their actual marks, but align with their passions.
      3. IF NO DOC IS UPLOADED YET: Keep the conversation focused on their interests, but politely remind them that they can drop a report card in at any time to unlock realistic, grade-matched opportunities.
      4. LANGUAGE: Completely ban corporate jargon (e.g., do not use "proactive professional"). Use authentic phrases like "My drive", "My hustle", "My core strengths".

      OUTPUT FORMAT:
      When the user is happy, wrap the updated summary exactly inside [PROPOSED_BIO] and [/PROPOSED_BIO] tags. You must include an "Academic Strength" section based on their doc if they uploaded one.`
    };

    const messagesPayload = [
      systemInstruction,
      ...actualHistory,
      { role: "user", content: processedMessage }
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messagesPayload,
      temperature: 0.7
    });

    return res.status(200).json({ success: true, response: completion.choices[0].message.content });
  } catch (err) {
    console.error("AI Profile Writer Error:", err);
    return res.status(500).json({ success: false, response: "AI connection error.", error: "AI Engine context mapping failed." });
  }
};

