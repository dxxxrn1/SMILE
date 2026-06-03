import express from "express";
import { sendOTP, verifyOTP } from '../controllers/otpController.js';
import { homePage , loginPage  , registerPage ,nearMePage, newsPage , opportunitiesPage,
        studentLandingPage,careersPage,orgDashboard,
        createOpportunity,adminDashBoard, applicantsPage, studentProfilePage, orgProfilePage, analyticsPage,
        orgTicketsPage, myOpportunitiesPage ,studentProfile, libraryPage
} from "../controllers/pageControllers.js";


import { forgotPasswordPage , resetPasswordPage} from "../controllers/pageControllers.js";
import {saveStudentDetails, saveOrganisationDetails , userLogin} from "../controllers/userControllers.js";
import { verifyToken , requireAdmin} from "../controllers/sessionControllers.js";
import { getOrgProfile, updateOrgProfile, getOrgPublicProfile } from "../controllers/orgController.js";
import { subscribeToNewsletter, unsubscribeFromNewsletter } from "../controllers/newsletterController.js";
import { fectNews } from "../apis/newsAPI.js";
import jwt from "jsonwebtoken";
import { logAudit } from "../controllers/auditController.js";
import { fetchJobs } from "../apis/careers.js";
import { fetchBooks } from "../apis/booksAPI.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import { connectToDB, sql } from "../dbConnection/dbconnection.js";
import {
  getCareerAdvice,
  generateDocFromChat,
  getMyInterests,
  saveInterests,
  getSavedDocs,
  getSingleDoc,
  getProfileBioAdvice,
} from "../controllers/chatbotController.js";
import {createNewOpportunity,getAllOpportunities, getOrganizationApplicants, getOrgDashboardStats, updateApplicationStatus, getOrgOpportunities, updateOpportunity, deleteOpportunity} from '../controllers/opportunitiesControllers.js';
import { getSavedOpportunities, getStudentApplications, deleteSavedOpportunity, saveOpportunity, applyForOpportunity, getStudentProfile, updateStudentProfile, updateStudentBio, getStudentNotifications, markStudentNotificationsRead } from "../controllers/studentController.js";
import { createTicket, getMyTickets } from "../controllers/ticketController.js";
import { getOrganizationAnalytics } from "../controllers/analyticsController.js";



const route = express.Router();

route.get("/" , homePage);
route.get("/login-page" , loginPage);
route.get("/register-page" , registerPage);
route.get("/student/dashboard",verifyToken , studentLandingPage);
route.get("/api/student/profile", verifyToken, getStudentProfile);
route.put("/api/student/profile", verifyToken, updateStudentProfile);
route.patch("/api/student/profile/bio", verifyToken, updateStudentBio);
route.post("/api/chat/profile-writer", verifyToken, getProfileBioAdvice);
route.get("/api/student/applications", verifyToken, getStudentApplications);
route.get("/api/student/notifications", verifyToken, getStudentNotifications);
route.patch("/api/student/notifications/read", verifyToken, markStudentNotificationsRead);
route.post("/api/student/notifications/read", verifyToken, markStudentNotificationsRead);
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
route.get("/student/library" ,verifyToken,libraryPage);
route.post("/login" , userLogin);
route.get('/api/news' , verifyToken ,fectNews);
route.get("/api/books", verifyToken ,fetchBooks);
route.get("/api/get-my-interests", verifyToken, getMyInterests);
route.post("/api/save-interests", verifyToken, saveInterests);
route.post("/api/chat", verifyToken, getCareerAdvice);
route.post("/api/generate-doc-from-chat", verifyToken, generateDocFromChat);
route.get("/api/saved-docs", verifyToken, getSavedDocs);
route.get("/api/saved-docs/:id", verifyToken, getSingleDoc);
route.all("/logout", async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const headerToken = authHeader && authHeader.split(' ')[1];
        const cookieToken = req.cookies?.token;
        const token = headerToken || cookieToken;

        if (token) {
            try {
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET);
                } catch (jwtErr) {
                    console.log("Logout token verification failed, using fallback decode:", jwtErr.message);
                    decoded = jwt.decode(token);
                }

                if (decoded) {
                    req.user = decoded;

                    // Clear IsLoggedIn session status in DB
                    try {
                        const pool = await connectToDB();
                        if (decoded.accountType === "student") {
                            await pool.request()
                                .input("id", sql.Int, decoded.id)
                                .query("UPDATE Student SET IsLoggedIn = 0 WHERE StuID = @id");
                        } else if (decoded.accountType === "organization") {
                            await pool.request()
                                .input("id", sql.Int, decoded.id)
                                .query("UPDATE Organisation SET IsLoggedIn = 0 WHERE OrgId = @id");
                        }
                    } catch (dbErr) {
                        console.error("Failed to update IsLoggedIn on logout:", dbErr);
                    }

                    await logAudit(req, "USER_LOGOUT", `User logged out successfully (${decoded.email || 'unknown'})`);
                }
            } catch (jwtErr) {
                console.log("Logout token validation failed:", jwtErr.message);
            }
        }
    } catch (err) {
        console.error("Logout error:", err);
    }

    res.clearCookie('token');
    if (req.method === 'POST') {
        return res.status(200).json({ success: true });
    } else {
        return res.redirect("/login-page");
    }
});
//resetPasswordPage
route.get("/api/jobs", fetchJobs);
route.get("/org/dashboard", verifyToken ,orgDashboard);
route.get("/org/profile", verifyToken, orgProfilePage);
route.get("/org/dashboard/applicants", verifyToken, applicantsPage);
route.get("/org/dashboard/myOpportunities", verifyToken, myOpportunitiesPage);
route.get("/org/dashboard/student-profile", verifyToken, studentProfilePage);
route.get("/api/org/profile", verifyToken, getOrgProfile);
route.put("/api/org/profile", verifyToken, updateOrgProfile);
route.get("/api/org/public-profile/:orgId", verifyToken, getOrgPublicProfile);
route.get("/api/org/applicants", verifyToken, getOrganizationApplicants);
route.get("/api/org/dashboard-stats", verifyToken, getOrgDashboardStats);
route.get("/api/org/analytics-overview", verifyToken, getOrganizationAnalytics);
route.patch("/api/org/applicants/:appId/status", verifyToken, updateApplicationStatus);
route.get("/org/analytics", verifyToken, analyticsPage);
route.get("/forgot-password" , forgotPasswordPage)
route.post("/forgot-password", forgotPassword);
route.post("/reset-password", resetPassword);
route.get("/reset-password", resetPasswordPage);
route.get('/org/dashboard/createOpportunity',verifyToken,createOpportunity);
route.post("/api/opportunities/create",verifyToken,createNewOpportunity);
route.get("/api/opportunities", verifyToken, getAllOpportunities);
route.get("/api/org/opportunities", verifyToken, getOrgOpportunities);
route.put("/api/opportunities/:oppId", verifyToken, updateOpportunity);
route.delete("/api/opportunities/:oppId", verifyToken, deleteOpportunity);
route.get("/student/profile" , verifyToken , studentProfile);
route.get("/api/student/profile" , verifyToken , getStudentProfile);

// /api/student/profile

// OTP email verification routes
route.post("/api/send-otp", sendOTP);
route.post("/api/verify-otp", verifyOTP);

// Newsletter subscription
route.post("/api/newsletter/subscribe", subscribeToNewsletter);
route.post("/api/newsletter/unsubscribe", unsubscribeFromNewsletter);

// Support Ticket routes
route.post("/api/tickets", verifyToken, createTicket);
route.get("/api/tickets/my", verifyToken, getMyTickets);
route.get("/org/tickets", verifyToken, orgTicketsPage);





export default route;

//Lucas Bohani Maluleke and Darren Foster
