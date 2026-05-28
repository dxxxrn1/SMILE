import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "../controllers/sessionControllers.js";
import { registerChessApiRoutes } from "../controllers/chessSocketController.js";

const route = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontEndRoot = path.join(__dirname, "..", "..", "frontEnd");

route.get("/student/chess", verifyToken, (req, res) => {
  res.sendFile(path.join(frontEndRoot, "htmlPages", "chess.html"));
});

registerChessApiRoutes(route);

export default route;
