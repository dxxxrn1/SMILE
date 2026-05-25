import { sql, connectToDB } from "../dbConnection/dbconnection.js";

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
            StuEducationLevel                 AS educationLevel
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
            Type                              AS orgType
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

  try {
    const pool  = await connectToDB();
    const table = parsed.table === "student" ? "Student"      : "Organisation";
    const pkCol = parsed.table === "student" ? "StuID"        : "OrgId";

    const result = await pool
      .request()
      .input("id", sql.Int, parsed.numericId)
      .query(`
        UPDATE ${table}
        SET    Status = 'suspended'
        WHERE  ${pkCol} = @id;

        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = result.recordset[0]?.affected ?? 0;
    if (!affected) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

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

    return res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteUser:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user." });
  }
};