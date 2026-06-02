import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import { logAudit } from "./auditController.js";

dotenv.config();

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.LUCAS_EMAIL,
    pass: process.env.LUCAS_APP_PASS,
  },
});

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PENDING_OFFSET = 1000000;

const sendMailSafely = async (options, label) => {
  try {
    await transport.sendMail(options);
    console.log(`${label} email sent to ${options.to}`);
  } catch (emailErr) {
    console.error(`${label} email failed (non-fatal):`, emailErr.message);
  }
};

const parseOrgId = (rawOrgId) => {
  const orgId = Number.parseInt(rawOrgId, 10);
  return Number.isInteger(orgId) && orgId > 0 ? orgId : null;
};

const isPendingDisplayId = (orgId) => orgId >= PENDING_OFFSET;

export const getAllOrganisations = async (req, res) => {
  try {
    const pool = await connectToDB();

    const results = await pool.request().query(`
      SELECT
        PendingId + ${PENDING_OFFSET} AS OrgId,
        OrgName,
        OrgEmail,
        Type,
        Province,
        Status,
        OrgDocument,
        DateCreated
      FROM PendingOrganisation
      UNION ALL
      SELECT
        OrgId,
        OrgName,
        OrgEmail,
        Type,
        Province,
        Status,
        OrgDocument,
        DateCreated
      FROM Organisation
      ORDER BY DateCreated DESC
    `);

    const orgs = results.recordset;
    const stats = {
      pending: orgs.filter((org) => org.Status === "Pending").length,
      active: orgs.filter((org) => org.Status === "Active").length,
      rejected: orgs.filter((org) => org.Status === "Rejected").length,
    };

    console.log(`Fetched ${orgs.length} organisations`);
    return res.status(200).json({ organisations: orgs, stats });
  } catch (err) {
    console.error("getAllOrganisations error:", err);
    return res.sendStatus(500);
  }
};

export const getOrganisationById = async (req, res) => {
  try {
    const orgId = parseOrgId(req.params.orgId);
    if (!orgId) {
      return res.status(400).json({ message: "Invalid organisation id." });
    }

    const pool = await connectToDB();
    const request = pool.request();
    let query;

    if (isPendingDisplayId(orgId)) {
      request.input("id", sql.Int, orgId - PENDING_OFFSET);
      query = `
        SELECT
          PendingId + ${PENDING_OFFSET} AS OrgId,
          OrgName,
          OrgEmail,
          Type,
          Province,
          Status,
          OrgDocument,
          DateCreated
        FROM PendingOrganisation
        WHERE PendingId = @id
      `;
    } else {
      request.input("id", sql.Int, orgId);
      query = `
        SELECT
          OrgId,
          OrgName,
          OrgEmail,
          Type,
          Province,
          Status,
          OrgDocument,
          DateCreated
        FROM Organisation
        WHERE OrgId = @id
      `;
    }

    const result = await request.query(query);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Organisation not found." });
    }

    return res.status(200).json({ organisation: result.recordset[0] });
  } catch (err) {
    console.error("getOrganisationById error:", err);
    return res.sendStatus(500);
  }
};

export const approveOrganisation = async (req, res) => {
  const orgId = parseOrgId(req.params.orgId);
  if (!orgId) {
    return res.status(400).json({ message: "Invalid organisation id." });
  }

  try {
    const pool = await connectToDB();

    if (!isPendingDisplayId(orgId)) {
      const existing = await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("SELECT OrgName, OrgEmail FROM Organisation WHERE OrgId = @orgId");

      if (existing.recordset.length === 0) {
        return res.status(404).json({ message: "Organisation not found." });
      }

      await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("UPDATE Organisation SET Status = 'Active' WHERE OrgId = @orgId");

      return res.status(200).json({ message: "Organisation approved successfully." });
    }

    const pendingId = orgId - PENDING_OFFSET;
    const pendingResult = await pool
      .request()
      .input("pendingId", sql.Int, pendingId)
      .query("SELECT * FROM PendingOrganisation WHERE PendingId = @pendingId");

    if (pendingResult.recordset.length === 0) {
      return res.status(404).json({ message: "Organisation not found in pending queue." });
    }

    const pendingOrg = pendingResult.recordset[0];

    if (!pendingOrg.OrgDocument) {
      return res.status(400).json({ message: "This organisation cannot be approved because no registration document was uploaded." });
    }

    const duplicate = await pool
      .request()
      .input("orgEmail", sql.VarChar, pendingOrg.OrgEmail)
      .query("SELECT OrgId FROM Organisation WHERE OrgEmail = @orgEmail");

    if (duplicate.recordset.length > 0) {
      return res.status(409).json({ message: "An approved organisation with this email already exists." });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      await transaction
        .request()
        .input("orgName", sql.VarChar, pendingOrg.OrgName)
        .input("orgEmail", sql.VarChar, pendingOrg.OrgEmail)
        .input("type", sql.VarChar, pendingOrg.Type)
        .input("province", sql.VarChar, pendingOrg.Province)
        .input("password", sql.VarChar, pendingOrg.Password)
        .input("orgDocument", sql.VarChar, pendingOrg.OrgDocument)
        .input("orgBio", sql.NVarChar, pendingOrg.OrgBio)
        .input("orgProfilePic", sql.VarChar, pendingOrg.OrgProfilePic)
        .query(`
          INSERT INTO Organisation (OrgName, OrgEmail, Type, Province, Password, Status, OrgDocument, OrgBio, OrgProfilePic)
          VALUES (@orgName, @orgEmail, @type, @province, @password, 'Active', @orgDocument, @orgBio, @orgProfilePic)
        `);

      await transaction
        .request()
        .input("pendingId", sql.Int, pendingId)
        .query("DELETE FROM PendingOrganisation WHERE PendingId = @pendingId");

      await transaction.commit();
    } catch (transactionErr) {
      await transaction.rollback();
      throw transactionErr;
    }

    await sendMailSafely(
      {
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: pendingOrg.OrgEmail,
        subject: "Your SMILE account has been approved",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Congratulations, ${pendingOrg.OrgName}!</h2>
            <p style="color:#374151;line-height:1.6;">Your organisation's SMILE account has been approved.</p>
            <p style="color:#374151;line-height:1.6;">You can now log in to your dashboard to post opportunities and connect with South African youth.</p>
            <a href="${APP_URL}/login-page" style="display:inline-block;margin-top:8px;padding:12px 28px;background:#10B981;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Log in to your dashboard</a>
          </div>
        `,
      },
      "Approval"
    );

    console.log(`Organisation "${pendingOrg.OrgName}" approved and moved to Organisation table.`);
    await logAudit(req, "APPROVE_ORGANISATION", `Approved organisation "${pendingOrg.OrgName}" (Email: ${pendingOrg.OrgEmail})`);
    return res.status(200).json({ message: "Organisation approved successfully." });
  } catch (err) {
    console.error("approveOrganisation error:", err);
    return res.sendStatus(500);
  }
};

export const rejectOrganisation = async (req, res) => {
  const orgId = parseOrgId(req.params.orgId);
  if (!orgId) {
    return res.status(400).json({ message: "Invalid organisation id." });
  }

  try {
    const { reason = "Your application did not meet our current requirements." } = req.body || {};
    const pool = await connectToDB();

    if (!isPendingDisplayId(orgId)) {
      const existing = await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("SELECT OrgName, OrgEmail FROM Organisation WHERE OrgId = @orgId");

      if (existing.recordset.length === 0) {
        return res.status(404).json({ message: "Organisation not found." });
      }

      await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("UPDATE Organisation SET Status = 'Rejected' WHERE OrgId = @orgId");

      return res.status(200).json({ message: "Organisation rejected." });
    }

    const pendingId = orgId - PENDING_OFFSET;
    const pendingResult = await pool
      .request()
      .input("pendingId", sql.Int, pendingId)
      .query("SELECT * FROM PendingOrganisation WHERE PendingId = @pendingId");

    if (pendingResult.recordset.length === 0) {
      return res.status(404).json({ message: "Organisation not found." });
    }

    const pendingOrg = pendingResult.recordset[0];

    await pool
      .request()
      .input("pendingId", sql.Int, pendingId)
      .query("DELETE FROM PendingOrganisation WHERE PendingId = @pendingId");

    await sendMailSafely(
      {
        from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
        to: pendingOrg.OrgEmail,
        subject: "Update on your SMILE registration",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <h2 style="color:#111827;margin-bottom:8px;">Update on your application, ${pendingOrg.OrgName}</h2>
            <p style="color:#374151;line-height:1.6;">Thank you for your interest in joining SMILE. After reviewing your application, we are unable to approve your account at this time.</p>
            <div style="background:#FEE2E2;border-left:4px solid #EF4444;padding:16px;border-radius:4px;margin:24px 0;">
              <p style="margin:0;color:#991B1B;font-weight:600;">Application not approved</p>
              <p style="margin:8px 0 0;color:#7F1D1D;font-size:14px;">${reason}</p>
            </div>
          </div>
        `,
      },
      "Rejection"
    );

    console.log(`Pending organisation ${orgId} rejected and removed from pending queue.`);
    await logAudit(req, "REJECT_ORGANISATION", `Rejected pending organisation "${pendingOrg.OrgName}" (Email: ${pendingOrg.OrgEmail}). Reason: ${reason}`);
    return res.status(200).json({ message: "Organisation rejected." });
  } catch (err) {
    console.error("rejectOrganisation error:", err);
    return res.sendStatus(500);
  }
};

export const deleteOrganisation = async (req, res) => {
  const orgId = parseOrgId(req.params.orgId);
  if (!orgId) {
    return res.status(400).json({ message: "Invalid organisation id." });
  }

  try {
    const pool = await connectToDB();

    if (isPendingDisplayId(orgId)) {
      const pendingId = orgId - PENDING_OFFSET;
      const check = await pool
        .request()
        .input("pendingId", sql.Int, pendingId)
        .query("SELECT PendingId FROM PendingOrganisation WHERE PendingId = @pendingId");

      if (check.recordset.length === 0) {
        return res.status(404).json({ message: "Organisation not found." });
      }

      await pool
        .request()
        .input("pendingId", sql.Int, pendingId)
        .query("DELETE FROM PendingOrganisation WHERE PendingId = @pendingId");
    } else {
      const check = await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("SELECT OrgId FROM Organisation WHERE OrgId = @orgId");

      if (check.recordset.length === 0) {
        return res.status(404).json({ message: "Organisation not found." });
      }

      await pool
        .request()
        .input("orgId", sql.Int, orgId)
        .query("DELETE FROM Organisation WHERE OrgId = @orgId");
    }

    console.log(`Organisation ${orgId} deleted.`);
    await logAudit(req, "DELETE_ORGANISATION", `Deleted organisation ID: ${orgId}`);
    return res.status(200).json({ message: "Organisation deleted successfully." });
  } catch (err) {
    console.error("deleteOrganisation error:", err);
    return res.sendStatus(500);
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const pool = await connectToDB();

    const results = await pool.request().query(`
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

    console.log(`Fetched ${results.recordset.length} students`);
    return res.status(200).json({ students: results.recordset });
  } catch (err) {
    console.error("getAllStudents error:", err);
    return res.sendStatus(500);
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const stuId = Number.parseInt(req.params.stuId, 10);
    if (!Number.isInteger(stuId) || stuId <= 0) {
      return res.status(400).json({ message: "Invalid student id." });
    }

    const pool = await connectToDB();
    const check = await pool
      .request()
      .input("stuId", sql.Int, stuId)
      .query("SELECT StuID FROM Student WHERE StuID = @stuId");

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    await pool
      .request()
      .input("stuId", sql.Int, stuId)
      .query("DELETE FROM Student WHERE StuID = @stuId");

    console.log(`Student ${stuId} deleted.`);
    await logAudit(req, "DELETE_STUDENT", `Deleted student ID: ${stuId}`);
    return res.status(200).json({ message: "Student deleted successfully." });
  } catch (err) {
    console.error("deleteStudent error:", err);
    return res.sendStatus(500);
  }
};
