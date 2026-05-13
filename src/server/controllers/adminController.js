import dotenv from "dotenv";
dotenv.config();
import {sql, connectToDB} from "../dbConnection/dbconnection.js";


// export const adminDashBoard = (req, res) => {
//     res.sendFile("admindashboard.html", { root: "./views/admin" });
// };

// ─────────────────────────────────────────────
// GET  /admin/organisations  →  get ALL orgs with status counts
// ─────────────────────────────────────────────
export const getAllOrganisations = async (req, res) => {
    try {
        const pool = await connectToDB();

        const results = await pool
            .request()
            .query(`
                SELECT 
                    OrgId,
                    OrgName,
                    OrgEmail,
                    Type,
                    Province,
                    Status,
                    DateCreated
                FROM Organisation
                ORDER BY DateCreated DESC
            `);

        // Count stats for the dashboard header cards
        const orgs = results.recordset;
        const stats = {
            pending:  orgs.filter(o => o.Status === "Pending").length,
            active:   orgs.filter(o => o.Status === "Active").length,
            rejected: orgs.filter(o => o.Status === "Rejected").length,
        };

        console.log(`✅ Fetched ${orgs.length} organisations`);
        return res.status(200).json({ organisations: orgs, stats });

    } catch (err) {
        console.error("❌ getAllOrganisations error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// GET  /admin/organisations/:orgId  →  single org details
// ─────────────────────────────────────────────
export const getOrganisationById = async (req, res) => {
    try {
        const { orgId } = req.params;
        const pool = await connectToDB();

        const result = await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`
                SELECT 
                    OrgId,
                    OrgName,
                    OrgEmail,
                    Type,
                    Province,
                    Status,
                    DateCreated
                FROM Organisation
                WHERE OrgId = @orgId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Organisation not found" });
        }

        return res.status(200).json({ organisation: result.recordset[0] });

    } catch (err) {
        console.error("❌ getOrganisationById error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// PATCH  /admin/organisations/:orgId/approve
// ─────────────────────────────────────────────
export const approveOrganisation = async (req, res) => {
    try {
        const { orgId } = req.params;
        const pool = await connectToDB();

        // Check org exists first
        const check = await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`SELECT OrgId, OrgName FROM Organisation WHERE OrgId = @orgId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ message: "Organisation not found" });
        }

        await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`UPDATE Organisation SET Status = 'Active' WHERE OrgId = @orgId`);

        console.log(`✅ Organisation ${orgId} approved`);
        return res.status(200).json({ message: "Organisation approved successfully" });

    } catch (err) {
        console.error("❌ approveOrganisation error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// PATCH  /admin/organisations/:orgId/reject
// ─────────────────────────────────────────────
export const rejectOrganisation = async (req, res) => {
    try {
        const { orgId } = req.params;
        const pool = await connectToDB();

        const check = await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`SELECT OrgId, OrgName FROM Organisation WHERE OrgId = @orgId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ message: "Organisation not found" });
        }

        await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`UPDATE Organisation SET Status = 'Rejected' WHERE OrgId = @orgId`);

        console.log(`✅ Organisation ${orgId} rejected`);
        return res.status(200).json({ message: "Organisation rejected" });

    } catch (err) {
        console.error("❌ rejectOrganisation error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// DELETE  /admin/organisations/:orgId  →  delete an org
// ─────────────────────────────────────────────
export const deleteOrganisation = async (req, res) => {
    try {
        const { orgId } = req.params;
        const pool = await connectToDB();

        const check = await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`SELECT OrgId FROM Organisation WHERE OrgId = @orgId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ message: "Organisation not found" });
        }

        await pool
            .request()
            .input("orgId", sql.Int, orgId)
            .query(`DELETE FROM Organisation WHERE OrgId = @orgId`);

        console.log(`✅ Organisation ${orgId} deleted`);
        return res.status(200).json({ message: "Organisation deleted successfully" });

    } catch (err) {
        console.error("❌ deleteOrganisation error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// GET  /admin/students  →  get ALL students
// ─────────────────────────────────────────────
export const getAllStudents = async (req, res) => {
    try {
        const pool = await connectToDB();

        const results = await pool
            .request()
            .query(`
                SELECT 
                    StuID,
                    StuName,
                    StuLastName,
                    StuEmail,
                    Province,
                    EducationLevel,
                    DateCreated
                FROM Student
                ORDER BY DateCreated DESC
            `);

        console.log(`✅ Fetched ${results.recordset.length} students`);
        return res.status(200).json({ students: results.recordset });

    } catch (err) {
        console.error("❌ getAllStudents error:", err);
        return res.sendStatus(500);
    }
};

// ─────────────────────────────────────────────
// DELETE  /admin/students/:stuId  →  delete a student
// ─────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
    try {
        const { stuId } = req.params;
        const pool = await connectToDB();

        const check = await pool
            .request()
            .input("stuId", sql.Int, stuId)
            .query(`SELECT StuID FROM Student WHERE StuID = @stuId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        await pool
            .request()
            .input("stuId", sql.Int, stuId)
            .query(`DELETE FROM Student WHERE StuID = @stuId`);

        console.log(`✅ Student ${stuId} deleted`);
        return res.status(200).json({ message: "Student deleted successfully" });

    } catch (err) {
        console.error("❌ deleteStudent error:", err);
        return res.sendStatus(500);
    }
};