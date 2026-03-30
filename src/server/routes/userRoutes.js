import express from "express";

import { homePage , loginPage  , registerPage} from "../controllers/pageControllers.js";


const route = express.Router();

route.get("/" , homePage);

route.get("/login-page" , loginPage);

route.get("/register-page" , registerPage);


export default route;

//Lucas Bohani Maluleke and Darren Foster
