import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
import {sql, connectToDB} from "../dbConnection/dbconnection.js";



 const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.LUCAS_EMAIL,
                pass: process.env.LUCAS_APP_PASS
            }
});

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
// export const approveOrganisation = async (req, res) => {
//     try {
//         const { orgId } = req.params;
//         const pool = await connectToDB();

//         // Check org exists first
//         const check = await pool
//             .request()
//             .input("orgId", sql.Int, orgId)
//             .query(`SELECT OrgId, OrgName FROM Organisation WHERE OrgId = @orgId`);

//         if (check.recordset.length === 0) {
//             return res.status(404).json({ message: "Organisation not found" });
//         }

//         await pool
//             .request()
//             .input("orgId", sql.Int, orgId)
//             .query(`UPDATE Organisation SET Status = 'Active' WHERE OrgId = @orgId`);

//         console.log(`✅ Organisation ${orgId} approved`);
//         return res.status(200).json({ message: "Organisation approved successfully" });

//     } catch (err) {
//         console.error("❌ approveOrganisation error:", err);
//         return res.sendStatus(500);
//     }
// };

// // ─────────────────────────────────────────────
// // PATCH  /admin/organisations/:orgId/reject
// // ─────────────────────────────────────────────
// export const rejectOrganisation = async (req, res) => {
//     try {
//         const { orgId } = req.params;
//         const pool = await connectToDB();

//         const check = await pool
//             .request()
//             .input("orgId", sql.Int, orgId)
//             .query(`SELECT OrgId, OrgName FROM Organisation WHERE OrgId = @orgId`);

//         if (check.recordset.length === 0) {
//             return res.status(404).json({ message: "Organisation not found" });
//         }

//         await pool
//             .request()
//             .input("orgId", sql.Int, orgId)
//             .query(`UPDATE Organisation SET Status = 'Rejected' WHERE OrgId = @orgId`);

//         console.log(`✅ Organisation ${orgId} rejected`);
//         return res.status(200).json({ message: "Organisation rejected" });

//     } catch (err) {
//         console.error("❌ rejectOrganisation error:", err);
//         return res.sendStatus(500);
//     }
// };

export const approveOrganisation = async (req, res) => {
  try {
    const { orgId } = req.params;
    const pool = await connectToDB();
 
    // Fetch org details so we can personalise the email
    const check = await pool
      .request()
      .input("orgId", sql.Int, orgId)
      .query("SELECT OrgId, OrgName, OrgEmail FROM Organisation WHERE OrgId = @orgId");
 
    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Organisation not found." });
    }
 
    const { OrgName, OrgEmail } = check.recordset[0];
 
    // Update status to Active
    await pool
      .request()
      .input("orgId", sql.Int, orgId)
      .query("UPDATE Organisation SET Status = 'Active' WHERE OrgId = @orgId");
 
    console.log(`✅ Organisation ${orgId} approved`);
 
    // Send approval email
    try {
      await transporter.sendMail({
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: OrgEmail,
        subject: "🎉 Your SMILE Account Has Been Approved!",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Congratulations, ${OrgName}! 🎉</h2>
            <p style="color:#374151;line-height:1.6;">
              We are pleased to inform you that your organisation's account on
              <strong>SMILE</strong> has been <strong>approved</strong>.
            </p>
            <div style="background:#D1FAE5;border-left:4px solid #10B981;padding:16px;border-radius:4px;margin:24px 0;">
              <p style="margin:0;color:#065F46;font-weight:600;">✅ Your account is now active</p>
              <p style="margin:8px 0 0;color:#047857;font-size:14px;">
                You can now log in to your dashboard to post opportunities and connect
                with South African youth.
              </p>
            </div>
            <a href="${process.env.APP_URL || "http://localhost:3000"}/login-page"
               style="display:inline-block;margin-top:8px;padding:12px 28px;
                      background:#10B981;color:#fff;text-decoration:none;
                      border-radius:6px;font-weight:600;font-size:15px;">
              Log In to Your Dashboard →
            </a>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px;">
            <p style="color:#9CA3AF;font-size:12px;text-align:center;">
              © SMILE Platform — Empowering South African Youth
            </p>
          </div>
        `,
      });
      console.log(`📧 Approval email sent to ${OrgEmail}`);
    } catch (emailErr) {
      console.error("Approval email failed (non-fatal):", emailErr.message);
    }
 
    return res.status(200).json({ message: "Organisation approved successfully." });
 
  } catch (err) {
    console.error("❌ approveOrganisation error:", err);
    return res.sendStatus(500);
  }
};
 
// ─── PATCH /admin/organisations/:orgId/reject ─────────────────────────────────
export const rejectOrganisation = async (req, res) => {
  try {
    const { orgId } = req.params;
    // Optional rejection reason from the request body
    const { reason = "Your application did not meet our current requirements." } = req.body;
 
    const pool = await connectToDB();
 
    const check = await pool
      .request()
      .input("orgId", sql.Int, orgId)
      .query("SELECT OrgId, OrgName, OrgEmail FROM Organisation WHERE OrgId = @orgId");
 
    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Organisation not found." });
    }
 
    const { OrgName, OrgEmail } = check.recordset[0];
 
    // Update status to Rejected
    await pool
      .request()
      .input("orgId", sql.Int, orgId)
      .query("UPDATE Organisation SET Status = 'Rejected' WHERE OrgId = @orgId");
 
    console.log(`✅ Organisation ${orgId} rejected`);
 
    // Send rejection email
    try {
      await transporter.sendMail({
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: OrgEmail,
        subject: "Update on Your SMILE Registration",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Update on Your Application, ${OrgName}</h2>
            <p style="color:#374151;line-height:1.6;">
              Thank you for your interest in joining the <strong>SMILE platform</strong>.
              After reviewing your application, we are unable to approve your account at this time.
            </p>
            <div style="background:#FEE2E2;border-left:4px solid #EF4444;padding:16px;border-radius:4px;margin:24px 0;">
              <p style="margin:0;color:#991B1B;font-weight:600;">❌ Application not approved</p>
              <p style="margin:8px 0 0;color:#7F1D1D;font-size:14px;">${reason}</p>
            </div>
            <p style="color:#374151;line-height:1.6;">
              If you believe this is an error or would like more information,
              please contact us at
              <a href="mailto:${process.env.LUCAS_EMAIL}" style="color:#3B82F6;">
                ${process.env.LUCAS_EMAIL}
              </a>.
            </p>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px;">
            <p style="color:#9CA3AF;font-size:12px;text-align:center;">
              © SMILE Platform — Empowering South African Youth
            </p>
          </div>
        `,
      });
      console.log(`📧 Rejection email sent to ${OrgEmail}`);
    } catch (emailErr) {
      console.error("Rejection email failed (non-fatal):", emailErr.message);
    }
 
    return res.status(200).json({ message: "Organisation rejected." });
 
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