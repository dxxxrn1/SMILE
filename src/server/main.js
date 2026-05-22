import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import route from "./routes/userRoutes.js"
import cookieParser from "cookie-parser";
import router from "./routes/adminRoute.js";
const app = express();
const __filepath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname , ".." ,"frontEnd")));
// app.use(express.static(path.join(__dirname , ".." ,"frontEnd" , "css")));
app.use(cookieParser())
app.use("/" , route)
app.use("/" , router)
const port = 3000;
app.listen(port , ()=>{
    console.log(`This web is running on http://localhost:${port}`);
})

//Lucas Bohani Maluleke and Darren Foster
