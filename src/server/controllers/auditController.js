import { sql, connectToDB } from "../dbConnection/dbconnection.js";

/**
 * Ensures that the AuditLogs table exists.
 */
export async function ensureAuditLogsTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AuditLogs (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        UserEmail VARCHAR(255) NULL,
        UserType VARCHAR(50) NULL,
        Action VARCHAR(255) NOT NULL,
        Details NVARCHAR(MAX) NULL,
        IpAddress VARCHAR(45) NULL,
        Timestamp DATETIME NOT NULL CONSTRAINT DF_AuditLogs_Timestamp DEFAULT GETDATE()
      );
    END
  `);
}

/**
 * Inserts a new audit log. Extracts session context from the request automatically.
 */
export async function logAudit(req, action, details) {
  try {
    const pool = await connectToDB();
    await ensureAuditLogsTable(pool);

    const userId = req.user?.id || null;
    const userEmail = req.user?.email || null;
    const userType = req.user?.accountType || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    await pool.request()
      .input("userId", sql.Int, userId)
      .input("userEmail", sql.VarChar, userEmail)
      .input("userType", sql.VarChar, userType)
      .input("action", sql.VarChar, action)
      .input("details", sql.NVarChar, details || null)
      .input("ipAddress", sql.VarChar, ipAddress)
      .query(`
        INSERT INTO AuditLogs (UserId, UserEmail, UserType, Action, Details, IpAddress)
        VALUES (@userId, @userEmail, @userType, @action, @details, @ipAddress)
      `);
    console.log(`[AUDIT] Action: ${action} by ${userEmail || 'System'} (${userType || 'Unknown'})`);
  } catch (err) {
    console.error("logAudit error:", err);
  }
}

/**
 * GET /admin/api/audit-logs
 * Retrieves all audit logs sorted by Timestamp DESC.
 */
export const getAuditLogs = async (req, res) => {
  try {
    const pool = await connectToDB();
    await ensureAuditLogsTable(pool);

    const result = await pool.request().query("SELECT * FROM AuditLogs ORDER BY Timestamp DESC");
    return res.status(200).json({ success: true, logs: result.recordset });
  } catch (err) {
    console.error("getAuditLogs error:", err);
    return res.status(500).json({ success: false, message: "Failed to retrieve audit logs." });
  }
};
