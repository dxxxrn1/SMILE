import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import { logAudit } from "./auditController.js";
import nodemailer from "nodemailer";

/**
 * ID CONVENTION
 * Because Student and Organisation live in separate tables with separate
 * auto-increment PKs, every record is given a synthetic _id string:
 *   "stu_<StuID>"   for students
 *   "org_<OrgId>"   for organisations
 *
 * The frontend stores and sends this string. Every function that receives
 * an :id param calls parseId() to recover the table and the real numeric PK.
 */
function parseId(rawId = "") {
  if (rawId.startsWith("stu_")) return { table: "student", numericId: parseInt(rawId.slice(4)) };
  if (rawId.startsWith("org_")) return { table: "org",     numericId: parseInt(rawId.slice(4)) };
  return null;
}

// ─── GET /admin/users ─────────────────────────────────────────────────────────
/**
 * Returns all students + organisations as a unified list.
 * Optional query params: ?role=student|org  &status=active|suspended
 */
export const getAllUsers = async (req, res) => {
  try {
    const pool = await connectToDB();
    const { role, status } = req.query;

    // ── Students ──────────────────────────────────────────────────────────────
    let stuQuery = `
      SELECT
        'stu_' + CAST(StuID AS NVARCHAR) AS _id,
        StuName + ' ' + StuLastName      AS name,
        StuEmail                          AS email,
        'student'                         AS role,
        ISNULL(Status, 'active')          AS status,
        DateCreated                       AS createdAt
      FROM Student
      WHERE 1 = 1
    `;

    // ── Organisations ─────────────────────────────────────────────────────────
    let orgQuery = `
      SELECT
        'org_' + CAST(OrgId AS NVARCHAR) AS _id,
        OrgName                           AS name,
        OrgEmail                          AS email,
        'org'                             AS role,
        ISNULL(Status, 'active')          AS status,
        DateCreated                       AS createdAt
      FROM Organisation
      WHERE 1 = 1
    `;

    const stuRequest = pool.request();
    const orgRequest = pool.request();

    // Apply status filter to both tables
    if (status && ["active", "suspended"].includes(status)) {
      stuRequest.input("status", sql.NVarChar, status);
      orgRequest.input("status", sql.NVarChar, status);
      stuQuery += " AND ISNULL(Status, 'active') = @status";
      orgQuery += " AND ISNULL(Status, 'active') = @status";
    }

    let students = [];
    let orgs     = [];

    // Only query the tables needed based on the role filter
    if (!role || role === "student") {
      const stuResult = await stuRequest.query(stuQuery);
      students = stuResult.recordset;
    }

    if (!role || role === "org") {
      const orgResult = await orgRequest.query(orgQuery);
      orgs = orgResult.recordset;
    }

    // Merge and sort by createdAt descending
    const users = [...students, ...orgs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("getAllUsers:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve users." });
  }
};

// ─── GET /admin/users/stats ───────────────────────────────────────────────────
/**
 * Returns total, suspended, student and org counts for the header stat cards.
 */
export const getUserStats = async (req, res) => {
  try {
    const pool = await connectToDB();

    const [stuResult, orgResult] = await Promise.all([
      pool.request().query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ISNULL(Status, 'active') = 'suspended' THEN 1 ELSE 0 END) AS suspended
        FROM Student
      `),
      pool.request().query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ISNULL(Status, 'active') = 'suspended' THEN 1 ELSE 0 END) AS suspended
        FROM Organisation
      `),
    ]);

    const stuStats = stuResult.recordset[0];
    const orgStats = orgResult.recordset[0];

    const stats = {
      total:     stuStats.total     + orgStats.total,
      suspended: stuStats.suspended + orgStats.suspended,
      students:  stuStats.total,
      orgs:      orgStats.total,
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("getUserStats:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve stats." });
  }
};

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────
/**
 * Returns a single user's profile.
 * :id must be in the form "stu_<n>" or "org_<n>"
 */
export const getUserById = async (req, res) => {
  const parsed = parseId(req.params.id);
  if (!parsed) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }

  try {
    const pool = await connectToDB();
    let result;

    if (parsed.table === "student") {
      result = await pool
        .request()
        .input("id", sql.Int, parsed.numericId)
        .query(`
          SELECT
            'stu_' + CAST(StuID AS NVARCHAR) AS _id,
            StuName + ' ' + StuLastName      AS name,
            StuEmail                          AS email,
            'student'                         AS role,
            ISNULL(Status, 'active')          AS status,
            DateCreated                       AS createdAt,
            StuProvince                       AS province,
            StuEducationLevel                 AS educationLevel,
            ProfilePicUrl                     AS profilePicUrl
          FROM Student
          WHERE StuID = @id
        `);
    } else {
      result = await pool
        .request()
        .input("id", sql.Int, parsed.numericId)
        .query(`
          SELECT
            'org_' + CAST(OrgId AS NVARCHAR) AS _id,
            OrgName                           AS name,
            OrgEmail                          AS email,
            'org'                             AS role,
            ISNULL(Status, 'active')          AS status,
            DateCreated                       AS createdAt,
            Province                          AS province,
            Type                              AS orgType,
            OrgProfilePic                     AS profilePicUrl
          FROM Organisation
          WHERE OrgId = @id
        `);
    }

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, user: result.recordset[0] });
  } catch (error) {
    console.error("getUserById:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve user." });
  }
};

// ─── PATCH /admin/users/:id/suspend ──────────────────────────────────────────
/**
 * Sets Status = 'suspended' on the correct table.
 */
export const suspendUser = async (req, res) => {
  const parsed = parseId(req.params.id);
  if (!parsed) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "Suspension reason is required." });
  }

  try {
    const pool  = await connectToDB();
    const table = parsed.table === "student" ? "Student"      : "Organisation";
    const pkCol = parsed.table === "student" ? "StuID"        : "OrgId";
    const emailCol = parsed.table === "student" ? "StuEmail"  : "OrgEmail";
    const nameCol = parsed.table === "student" ? "StuName"    : "OrgName";

    // 1. Fetch user email and name first
    let userResult;
    if (parsed.table === "student") {
      userResult = await pool
        .request()
        .input("id", sql.Int, parsed.numericId)
        .query(`SELECT StuName + ' ' + StuLastName AS name, StuEmail AS email FROM Student WHERE StuID = @id`);
    } else {
      userResult = await pool
        .request()
        .input("id", sql.Int, parsed.numericId)
        .query(`SELECT OrgName AS name, OrgEmail AS email FROM Organisation WHERE OrgId = @id`);
    }

    if (!userResult.recordset.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { name, email } = userResult.recordset[0];

    // 2. Perform UPDATE
    const updateResult = await pool
      .request()
      .input("id", sql.Int, parsed.numericId)
      .query(`
        UPDATE ${table}
        SET    Status = 'suspended'
        WHERE  ${pkCol} = @id;

        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = updateResult.recordset[0]?.affected ?? 0;
    if (!affected) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // 3. Send email
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.LUCAS_EMAIL,
        pass: process.env.LUCAS_APP_PASS,
      },
    });

    const mailOptions = {
      from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
      to: email,
      subject: "Your SMILE account has been suspended",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <h2 style="color:#dc2626;margin-bottom:8px;">Account Suspended</h2>
          <p style="color:#374151;line-height:1.6;">Hello ${name},</p>
          <p style="color:#374151;line-height:1.6;">We are writing to inform you that your SMILE account has been suspended by the administrator.</p>
          <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px;border-radius:4px;margin:24px 0;">
            <p style="margin:0;color:#991b1b;font-weight:600;">Reason for suspension:</p>
            <p style="margin:8px 0 0;color:#7f1d1d;font-size:14px;white-space:pre-wrap;">${reason}</p>
          </div>
          <p style="color:#374151;line-height:1.6;">If you believe this is a mistake or have questions, please reply to this email or contact support.</p>
        </div>
      `
    };

    try {
      await transport.sendMail(mailOptions);
      console.log(`Suspension email sent to ${email}`);
    } catch (emailErr) {
      console.error("Suspension email failed (non-fatal):", emailErr.message);
    }

    // 4. Log audit log
    await logAudit(req, "SUSPEND_USER", `Suspended ${parsed.table} ID: ${parsed.numericId}. Reason: ${reason}`);

    return res.status(200).json({ success: true, message: "User suspended successfully." });
  } catch (error) {
    console.error("suspendUser:", error);
    return res.status(500).json({ success: false, message: "Failed to suspend user." });
  }
};

// ─── PATCH /admin/users/:id/unsuspend ────────────────────────────────────────
/**
 * Sets Status = 'active' on the correct table.
 */
export const unsuspendUser = async (req, res) => {
  const parsed = parseId(req.params.id);
  if (!parsed) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }

  try {
    const pool  = await connectToDB();
    const table = parsed.table === "student" ? "Student"      : "Organisation";
    const pkCol = parsed.table === "student" ? "StuID"        : "OrgId";

    const result = await pool
      .request()
      .input("id", sql.Int, parsed.numericId)
      .query(`
        UPDATE ${table}
        SET    Status = 'active'
        WHERE  ${pkCol} = @id;

        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = result.recordset[0]?.affected ?? 0;
    if (!affected) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await logAudit(req, "UNSUSPEND_USER", `Unsuspended ${parsed.table} ID: ${parsed.numericId}`);
    return res.status(200).json({ success: true, message: "User reactivated successfully." });
  } catch (error) {
    console.error("unsuspendUser:", error);
    return res.status(500).json({ success: false, message: "Failed to reactivate user." });
  }
};

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
/**
 * Permanently removes a student or organisation and their related records.
 * Uses a transaction so it either all succeeds or all rolls back.
 */
export const deleteUser = async (req, res) => {
  const parsed = parseId(req.params.id);
  if (!parsed) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }

  const pool        = await connectToDB();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const req_ = new sql.Request(transaction);
    req_.input("id", sql.Int, parsed.numericId);

    if (parsed.table === "student") {
      // ── All FK children of Student.StuID (from SSMS FK query) ────────────────
      // rows 3–7 in results: Feedback, SavedCareerDocs, SavedOpportunities,
      // StudentInterests (×2 — same table, two FKs), Applications
      await req_.query(`DELETE FROM Feedback           WHERE StuID = @id`);
      await req_.query(`DELETE FROM SavedCareerDocs    WHERE StuID = @id`);
      await req_.query(`DELETE FROM SavedOpportunities WHERE StuID = @id`);
      await req_.query(`DELETE FROM StudentInterests   WHERE StuID = @id`);
      await req_.query(`DELETE FROM Applications       WHERE StuID = @id`);
      // Parent row — must be last
      await req_.query(`DELETE FROM Student            WHERE StuID = @id`);

    } else {
      // ── All FK children of Organisation.OrgId (row 1 in results: Opportunities)
      // Opportunities itself has children: Applications, SavedOpportunities
      // so delete those first, then Opportunities, then Organisation
      await req_.query(`
        DELETE FROM Applications
        WHERE OppID IN (SELECT OppID FROM Opportunities WHERE OrgId = @id)
      `);
      await req_.query(`
        DELETE FROM SavedOpportunities
        WHERE OppID IN (SELECT OppID FROM Opportunities WHERE OrgId = @id)
      `);
      await req_.query(`DELETE FROM Opportunities WHERE OrgId  = @id`);
      await req_.query(`DELETE FROM OrgApprovals  WHERE OrgId  = @id`);
      // Parent row — must be last
      await req_.query(`DELETE FROM Organisation  WHERE OrgId  = @id`);
    }

    await transaction.commit();

    await logAudit(req, "DELETE_USER", `Permanently deleted ${parsed.table} ID: ${parsed.numericId}`);
    return res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteUser:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user." });
  }
};