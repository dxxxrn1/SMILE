import express from "express";
import crypto from "crypto";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";

const route = express.Router();
route.use("/api/scanner", express.json({ limit: "25mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontEndRoot = path.join(__dirname, "..", "..", "frontEnd");

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;

function getScanBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.SCAN_BASE_URL) {
    return process.env.SCAN_BASE_URL.replace(/\/$/, "");
  }

  const host = req.get("host");
  const protocol = req.protocol;

  if (!host?.startsWith("localhost") && !host?.startsWith("127.0.0.1")) {
    return `${protocol}://${host}`;
  }

  const port = host?.split(":")[1] || "3000";
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) {
        return `${protocol}://${address.address}:${port}`;
      }
    }
  }

  return `${protocol}://${host}`;
}

function createSession() {
  const id = crypto.randomBytes(18).toString("hex");
  const session = {
    id,
    status: "waiting_for_phone",
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    uploadedFile: null,
    analysis: null,
  };

  sessions.set(id, session);
  return session;
}

function getActiveSession(id) {
  const session = sessions.get(id);

  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(id);
    return null;
  }

  return session;
}

function extractTextFromUploadedDocument(file) {
  // Temporary OCR placeholder. Replace with Azure Document Intelligence,
  // Google Vision, AWS Textract, OpenAI vision, or Tesseract for production.
  const readableName = file.name.replace(/[-_]/g, " ");
  const fileHints = `${readableName} ${file.type}`.toLowerCase();

  if (
    fileHints.includes("report") ||
    fileHints.includes("transcript") ||
    fileHints.includes("result") ||
    fileHints.includes("certificate") ||
    fileHints.includes("qualification")
  ) {
    return [
      "School Report",
      "Grade 11",
      "Mathematics 78",
      "Physical Sciences 82",
      "English 71",
      "Life Sciences 74",
    ].join("\n");
  }

  return readableName;
}

function classifySchoolDocument(extractedText) {
  const text = extractedText.toLowerCase();
  const schoolSignals = [
    "school",
    "report",
    "transcript",
    "certificate",
    "qualification",
    "grade",
    "subject",
    "mathematics",
    "physical sciences",
    "life sciences",
    "english",
    "results",
  ];

  const matchedSignals = schoolSignals.filter((signal) => text.includes(signal));
  const confidence = Math.min(0.98, matchedSignals.length / 6);
  const isSchoolDocument = confidence >= 0.45;
  const subjects = extractSubjects(extractedText);

  return {
    isSchoolDocument,
    confidence: Number(confidence.toFixed(2)),
    documentType: isSchoolDocument ? "school_or_qualification_document" : "unknown_document",
    matchedSignals,
    grade: extractGrade(extractedText),
    subjects,
    message: isSchoolDocument
      ? "This looks like a school report, transcript, certificate, or qualification document."
      : "This does not look like a school report, transcript, certificate, or qualification document.",
  };
}

function extractGrade(text) {
  const match = text.match(/grade\s*(8|9|10|11|12)/i);
  return match ? `Grade ${match[1]}` : "Unknown";
}

function extractSubjects(text) {
  const knownSubjects = [
    "Mathematics",
    "Physical Sciences",
    "Life Sciences",
    "English",
    "Accounting",
    "Business Studies",
    "Geography",
    "History",
    "Computer Applications Technology",
    "Information Technology",
  ];

  return knownSubjects
    .map((subject) => {
      const pattern = new RegExp(`${subject}\\s*[:\\-]?\\s*(\\d{1,3})`, "i");
      const match = text.match(pattern);
      return match ? { name: subject, mark: Number(match[1]) } : null;
    })
    .filter(Boolean);
}

function recommendCareerPaths(analysis) {
  const subjects = analysis.subjects || [];
  const strongSubjects = subjects.filter((subject) => subject.mark >= 70).map((subject) => subject.name);
  const recommendations = [];

  if (strongSubjects.includes("Mathematics") && strongSubjects.includes("Physical Sciences")) {
    recommendations.push("Engineering", "Computer Science", "Data Science");
  }

  if (strongSubjects.includes("Life Sciences")) {
    recommendations.push("Health Sciences", "Biotechnology", "Environmental Science");
  }

  if (strongSubjects.includes("Accounting") || strongSubjects.includes("Business Studies")) {
    recommendations.push("Accounting", "Business Management", "Entrepreneurship");
  }

  if (recommendations.length === 0) {
    recommendations.push("Career assessment", "College bridging programme", "General academic counselling");
  }

  return [...new Set(recommendations)].slice(0, 5);
}

function buildCareerPrompt(analysis) {
  const subjects = analysis.subjects.length
    ? analysis.subjects.map((subject) => `${subject.name}: ${subject.mark}%`).join(", ")
    : "No subject marks detected yet";

  return `SCANNED_SCHOOL_DOCUMENT_CONTEXT:
The student scanned a school report, transcript, certificate, or qualification document.
Document Type: ${analysis.documentType}
Grade: ${analysis.grade}
Detected Subjects/Marks: ${subjects}
Suggested Career Areas From Scan: ${analysis.careerPaths.join(", ")}

Please give the student a clear career path based mainly on the scanned document. Include:
1. Best-fit career paths
2. Why those paths match the subjects/marks
3. Required high school subjects
4. Study options in South Africa
5. Step-by-step next actions
6. What marks or subjects the student should improve`;
}

route.get("/scanner/mobile/start/:sessionId", (req, res) => {
  const session = getActiveSession(req.params.sessionId);

  if (!session) {
    return res.status(404).send("Scan session expired or not found.");
  }

  res.cookie("scanSessionId", session.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
  });

  res.redirect("/scanner/mobile");
});

route.get("/scanner/mobile", (req, res) => {
  res.sendFile(path.join(frontEndRoot, "htmlPages", "scan-mobile.html"));
});

route.get("/api/scanner/current-session", (req, res) => {
  const session = getActiveSession(req.cookies?.scanSessionId);

  if (!session) {
    return res.status(404).json({ message: "Scan session expired or not found." });
  }

  res.json({ sessionId: session.id });
});

route.post("/api/scanner/sessions", async (req, res) => {
  const session = createSession();
  const scanUrl = `${getScanBaseUrl(req)}/scanner/mobile/start/${session.id}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 240,
    margin: 1,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  res.status(201).json({
    sessionId: session.id,
    scanUrl,
    qrDataUrl,
    expiresAt: session.expiresAt,
  });
});

route.get("/api/scanner/sessions/:sessionId", (req, res) => {
  const session = getActiveSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: "Scan session expired or not found." });
  }

  res.json({
    id: session.id,
    status: session.status,
    analysis: session.analysis,
    uploadedFile: session.uploadedFile,
  });
});

route.post("/api/scanner/sessions/:sessionId/upload", (req, res) => {
  const session = getActiveSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: "Scan session expired or not found." });
  }

  const file = req.body?.file;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  if (!file) {
    return res.status(400).json({ message: "Please upload a document image or PDF." });
  }

  if (!allowedTypes.includes(file.type)) {
    return res.status(400).json({ message: "Only JPG, PNG, WEBP, and PDF files are allowed." });
  }

  if (!file.dataUrl || file.dataUrl.length > 20 * 1024 * 1024) {
    return res.status(400).json({ message: "The uploaded file is too large." });
  }

  const extractedText = extractTextFromUploadedDocument(file);
  const baseAnalysis = classifySchoolDocument(extractedText);
  const careerPaths = baseAnalysis.isSchoolDocument ? recommendCareerPaths(baseAnalysis) : [];
  const analysis = {
    ...baseAnalysis,
    careerPaths,
    extractedTextPreview: extractedText.slice(0, 600),
  };

  analysis.chatbotPrompt = analysis.isSchoolDocument ? buildCareerPrompt(analysis) : null;
  session.status = analysis.isSchoolDocument ? "school_document_ready" : "rejected_document";
  session.uploadedFile = {
    name: file.name,
    type: file.type,
    size: file.size,
  };
  session.analysis = analysis;

  res.json({
    message: analysis.isSchoolDocument
      ? "Document received and accepted for career guidance."
      : "Document received, but it does not look like a school or qualification document.",
    status: session.status,
    analysis,
  });
});

export default route;
