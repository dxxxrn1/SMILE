import express from "express";
import { homePage , loginPage  , registerPage ,nearMePage, newsPage , opportunitiesPage,
        studentLandingPage,careersPage,orgDashboard,
        createOpportunity,adminDashBoard, applicantsPage, studentProfilePage
} from "../controllers/pageControllers.js";
import { forgotPasswordPage , resetPasswordPage} from "../controllers/pageControllers.js";
import {saveStudentDetails, saveOrganisationDetails , userLogin} from "../controllers/userControllers.js";
import { verifyToken , requireAdmin} from "../controllers/sessionControllers.js";
import { fectNews } from "../apis/newsAPI.js";
import { fetchJobs } from "../apis/careers.js";
import { fetchBooks } from "../apis/booksAPI.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
// import {createOpportunity} from '../controllers/pageControllers.js'
//createOpportunitiesPage
import {
  getCareerAdvice,
  generateDocFromChat,
  getMyInterests,
  saveInterests,
  getSavedDocs,
  getSingleDoc,
} from "../controllers/chatbotController.js";
import {createNewOpportunity,getAllOpportunities, getOrganizationApplicants} from "../controllers/opportunitiesControllers.js";
import { getSavedOpportunities, getStudentApplications, deleteSavedOpportunity, saveOpportunity, applyForOpportunity } from "../controllers/studentController.js";

const route = express.Router();

route.get("/" , homePage);
route.get("/login-page" , loginPage);
route.get("/register-page" , registerPage);
route.get("/student/dashboard",verifyToken , studentLandingPage);
route.get("/api/student/applications", verifyToken, getStudentApplications);
route.post("/api/student/applications", verifyToken, applyForOpportunity);
route.get("/api/student/saved-opportunities", verifyToken, getSavedOpportunities);
route.post("/api/student/saved-opportunities", verifyToken, saveOpportunity);
route.delete("/api/student/saved-opportunities/:oppId", verifyToken, deleteSavedOpportunity);
route.post("/register/student" , saveStudentDetails);
route.post("/register/organization" , saveOrganisationDetails);
route.get("/near/me" , verifyToken,nearMePage);
route.get("/news/daily" ,verifyToken ,newsPage);
route.get("/opportunities/browse", verifyToken,opportunitiesPage)
route.get("/careers/explore" ,verifyToken,careersPage);
route.post("/login" , userLogin);
route.get('/api/news' , verifyToken ,fectNews);
route.get("/api/books", verifyToken ,fetchBooks);
route.get("/api/get-my-interests", verifyToken, getMyInterests);
route.post("/api/save-interests", verifyToken, saveInterests);
route.post("/api/chat", verifyToken, getCareerAdvice);
route.post("/api/generate-doc-from-chat", verifyToken, generateDocFromChat);
route.get("/api/saved-docs", verifyToken, getSavedDocs);
route.get("/api/saved-docs/:id", verifyToken, getSingleDoc);
route.post("/logout", (req, res) => {
    res.clearCookie('token');
    return res.sendStatus(200);
    //Lucas Bohani Maluleke
});
route.get("/api/jobs", fetchJobs);
route.get("/org/dashboard", verifyToken ,orgDashboard);
route.get("/org/dashboard/applicants", verifyToken, applicantsPage);
route.get("/org/dashboard/student-profile", verifyToken, studentProfilePage);
route.get("/api/org/applicants", verifyToken, getOrganizationApplicants);
route.get("/forgot-password" , forgotPasswordPage)
route.post("/forgot-password", forgotPassword);
route.post("/reset-password", resetPassword);
route.get("/reset-password", resetPasswordPage);
route.get('/org/dashboard/createOpportunity',verifyToken,createOpportunity);
route.post("/api/opportunities/create",verifyToken,createNewOpportunity);
route.get("/api/opportunities", verifyToken, getAllOpportunities);
// route.get("/admin/dashboard",verifyToken,requireAdmin,adminDashBoard )

export default route;

//Lucas Bohani Maluleke and Darren Foster
