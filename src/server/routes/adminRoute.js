import express from "express";
import cron from "node-cron";
import {getAllOrganisations, getOrganisationById, approveOrganisation, rejectOrganisation, deleteOrganisation, getAllStudents, deleteStudent} from "../controllers/adminController.js";
import { verifyToken , requireAdmin } from "../controllers/sessionControllers.js";
import {adminDashBoard, userModeration, userTicket} from "../controllers/pageControllers.js";
import {getAllUsers, getUserStats, getUserById, suspendUser, unsuspendUser, deleteUser} from "../controllers/userModerationController.js";
import { getAllTickets, updateTicketStatus } from "../controllers/ticketController.js";
import {sendNewsletterToSubscribers } from "../controllers/newsletterSenderController.js";



const router = express.Router();

cron.schedule("0 8 * * *", async () => {

    console.log("Sending daily newsletter...");

    try {

        await sendNewsletterToSubscribersJob();

        console.log("Daily newsletter sent.");

    } catch (err) {

        console.error("Newsletter job failed:", err);

    }
});

router.get("/admin/dashboard",verifyToken,requireAdmin,adminDashBoard)
router.get("/admin/organisations",verifyToken, requireAdmin, getAllOrganisations);
router.get("/admin/organisations/:orgId",verifyToken, requireAdmin, getOrganisationById);
router.patch("/admin/organisations/:orgId/approve",verifyToken, requireAdmin, approveOrganisation);
router.patch("/admin/organisations/:orgId/reject", verifyToken, requireAdmin, rejectOrganisation);
router.delete("/admin/organisations/:orgId",verifyToken, requireAdmin, deleteOrganisation);
router.get("/admin/students",verifyToken, requireAdmin, getAllStudents);
router.delete("/admin/students/:stuId", verifyToken, requireAdmin, deleteStudent);
router.get("/admin/user-moderation",verifyToken, requireAdmin, userModeration);
router.get("/admin/userTicket",verifyToken, requireAdmin, userTicket);
router.get("/admin/users/stats",verifyToken, requireAdmin, getUserStats);
router.get("/admin/users",verifyToken, requireAdmin, getAllUsers);
router.get("/admin/users/:id",verifyToken, requireAdmin, getUserById);
router.patch("/admin/users/:id/suspend",verifyToken, requireAdmin, suspendUser);
router.patch("/admin/users/:id/unsuspend",verifyToken, requireAdmin, unsuspendUser);
router.delete("/admin/users/:id",verifyToken, requireAdmin, deleteUser);

router.post("/send-newsletter",verifyToken,requireAdmin,sendNewsletterToSubscribers);

// Admin support ticket routes
router.get("/admin/api/tickets", verifyToken, requireAdmin, getAllTickets);
router.patch("/admin/api/tickets/:id", verifyToken, requireAdmin, updateTicketStatus);

export default router;
