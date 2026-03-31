import express from "express";

import { homePage , loginPage  , registerPage , studentLandingPage} from "../controllers/pageControllers.js";


const route = express.Router();

route.get("/" , homePage);

route.get("/login-page" , loginPage);

route.get("/register-page" , registerPage);

route.get("/student/dashboard",studentLandingPage)


export default route;

//Lucas Bohani Maluleke and Darren Foster
