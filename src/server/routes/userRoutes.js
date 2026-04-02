import express from "express";
import { homePage , loginPage  , registerPage ,nearMePage, newsPage , opportunitiesPage,studentLandingPage,careersPage } from "../controllers/pageControllers.js";
import {saveStudentDetails, saveOrganisationDetails , userLogin} from "../controllers/userControllers.js";

const route = express.Router();

route.get("/" , homePage);

route.get("/login-page" , loginPage);

route.get("/register-page" , registerPage);

route.get("/student/dashboard",studentLandingPage);

route.post("/register/student" , saveStudentDetails);

route.post("/register/organization" , saveOrganisationDetails);

route.get("/near/me" , nearMePage);

route.get("/news/daily" , newsPage);

route.get("/opportunities/browse", opportunitiesPage)

route.get("/careers/explore" , careersPage);

route.post("/login" , userLogin)

export default route;

//Lucas Bohani Maluleke and Darren Foster
