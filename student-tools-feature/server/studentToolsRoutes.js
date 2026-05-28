import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  createApplication,
  createCv,
  createForumPost,
  createVaultDocument,
  deleteVaultDocument,
  getAlerts,
  getApplications,
  getForumPosts,
  getVaultDocuments,
  moderateForumPost,
  updateApplication,
} from "./studentToolsController.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const featureRoot = path.join(__dirname, "..");

router.use("/api/student-tools", express.json({ limit: "12mb" }));

router.get("/student/tools", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "student-tools.html"));
});

router.get("/student/tools/cv-builder", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "cv-builder.html"));
});

router.get("/student/tools/applications", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "applications.html"));
});

router.get("/student/tools/document-vault", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "document-vault.html"));
});

router.get("/student/tools/opportunity-alerts", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "opportunity-alerts.html"));
});

router.get("/student/tools/community-forum", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "community-forum.html"));
});

router.get("/student-tools/studentTools.css", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "studentTools.css"));
});

router.get("/student-tools/studentTools.js", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "studentTools.js"));
});

router.post("/api/student-tools/cv", createCv);

router.get("/api/student-tools/applications", getApplications);
router.post("/api/student-tools/applications", createApplication);
router.patch("/api/student-tools/applications/:id", updateApplication);

router.get("/api/student-tools/vault", getVaultDocuments);
router.post("/api/student-tools/vault", createVaultDocument);
router.delete("/api/student-tools/vault/:id", deleteVaultDocument);

router.get("/api/student-tools/alerts", getAlerts);

router.get("/api/student-tools/forum", getForumPosts);
router.post("/api/student-tools/forum", createForumPost);
router.patch("/api/student-tools/forum/:id/moderate", moderateForumPost);

export default router;
