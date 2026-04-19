import express from "express";
import { homePage , loginPage  , registerPage ,nearMePage, newsPage , opportunitiesPage,studentLandingPage,careersPage,orgDashboard} from "../controllers/pageControllers.js";
import {saveStudentDetails, saveOrganisationDetails , userLogin} from "../controllers/userControllers.js";
import { verifyToken } from "../controllers/sessionControllers.js";
import { fectNews } from "../apis/newsAPI.js";
import { fetchJobs } from "../apis/careers.js";
import { fetchBooks } from "../apis/booksAPI.js";

import {
  getCareerAdvice,
  generateDocFromChat,
  getMyInterests,
  saveInterests,
  getSavedDocs,
  getSingleDoc,
} from "../controllers/chatbotController.js";

const route = express.Router();

route.get("/" , homePage);

route.get("/login-page" , loginPage);

route.get("/register-page" , registerPage);

route.get("/student/dashboard",verifyToken , studentLandingPage);

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

export default route;

//Lucas Bohani Maluleke and Darren Foster
