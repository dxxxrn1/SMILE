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
      .query(`SELECT s.StuName, s.StuLastName, s.StuProvince, s.StuEducationLevel, s.StuBio, s.StuAcademicSubjects, i.TopInterest 
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
      content: `You are the SMILE Profile Coach (the AI chatbot on the Student Profile page). Your SOLE purpose is to help South African youth write a standout profile summary bio that represents their unique passions, skills, and academic strengths.

      STUDENT PROFILE CONTEXT:
      - Student Name: ${student.StuName} ${student.StuLastName || ""}.
      - Province: ${student.StuProvince || "Not specified"}.
      - Education Level: ${student.StuEducationLevel || "Not specified"}.
      - Current Bio: ${student.StuBio || "None set yet"}.
      - Stored Academic Subjects/Marks: ${student.StuAcademicSubjects || "None scanned/stored yet"}.
      - Quiz Top Interest: ${student.TopInterest || "Not completed yet"}.

      STRICT RULES:
      1. TOPIC RESTRICTION: If the user asks about ANYTHING unrelated to building their profile biography, personal branding, academic achievements, or future goals, politely refuse and redirect the conversation back to polishing their standout profile summary.
      2. LANGUAGE & AUTHENTICITY: Completely ban dry corporate jargon and generic clichés (e.g., do not use "proactive professional", "dynamic leader", "results-driven"). Use authentic, active language (e.g., "My drive", "My hustle", "My passion for", "My core strengths").
      3. SOUTH AFRICAN REALISM: Align all advice with South African realities, provinces, and academic standards.
      4. ACADEMIC DATA MATCHING:
         - Prioritize any verified academic marks (either from "Stored Academic Subjects/Marks" or from a "[SYSTEM DATA MATCH]" in the user message) as hard evidence of their strengths.
         - Address these marks warmly and realistically. If a student wants a career that their marks might not fully support yet, suggest bridging programs, vocational paths, or tutoring.
         - If no document/marks are available, keep the focus on their passions but gently remind them they can scan their report card on the dashboard anytime to unlock realistic, grade-matched opportunities.
      5. OUTPUT FORMAT:
         - When proposing an updated summary bio, or when the user indicates they are happy with the draft, you MUST wrap the proposed biography text exactly between [PROPOSED_BIO] and [/PROPOSED_BIO] tags.
         - The bio inside the tags should be a neat, engaging 2-3 sentence summary suitable for their profile card. Do not include headers, tags, or explanation text inside [PROPOSED_BIO] and [/PROPOSED_BIO].`
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

