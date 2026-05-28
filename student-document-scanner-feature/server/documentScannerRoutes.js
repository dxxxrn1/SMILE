import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
router.use("/api/scanner", express.json({ limit: "12mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scannerRoot = path.join(__dirname, "..");

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;

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
  // Placeholder OCR step. Replace with Azure, Google Vision, AWS Textract,
  // OpenAI vision, or Tesseract when connecting this to production.
  const readableName = file.name.replace(/[-_]/g, " ");
  const fileHints = `${readableName} ${file.type}`.toLowerCase();

  if (fileHints.includes("report") || fileHints.includes("transcript") || fileHints.includes("result")) {
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
    documentType: isSchoolDocument ? "school_document" : "unknown_document",
    matchedSignals,
    grade: extractGrade(extractedText),
    subjects,
    message: isSchoolDocument
      ? "This looks like a school document and can be used for career guidance."
      : "This does not look like a school report, transcript, certificate, or academic results document.",
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

router.get("/scanner/desktop", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "scan-desktop.html"));
});

router.get("/scanner/mobile", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "scan-mobile.html"));
});

router.get("/scanner/documentScanner.css", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "documentScanner.css"));
});

router.get("/scanner/documentScannerDesktop.js", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "documentScannerDesktop.js"));
});

router.get("/scanner/documentScannerMobile.js", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "documentScannerMobile.js"));
});

router.post("/api/scanner/sessions", (req, res) => {
  const session = createSession();
  const scanUrl = `${req.protocol}://${req.get("host")}/scanner/mobile?session=${session.id}`;

  res.status(201).json({
    sessionId: session.id,
    scanUrl,
    expiresAt: session.expiresAt,
  });
});

router.get("/api/scanner/sessions/:sessionId", (req, res) => {
  const session = getActiveSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: "Scan session expired or not found." });
  }

  res.json({
    id: session.id,
    status: session.status,
    analysis: session.analysis,
    uploadedFile: session.uploadedFile
      ? {
          name: session.uploadedFile.name,
          type: session.uploadedFile.type,
          size: session.uploadedFile.size,
        }
      : null,
  });
});

router.post("/api/scanner/sessions/:sessionId/upload", (req, res) => {
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

  if (!file.dataUrl || file.dataUrl.length > 12 * 1024 * 1024) {
    return res.status(400).json({ message: "The uploaded file is too large." });
  }

  const extractedText = extractTextFromUploadedDocument(file);
  const analysis = classifySchoolDocument(extractedText);
  const careerPaths = analysis.isSchoolDocument ? recommendCareerPaths(analysis) : [];

  session.status = analysis.isSchoolDocument ? "school_document_ready" : "rejected_document";
  session.uploadedFile = {
    name: file.name,
    type: file.type,
    size: file.size,
  };
  session.analysis = {
    ...analysis,
    extractedTextPreview: extractedText.slice(0, 600),
    careerPaths,
    chatbotPrompt: analysis.isSchoolDocument
      ? `Use this scanned school document to recommend career paths. Grade: ${analysis.grade}. Subjects: ${analysis.subjects
          .map((subject) => `${subject.name} ${subject.mark}%`)
          .join(", ")}. Suggested paths: ${careerPaths.join(", ")}.`
      : null,
  };

  res.json({
    message: analysis.isSchoolDocument
      ? "Document received and accepted as a school document."
      : "Document received, but it does not look like a school document.",
    status: session.status,
    analysis: session.analysis,
  });
});

export default router;
