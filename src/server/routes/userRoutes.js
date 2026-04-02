import express from "express";
import { homePage , loginPage  , registerPage ,nearMePage, newsPage , opportunitiesPage,studentLandingPage,careersPage } from "../controllers/pageControllers.js";
import {saveStudentDetails, saveOrganisationDetails , userLogin} from "../controllers/userControllers.js";
import { verifyToken } from "../controllers/sessionControllers.js";

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

route.post("/login" , userLogin)

route.post("/logout", (req, res) => {

    res.clearCookie('token');

    return res.sendStatus(200);

    //Lucas Bohani Maluleke

});

export default route;

//Lucas Bohani Maluleke and Darren Foster
