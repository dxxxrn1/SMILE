import { sql, connectToDB } from "../dbConnection/dbconnection.js";

// ─────────────────────────────────────────────────────────────────
// POST /api/tickets  →  Submit a new support ticket
// Works for both student and org accounts
// ─────────────────────────────────────────────────────────────────
export const createTicket = async (req, res) => {
    try {
        const { ticketType, subject, description } = req.body;

        if (!ticketType || !subject || !description) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // req.user is set by verifyToken — contains id, accountType
        const submitterID   = req.user.id;
        const submitterType = req.user.accountType === "org" ? "org" : "student";

        const pool = await connectToDB();
        const result = await pool
            .request()
            .input("submitterID",   sql.Int,         submitterID)
            .input("submitterType", sql.VarChar(10),  submitterType)
            .input("ticketType",    sql.VarChar(30),  ticketType)
            .input("subject",       sql.VarChar(255), subject)
            .input("description",   sql.NVarChar,     description)
            .query(`
                INSERT INTO SupportTickets (SubmitterID, SubmitterType, TicketType, Subject, Description)
                OUTPUT INSERTED.TicketID
                VALUES (@submitterID, @submitterType, @ticketType, @subject, @description)
            `);

        const newId = result.recordset[0].TicketID;
        console.log(`✅ Ticket #${newId} submitted by ${submitterType} ${submitterID}`);
        return res.status(201).json({ success: true, ticketId: newId });

    } catch (err) {
        console.error("❌ createTicket error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/tickets/my  →  Get tickets for the authenticated user
// ─────────────────────────────────────────────────────────────────
export const getMyTickets = async (req, res) => {
    try {
        const submitterID   = req.user.id;
        const submitterType = req.user.accountType === "org" ? "org" : "student";

        const pool = await connectToDB();
        const result = await pool
            .request()
            .input("submitterID",   sql.Int,        submitterID)
            .input("submitterType", sql.VarChar(10), submitterType)
            .query(`
                SELECT
                    TicketID,
                    TicketType,
                    Subject,
                    Description,
                    Status,
                    AdminFeedback,
                    DateCreated,
                    DateResolved
                FROM SupportTickets
                WHERE SubmitterID   = @submitterID
                  AND SubmitterType = @submitterType
                ORDER BY DateCreated DESC
            `);

        return res.status(200).json({ success: true, tickets: result.recordset });

    } catch (err) {
        console.error("❌ getMyTickets error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /admin/api/tickets  →  All tickets with submitter name joined
// Admin only
// ─────────────────────────────────────────────────────────────────
export const getAllTickets = async (req, res) => {
    try {
        const { status, type } = req.query;

        let whereClause = "WHERE 1=1";
        if (status && status !== "all") whereClause += ` AND t.Status = '${status === "open" ? "Open" : "Resolved"}'`;
        if (type   && type   !== "all") whereClause += ` AND t.TicketType = '${type === "bug" ? "Bug / Issue" : "Report"}'`;

        const pool = await connectToDB();
        const result = await pool
            .request()
            .query(`
                SELECT
                    t.TicketID,
                    t.SubmitterType,
                    t.TicketType,
                    t.Subject,
                    t.Description,
                    t.Status,
                    t.AdminFeedback,
                    t.DateCreated,
                    t.DateResolved,
                    CASE
                        WHEN t.SubmitterType = 'student'
                        THEN CONCAT(s.StuName, ' ', s.StuLastName)
                        ELSE o.OrgName
                    END AS SubmitterName,
                    CASE
                        WHEN t.SubmitterType = 'student' THEN s.StuEmail
                        ELSE o.OrgEmail
                    END AS SubmitterEmail
                FROM SupportTickets t
                LEFT JOIN Student      s ON t.SubmitterType = 'student' AND t.SubmitterID = s.StuID
                LEFT JOIN Organisation o ON t.SubmitterType = 'org'     AND t.SubmitterID = o.OrgId
                ${whereClause}
                ORDER BY t.DateCreated DESC
            `);

        const tickets = result.recordset;
        const openCount     = tickets.filter(t => t.Status === "Open").length;
        const resolvedCount = tickets.filter(t => t.Status === "Resolved").length;

        console.log(`✅ Admin fetched ${tickets.length} tickets`);
        return res.status(200).json({ success: true, tickets, openCount, resolvedCount });

    } catch (err) {
        console.error("❌ getAllTickets error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /admin/api/tickets/:id  →  Resolve ticket + add feedback
// Admin only
// ─────────────────────────────────────────────────────────────────
export const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminFeedback } = req.body;

        if (!adminFeedback || !adminFeedback.trim()) {
            return res.status(400).json({ success: false, message: "Admin feedback is required." });
        }

        const pool = await connectToDB();

        const check = await pool
            .request()
            .input("id", sql.Int, id)
            .query(`SELECT TicketID, Status, SubmitterID, SubmitterType FROM SupportTickets WHERE TicketID = @id`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        const ticket = check.recordset[0];

        await pool
            .request()
            .input("id",            sql.Int,      id)
            .input("adminFeedback", sql.NVarChar,  adminFeedback.trim())
            .query(`
                UPDATE SupportTickets
                SET Status        = 'Resolved',
                    AdminFeedback = @adminFeedback,
                    DateResolved  = GETDATE()
                WHERE TicketID = @id
            `);

        // If the ticket was submitted by a student, send them a student notification
        if (ticket.SubmitterType === "student") {
            try {
                await pool
                    .request()
                    .input("stuId", sql.Int, ticket.SubmitterID)
                    .input("title", sql.NVarChar, "Support Ticket Resolved")
                    .input("message", sql.NVarChar, `Your support ticket #${id} has been resolved by the admin. Feedback: ${adminFeedback.trim()}`)
                    .input("type", sql.NVarChar, "ticket")
                    .query(`
                        INSERT INTO StudentNotifications (StuID, AppID, Title, Message, NotificationType, IsRead, DateCreated)
                        VALUES (@stuId, NULL, @title, @message, @type, 0, GETDATE())
                    `);
                console.log(`✅ Notification created for student StuID: ${ticket.SubmitterID} for ticket #${id}`);
            } catch (notifyErr) {
                console.error("❌ Failed to create student notification for resolved ticket:", notifyErr);
            }
        }

        console.log(`✅ Ticket #${id} resolved by admin`);
        return res.status(200).json({ success: true, message: "Ticket resolved successfully." });

    } catch (err) {
        console.error("❌ updateTicketStatus error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};
