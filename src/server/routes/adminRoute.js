import express from "express";
import {
    getAllOrganisations,
    getOrganisationById,
    approveOrganisation,
    rejectOrganisation,
    deleteOrganisation,
    getAllStudents,
    deleteStudent,
} from "../controllers/adminController.js";
import { verifyToken , requireAdmin } from "../controllers/sessionControllers.js";
import {adminDashBoard} from "../controllers/pageControllers.js";

const router = express.Router();

router.get("/admin/dashboard",verifyToken,requireAdmin,adminDashBoard )

router.get(   "/admin/organisations",              verifyToken, requireAdmin, getAllOrganisations);
router.get(   "/admin/organisations/:orgId",       verifyToken, requireAdmin, getOrganisationById);
router.patch( "/admin/organisations/:orgId/approve", verifyToken, requireAdmin, approveOrganisation);
router.patch( "/admin/organisations/:orgId/reject",  verifyToken, requireAdmin, rejectOrganisation);
router.delete("/admin/organisations/:orgId",       verifyToken, requireAdmin, deleteOrganisation);
router.get(   "/admin/students",        verifyToken, requireAdmin, getAllStudents);
router.delete("/admin/students/:stuId", verifyToken, requireAdmin, deleteStudent);

export default router;