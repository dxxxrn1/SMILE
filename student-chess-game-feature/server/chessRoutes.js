import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const featureRoot = path.join(__dirname, "..");

router.get("/student/chess", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "chess.html"));
});

router.get("/student-chess/smileChess.css", (req, res) => {
  res.sendFile(path.join(featureRoot, "frontEnd", "smileChess.css"));
});

export default router;

