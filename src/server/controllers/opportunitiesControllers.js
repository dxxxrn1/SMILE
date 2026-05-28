import { connectToDB, sql } from "../dbConnection/dbconnection.js";
import { getCoordinates } from '../apis/geoHelper.js'; 

export const createNewOpportunity = async (req, res) => {
    try {
        const { title, type, address, province, maxApplicants, description, requirements, deadline, startDate, applicationLink } = req.body;

        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        if (!title || !type || !province || !description || !deadline) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields." });
        }

        const coords = await getCoordinates(address, province);

        const pool = await connectToDB();


        await pool.request()
            .input("OrgId",               sql.Int,           orgId)
            .input("Title",               sql.VarChar(120),  title)
            .input("OppType",             sql.VarChar(50),   type)
            .input("Province",            sql.VarChar(50),   province)
            .input("Description",         sql.VarChar,       description)
            .input("Requirements",        sql.VarChar,       requirements   || null)
            .input("ApplicationLink",     sql.VarChar(255),  applicationLink || null)
            .input("MaxApplicants",       sql.Int,           maxApplicants  || null)
            .input("ApplicationDeadline", sql.Date,          deadline)
            .input("StartDate",           sql.Date,          startDate      || null)
            .input("Lat",                 sql.Decimal(9,6),  coords.lat)
            .input("Lng",                 sql.Decimal(9,6),  coords.lng)
            .query(`
                INSERT INTO [dbo].[Opportunities]
                    (OrgId, Title, OppType, Province, Description, Requirements,
                     ApplicationLink, MaxApplicants, ApplicationDeadline, StartDate, Lat, Lng)
                VALUES
                    (@OrgId, @Title, @OppType, @Province, @Description, @Requirements,
                     @ApplicationLink, @MaxApplicants, @ApplicationDeadline, @StartDate, @Lat, @Lng)
            `);

        return res.status(201).json({ success: true, message: "Opportunity published successfully!" });

    } catch (err) {
        console.log(err);
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

        // Primary query — uses all columns including StuBio and ProfilePicUrl
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

            // Fallback query — excludes optional columns in case they don't exist on this DB instance
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

// ─────────────────────────────────────────────
// GET  /api/org/dashboard-stats  →  stat counts + comprehensive dashboard details
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// PATCH  /api/org/applicants/:appId/status  →  update application status
// ─────────────────────────────────────────────
export const updateApplicationStatus = async (req, res) => {
    try {
        const orgId = req.user?.id;
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const { appId } = req.params;
        const { status } = req.body;

        const allowed = ['Pending', 'Reviewed', 'Shortlisted', 'Rejected'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value." });
        }

        const pool = await connectToDB();

        // Verify this application belongs to this org
        const check = await pool.request()
            .input("AppId", sql.Int, appId)
            .input("OrgId", sql.Int, orgId)
            .query(`
                SELECT a.AppID
                FROM Applications a
                JOIN Opportunities o ON a.OppID = o.OppID
                WHERE a.AppID = @AppId AND o.OrgId = @OrgId
            `);

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        await pool.request()
            .input("AppId", sql.Int, appId)
            .input("Status", sql.VarChar(20), status)
            .query(`UPDATE Applications SET Status = @Status WHERE AppID = @AppId`);

        console.log(`✅ Application ${appId} status updated to ${status}`);
        return res.status(200).json({ success: true, message: `Status updated to ${status}` });

    } catch (err) {
        console.error("Error updating application status:", err);
        return res.status(500).json({ success: false, message: "Failed to update status." });
    }
};

// ─────────────────────────────────────────────
// GET  /api/org/opportunities  →  get organization's own opportunities
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// PUT  /api/opportunities/:oppId  →  update opportunity
// ─────────────────────────────────────────────
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

        console.log(`✅ Opportunity ${oppId} updated`);
        return res.status(200).json({ success: true, message: "Opportunity updated successfully!" });
    } catch (err) {
        console.error("Error updating opportunity:", err);
        return res.status(500).json({ success: false, message: "Failed to update opportunity." });
    }
};

// ─────────────────────────────────────────────
// DELETE  /api/opportunities/:oppId  →  delete opportunity (cascades Applications)
// ─────────────────────────────────────────────
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

        console.log(`✅ Opportunity ${oppId} and its applications deleted`);
        return res.status(200).json({ success: true, message: "Opportunity deleted successfully." });
    } catch (err) {
        console.error("Error deleting opportunity:", err);
        return res.status(500).json({ success: false, message: "Failed to delete opportunity." });
    }
};