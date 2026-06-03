import { connectToDB, sql } from "../dbConnection/dbconnection.js";
import { getCoordinates } from '../apis/geoHelper.js';
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.LUCAS_EMAIL,
        pass: process.env.LUCAS_APP_PASS
    }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function ensureStudentNotificationsTable(pool) {
    await pool.request().query(`
        IF OBJECT_ID('dbo.StudentNotifications', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.StudentNotifications (
                NotificationID INT IDENTITY(1,1) PRIMARY KEY,
                StuID INT NOT NULL,
                AppID INT NULL,
                Title NVARCHAR(150) NOT NULL,
                Message NVARCHAR(1000) NOT NULL,
                NotificationType VARCHAR(40) NOT NULL,
                IsRead BIT NOT NULL CONSTRAINT DF_StudentNotifications_IsRead DEFAULT 0,
                DateCreated DATETIME NOT NULL CONSTRAINT DF_StudentNotifications_DateCreated DEFAULT GETDATE(),
                CONSTRAINT FK_StudentNotifications_Student FOREIGN KEY (StuID) REFERENCES dbo.Student(StuID) ON DELETE CASCADE
            );
        END
    `);
}

function buildApplicationStatusNotification({ status, studentName, opportunityTitle, orgName }) {
    const readableStatus = status === "Approved" ? "approved" : status.toLowerCase();
    const titleMap = {
        Pending: "Application status updated",
        Reviewed: "Your application was reviewed",
        Shortlisted: "You were shortlisted",
        Interview: "Interview update",
        Approved: "Application approved",
        Rejected: "Application not approved"
    };

    const messageMap = {
        Pending: `${orgName} moved your application for "${opportunityTitle}" back to pending review.`,
        Reviewed: `${orgName} reviewed your application for "${opportunityTitle}".`,
        Shortlisted: `${orgName} shortlisted your application for "${opportunityTitle}".`,
        Interview: `${orgName} would like to move forward with an interview for "${opportunityTitle}".`,
        Approved: `${orgName} approved your application for "${opportunityTitle}".`,
        Rejected: `${orgName} updated your application for "${opportunityTitle}" as not approved.`
    };

    return {
        title: titleMap[status] || "Application status updated",
        message: messageMap[status] || `${orgName} updated your application for "${opportunityTitle}" to ${readableStatus}.`,
        emailSubject: titleMap[status] || "Your SMILE application status changed",
        emailHtml: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
                <h2 style="color:#111827;margin:0 0 12px;">Hi ${studentName},</h2>
                <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
                    ${messageMap[status] || `${orgName} updated your application status.`}
                </p>
                <div style="background:#EEF2FF;border-left:4px solid #6366F1;padding:16px;border-radius:4px;margin:20px 0;">
                    <p style="margin:0;color:#3730A3;font-weight:700;">Current status: ${status}</p>
                </div>
                <p style="color:#6B7280;font-size:13px;line-height:1.6;">
                    You can also view this update from the notification icon on your SMILE student dashboard.
                </p>
            </div>
        `
    };
}

export const createNewOpportunity = async (req, res) => {
    try {
        const { title, type, address, province, maxApplicants, description, requirements, deadline, startDate, applicationLink, oppImage } = req.body;

        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        if (!title || !type || !province || !description || !deadline) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields." });
        }

        const coords = await getCoordinates(address, province);

        // ✅ Upload opportunity image to Cloudinary if provided
        let oppImageUrl = null;
        if (typeof oppImage === "string" && oppImage.startsWith("data:image/")) {
            const matches = oppImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const buffer = Buffer.from(matches[2], "base64");

                if (buffer.length > 5 * 1024 * 1024) {
                    return res.status(400).json({ success: false, message: "Image must be smaller than 5MB." });
                }

                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            folder: "smile/opportunities",
                            public_id: `opp_${orgId}_${Date.now()}`,
                            overwrite: true,
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(buffer);
                });

                oppImageUrl = uploadResult.secure_url;
            }
        }

        const pool = await connectToDB();

        await pool.request()
            .input("OrgId",               sql.Int,           orgId)
            .input("Title",               sql.VarChar(120),  title)
            .input("OppType",             sql.VarChar(50),   type)
            .input("Province",            sql.VarChar(50),   province)
            .input("Description",         sql.VarChar,       description)
            .input("Requirements",        sql.VarChar,       requirements    || null)
            .input("ApplicationLink",     sql.VarChar(255),  applicationLink || null)
            .input("MaxApplicants",       sql.Int,           maxApplicants   || null)
            .input("ApplicationDeadline", sql.Date,          deadline)
            .input("StartDate",           sql.Date,          startDate       || null)
            .input("Lat",                 sql.Decimal(9,6),  coords.lat)
            .input("Lng",                 sql.Decimal(9,6),  coords.lng)
            .input("OppImageUrl",         sql.NVarChar(500), oppImageUrl)
            .query(`
                INSERT INTO [dbo].[Opportunities]
                    (OrgId, Title, OppType, Province, Description, Requirements,
                     ApplicationLink, MaxApplicants, ApplicationDeadline, StartDate, Lat, Lng, OppImageUrl)
                VALUES
                    (@OrgId, @Title, @OppType, @Province, @Description, @Requirements,
                     @ApplicationLink, @MaxApplicants, @ApplicationDeadline, @StartDate, @Lat, @Lng, @OppImageUrl)
            `);

        return res.status(201).json({ success: true, message: "Opportunity published successfully!" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};
export const getAllOpportunities = async (req, res) => {
    try {
        const { type, province, search, sort } = req.query;

        const pool = await connectToDB();
        const request = pool.request();

        let query = `
            SELECT
                o.OppID, o.Title, o.OppType, o.Province, o.Description,
                o.ApplicationDeadline, o.StartDate, o.ApplicationLink,
                o.MaxApplicants, o.Status, o.DateCreated,
                o.Lat, o.Lng,
                o.OrgId,
                o.OppImageUrl,
                org.OrgName, org.OrgBio, org.OrgProfilePic
            FROM [dbo].[Opportunities] o
            JOIN [dbo].[Organisation] org ON o.OrgId = org.OrgId
            WHERE o.Status = 'Active'
        `;

        if (type) {
            request.input("type", sql.VarChar(50), type);
            query += ` AND LOWER(o.OppType) = LOWER(@type)`;
        }

        if (province) {
            request.input("province", sql.VarChar(50), province);
            query += ` AND LOWER(o.Province) = LOWER(@province)`;
        }

        if (search) {
            request.input("search", sql.VarChar(120), `%${search}%`);
            query += ` AND (o.Title LIKE @search OR o.Description LIKE @search OR org.OrgName LIKE @search)`;
        }

        if (sort === "deadline") {
            query += ` ORDER BY o.ApplicationDeadline ASC`;
        } else {
            query += ` ORDER BY o.DateCreated DESC`;
        }

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            count: result.recordset.length,
            opportunities: result.recordset
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Failed to fetch opportunities." });
    }
};
export const getOrganizationApplicants = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const pool = await connectToDB();

        let applicants = [];

        // Primary query â€” uses all columns including StuBio and ProfilePicUrl
        try {
            const request = pool.request();
            request.input("OrgId", sql.Int, orgId);
            const result = await request.query(`
                SELECT
                    a.AppID, a.Status AS ApplicationStatus, a.DateApplied,
                    o.Title AS OpportunityTitle, o.OppType, o.Province AS OpportunityProvince,
                    s.StuID, s.StuName, s.StuLastName, s.StuEmail, s.StuProvince, s.StuEducationLevel,
                    s.StuBio, s.ProfilePicUrl
                FROM [dbo].[Applications] a
                JOIN [dbo].[Opportunities] o ON a.OppID = o.OppID
                JOIN [dbo].[Student] s ON a.StuID = s.StuID
                WHERE o.OrgId = @OrgId
                ORDER BY a.DateApplied DESC
            `);
            applicants = result.recordset;
        } catch (primaryErr) {
            console.warn("[SMILE] Primary applicants query failed, running fallback:", primaryErr.message);

            // Fallback query â€” excludes optional columns in case they don't exist on this DB instance
            try {
                const fallbackReq = pool.request();
                fallbackReq.input("OrgId", sql.Int, orgId);
                const fallbackResult = await fallbackReq.query(`
                    SELECT
                        a.AppID, a.Status AS ApplicationStatus, a.DateApplied,
                        o.Title AS OpportunityTitle, o.OppType, o.Province AS OpportunityProvince,
                        s.StuID, s.StuName, s.StuLastName, s.StuEmail, s.StuProvince, s.StuEducationLevel,
                        NULL AS StuBio, NULL AS ProfilePicUrl
                    FROM [dbo].[Applications] a
                    JOIN [dbo].[Opportunities] o ON a.OppID = o.OppID
                    JOIN [dbo].[Student] s ON a.StuID = s.StuID
                    WHERE o.OrgId = @OrgId
                    ORDER BY a.DateApplied DESC
                `);
                applicants = fallbackResult.recordset;
            } catch (fallbackErr) {
                console.error("[SMILE] Fallback applicants query also failed:", fallbackErr.message);
                applicants = [];
            }
        }

        return res.status(200).json({
            success: true,
            applicants
        });

    } catch (err) {
        console.error("Error fetching org applicants:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch applicants." });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET  /api/org/dashboard-stats  â†’  stat counts + comprehensive dashboard details
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getOrgDashboardStats = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const pool = await connectToDB();

        // 1. Total & active opportunities
        let totalOpps = 0;
        let activeOpps = 0;
        try {
            const oppStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        COUNT(*) AS TotalOpps,
                        SUM(CASE WHEN Status = 'Active' OR ApplicationDeadline >= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS ActiveOpps
                    FROM Opportunities
                    WHERE OrgId = @OrgId
                `);
            totalOpps = oppStats.recordset[0]?.TotalOpps || 0;
            activeOpps = oppStats.recordset[0]?.ActiveOpps || 0;
        } catch (err) {
            console.error("OppStats query failed, falling back safely:", err);
        }

        // 2. Total applications + distinct students reached
        let totalApplications = 0;
        let youthReached = 0;
        try {
            const appStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        COUNT(*) AS TotalApplications,
                        COUNT(DISTINCT a.StuID) AS YouthReached
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    WHERE o.OrgId = @OrgId
                `);
            totalApplications = appStats.recordset[0]?.TotalApplications || 0;
            youthReached = appStats.recordset[0]?.YouthReached || 0;
        } catch (err) {
            console.error("AppStats query failed, falling back safely:", err);
        }

        // 3. Recent 5 applicants
        let recentApplicants = [];
        try {
            const recent = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT TOP 5
                        a.AppID,
                        a.Status AS ApplicationStatus,
                        a.DateApplied,
                        o.Title AS OpportunityTitle,
                        s.StuName, s.StuLastName, s.StuEmail, s.ProfilePicUrl
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    JOIN Student s ON a.StuID = s.StuID
                    WHERE o.OrgId = @OrgId
                    ORDER BY a.DateApplied DESC
                `);
            recentApplicants = recent.recordset;
        } catch (err) {
            console.error("Recent applicants query failed, falling back safely:", err);
        }

        // 4. Top Performing opportunities (based on application volume)
        let topOpportunities = [];
        try {
            const topOpps = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT TOP 4
                        o.Title,
                        COUNT(a.AppID) AS Count
                    FROM Opportunities o
                    LEFT JOIN Applications a ON o.OppID = a.OppID
                    WHERE o.OrgId = @OrgId
                    GROUP BY o.OppID, o.Title
                    ORDER BY Count DESC
                `);
            topOpportunities = topOpps.recordset;
        } catch (err) {
            console.error("Top opportunities query failed, falling back safely:", err);
        }

        // 5. Education level breakdown of applicants
        let education = [];
        try {
            const eduStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        ISNULL(s.StuEducationLevel, 'Other') AS Label,
                        COUNT(*) AS Value
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    JOIN Student s ON a.StuID = s.StuID
                    WHERE o.OrgId = @OrgId
                    GROUP BY s.StuEducationLevel
                `);
            education = eduStats.recordset;
        } catch (err) {
            console.error("Education breakdown query failed, falling back safely:", err);
        }

        // 6. Province breakdown of applicants
        let provinces = [];
        try {
            const provStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        ISNULL(s.StuProvince, 'Gauteng') AS Label,
                        COUNT(*) AS Value
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    JOIN Student s ON a.StuID = s.StuID
                    WHERE o.OrgId = @OrgId
                    GROUP BY s.StuProvince
                    ORDER BY Value DESC
                `);
            provinces = provStats.recordset;
        } catch (err) {
            console.error("Provinces breakdown query failed, falling back safely:", err);
        }

        // 7. Funnel counts (application status breakdown)
        let funnel = [];
        try {
            const funnelStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        a.Status AS Label,
                        COUNT(*) AS Value
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    WHERE o.OrgId = @OrgId
                    GROUP BY a.Status
                `);
            funnel = funnelStats.recordset;
        } catch (err) {
            console.error("Funnel query failed, falling back safely:", err);
        }

        // 8. 90-day timeline data for applications
        let timeline = [];
        try {
            const timelineStats = await pool.request()
                .input("OrgId", sql.Int, orgId)
                .query(`
                    SELECT
                        CAST(a.DateApplied AS DATE) AS DateApplied,
                        COUNT(*) AS Count
                    FROM Applications a
                    JOIN Opportunities o ON a.OppID = o.OppID
                    WHERE o.OrgId = @OrgId AND a.DateApplied >= DATEADD(day, -90, GETDATE())
                    GROUP BY CAST(a.DateApplied AS DATE)
                    ORDER BY DateApplied ASC
                `);
            timeline = timelineStats.recordset;
        } catch (err) {
            console.error("Timeline query failed, falling back safely:", err);
        }

        return res.status(200).json({
            success: true,
            stats: {
                totalOpps: totalOpps,
                activeOpps: activeOpps,
                totalApplications: totalApplications,
                youthReached: youthReached,
            },
            recentApplicants: recentApplicants,
            topOpportunities: topOpportunities,
            education: education,
            provinces: provinces,
            funnel: funnel,
            timeline: timeline
        });

    } catch (err) {
        console.error("Error fetching org dashboard stats:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats." });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PATCH  /api/org/applicants/:appId/status  â†’  update application status
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const updateApplicationStatus = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const appId = Number.parseInt(req.params.appId, 10);
        const { status } = req.body;

        if (!Number.isInteger(appId) || appId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid application id." });
        }

        const allowed = ["Pending", "Reviewed", "Shortlisted", "Interview", "Approved", "Rejected"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value." });
        }

        const pool = await connectToDB();
        await ensureStudentNotificationsTable(pool);

        const check = await pool.request()
            .input("AppId", sql.Int, appId)
            .input("OrgId", sql.Int, orgId)
            .query(`
                SELECT
                    a.AppID,
                    a.StuID,
                    a.Status AS PreviousStatus,
                    s.StuName,
                    s.StuLastName,
                    s.StuEmail,
                    o.Title AS OpportunityTitle,
                    org.OrgName
                FROM Applications a
                JOIN Opportunities o ON a.OppID = o.OppID
                JOIN Organisation org ON o.OrgId = org.OrgId
                JOIN Student s ON a.StuID = s.StuID
                WHERE a.AppID = @AppId AND o.OrgId = @OrgId
            `);

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        const application = check.recordset[0];
        const studentName = `${application.StuName || "Student"} ${application.StuLastName || ""}`.trim();
        const notification = buildApplicationStatusNotification({
            status,
            studentName,
            opportunityTitle: application.OpportunityTitle,
            orgName: application.OrgName || "An organisation"
        });

        await pool.request()
            .input("AppId", sql.Int, appId)
            .input("Status", sql.VarChar(20), status)
            .query("UPDATE Applications SET Status = @Status WHERE AppID = @AppId");

        await pool.request()
            .input("StuID", sql.Int, application.StuID)
            .input("AppID", sql.Int, application.AppID)
            .input("Title", sql.NVarChar(150), notification.title)
            .input("Message", sql.NVarChar(1000), notification.message)
            .input("NotificationType", sql.VarChar(40), `application_${status.toLowerCase()}`)
            .query(`
                INSERT INTO StudentNotifications (StuID, AppID, Title, Message, NotificationType)
                VALUES (@StuID, @AppID, @Title, @Message, @NotificationType)
            `);

        let emailSent = false;
        try {
            await mailTransport.sendMail({
                from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
                to: application.StuEmail,
                subject: notification.emailSubject,
                html: notification.emailHtml
            });
            emailSent = true;
        } catch (emailErr) {
            console.error("Application status email failed (non-fatal):", emailErr.message);
        }

        console.log(`Application ${appId} status updated to ${status}; notification created; emailSent=${emailSent}`);
        return res.status(200).json({
            success: true,
            message: `Status updated to ${status}`,
            notificationCreated: true,
            emailSent
        });

    } catch (err) {
        console.error("Error updating application status:", err);
        return res.status(500).json({ success: false, message: "Failed to update status." });
    }
};

// GET  /api/org/opportunities  - get organization's own opportunities
export const getOrgOpportunities = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const pool = await connectToDB();
        const result = await pool.request()
            .input("OrgId", sql.Int, orgId)
            .query(`
                SELECT
                    o.OppID, o.Title, o.OppType, o.Province, o.Description, o.Requirements,
                    o.ApplicationDeadline, o.StartDate, o.ApplicationLink, o.MaxApplicants, o.Status, o.DateCreated,
                    (SELECT COUNT(*) FROM Applications a WHERE a.OppID = o.OppID) AS ApplicationCount
                FROM Opportunities o
                WHERE o.OrgId = @OrgId
                ORDER BY o.DateCreated DESC
            `);

        return res.status(200).json({ success: true, opportunities: result.recordset });
    } catch (err) {
        console.error("Error fetching org opportunities:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch opportunities." });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PUT  /api/opportunities/:oppId  â†’  update opportunity
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const updateOpportunity = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const { oppId } = req.params;
        const { title, type, address, province, maxApplicants, description, requirements, deadline, startDate, applicationLink, status } = req.body;

        if (!title || !type || !province || !description || !deadline) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields." });
        }

        const coords = await getCoordinates(address, province);

        const pool = await connectToDB();

        // Check if opportunity belongs to this org
        const check = await pool.request()
            .input("OppID", sql.Int, oppId)
            .input("OrgId", sql.Int, orgId)
            .query(`SELECT OppID FROM Opportunities WHERE OppID = @OppID AND OrgId = @OrgId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Opportunity not found or access denied." });
        }

        await pool.request()
            .input("OppID",               sql.Int,           oppId)
            .input("Title",               sql.VarChar(120),  title)
            .input("OppType",             sql.VarChar(50),   type)
            .input("Province",            sql.VarChar(50),   province)
            .input("Description",         sql.VarChar,       description)
            .input("Requirements",        sql.VarChar,       requirements   || null)
            .input("ApplicationLink",     sql.VarChar(255),  applicationLink || null)
            .input("MaxApplicants",       sql.Int,           maxApplicants  || null)
            .input("ApplicationDeadline", sql.Date,          deadline)
            .input("StartDate",           sql.Date,          startDate      || null)
            .input("Status",              sql.VarChar(20),   status         || "Active")
            .input("Lat",                 sql.Decimal(9,6),  coords.lat)
            .input("Lng",                 sql.Decimal(9,6),  coords.lng)
            .query(`
                UPDATE Opportunities
                SET Title = @Title,
                    OppType = @OppType,
                    Province = @Province,
                    Description = @Description,
                    Requirements = @Requirements,
                    ApplicationLink = @ApplicationLink,
                    MaxApplicants = @MaxApplicants,
                    ApplicationDeadline = @ApplicationDeadline,
                    StartDate = @StartDate,
                    Status = @Status,
                    Lat = @Lat,
                    Lng = @Lng
                WHERE OppID = @OppID
            `);

        console.log(`âœ… Opportunity ${oppId} updated`);
        return res.status(200).json({ success: true, message: "Opportunity updated successfully!" });
    } catch (err) {
        console.error("Error updating opportunity:", err);
        return res.status(500).json({ success: false, message: "Failed to update opportunity." });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DELETE  /api/opportunities/:oppId  â†’  delete opportunity (cascades Applications)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const deleteOpportunity = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const { oppId } = req.params;

        const pool = await connectToDB();

        // Verify ownership before deleting
        const check = await pool.request()
            .input("OppID", sql.Int, oppId)
            .input("OrgId", sql.Int, orgId)
            .query(`SELECT OppID FROM Opportunities WHERE OppID = @OppID AND OrgId = @OrgId`);

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Opportunity not found or access denied." });
        }

        // Delete child Applications first to avoid FK constraint violation
        await pool.request()
            .input("OppID", sql.Int, oppId)
            .query(`DELETE FROM Applications WHERE OppID = @OppID`);

        // Now delete the Opportunity itself
        await pool.request()
            .input("OppID", sql.Int, oppId)
            .query(`DELETE FROM Opportunities WHERE OppID = @OppID`);

        console.log(`âœ… Opportunity ${oppId} and its applications deleted`);
        return res.status(200).json({ success: true, message: "Opportunity deleted successfully." });
    } catch (err) {
        console.error("Error deleting opportunity:", err);
        return res.status(500).json({ success: false, message: "Failed to delete opportunity." });
    }
};
