import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import route from "./routes/userRoutes.js"
import cookieParser from "cookie-parser";
import router from "./routes/adminRoute.js";
import chessRoutes from "./routes/chessRoutes.js";
import { registerChessSockets } from "./controllers/chessSocketController.js";
import documentScannerRoutes from "./routes/documentScannerRoutes.js";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __filepath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname , ".." ,"frontEnd")));
// app.use(express.static(path.join(__dirname , ".." ,"frontEnd" , "css")));
app.use(cookieParser())
app.use("/" , route)
app.use("/" , router)
app.use("/" , chessRoutes)
app.use("/" , documentScannerRoutes)
registerChessSockets(io);
// const port = 3000;
// httpServer.listen(port , ()=>{
//     console.log(`This web is running on http://localhost:${port}`);
// })
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
//Lucas Bohani Maluleke and Darren Foster
