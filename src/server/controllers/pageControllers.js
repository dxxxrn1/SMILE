import path from "path";
import { fileURLToPath } from "url";

const __filepath = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filepath);


export const homePage = (req, res)=>{
    res.sendFile(path.join(__dirname,"..",".." ,"frontEnd" , "htmlPages" , "home.html"));
}

export const loginPage = (req,res)=>{
    res.sendFile(path.join(__dirname,"..",".." ,"frontEnd" , "htmlPages" , "login.html"));
}

export const registerPage = (req,res)=>{

    res.sendFile(path.join(__dirname,"..",".." ,"frontEnd" , "htmlPages" , "register.html"));

}

export const studentLandingPage = (req,res)=>{
    res.sendFile(path.join(__dirname,"..",".." ,"frontEnd" , "htmlPages" , "studentdashboard.html"));
}

//Lucas Bohani Maluleke and Darren Foster