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

export const nearMePage = (req,res)=>{
    res.sendFile(path.join(__dirname, ".." , ".." , "frontEnd" , "htmlPages" , "nearme.html"));
}

export const newsPage = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages","news.html"));
}

export const opportunitiesPage = (req,res)=>{
    res.sendFile(path.join(__dirname,".." , ".." , "frontEnd" , "htmlPages", "opportunities.html"));
}

export const careersPage = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd","htmlPages" , "careers.html"));
}
                                                                                    //orgdashboard
export const orgDashboard = (req,res)=>{
    res.sendFile(path.join(__dirname, ".." , ".." , "frontEnd" , "htmlPages", "orgdashboard.html"));
}

export const applicantsPage = (req,res)=>{
    res.sendFile(path.join(__dirname, ".." , ".." , "frontEnd" , "htmlPages", "applicants.html"));
}

export const studentProfilePage = (req,res)=>{
    res.sendFile(path.join(__dirname, ".." , ".." , "frontEnd" , "htmlPages", "studentProfile.html"));
}

export const forgotPasswordPage = (req,res)=>{
    res.sendFile(path.join(__dirname, ".." , ".." , "frontEnd" ,"htmlPages" , "forget-password.html"));
}

export const resetPasswordPage = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "reset-password.html"));
}

export const createOpportunity = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "createOpportunity.html"));
}

export const adminDashBoard = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "admin.html"));
}

export const analyticsPage = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "analytics.html"));
}

export const userModeration = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "userModeration.html"));
}

export const userTicket = (req,res)=>{
    res.sendFile(path.join(__dirname , ".." , ".." , "frontEnd" , "htmlPages" , "userTicket.html"));
}

//Lucas Bohani Maluleke and Darren Foster