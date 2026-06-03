import { sql, connectToDB } from "../dbConnection/dbconnection.js";

// GET /api/org/analytics-overview
export const getOrganizationAnalytics = async (req, res) => {
    try {
        const orgId = req.user?.id; // Pulled from secure organization JWT session token
        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ success: false, message: "Unauthorised." });
        }

        const days = parseInt(req.query.days, 10) || 7; // Default to 7 days if not provided

        const pool = await connectToDB();

        // QUERY 1: Regional Talent Density (Where are the students?)
        const regionalData = await pool.request()
            .input('Days', sql.Int, days)
            .query(`
                SELECT StuProvince AS province, COUNT(StuID) AS studentCount 
                FROM Student 
                WHERE StuProvince IS NOT NULL AND DateCreated >= DATEADD(day, -@Days, GETDATE())
                GROUP BY StuProvince
            `);

        // QUERY 2: The Application Progress Funnel (Processing speeds)
        const funnelData = await pool.request()
            .input('OrgID', sql.Int, orgId)
            .input('Days', sql.Int, days)
            .query(`
                SELECT a.Status, COUNT(a.AppID) AS count 
                FROM Applications a
                JOIN Opportunities o ON a.OppID = o.OppID
                WHERE o.OrgId = @OrgID AND a.DateApplied >= DATEADD(day, -@Days, GETDATE())
                GROUP BY a.Status
            `);

        // QUERY 3: Academic Strength Matrix (Education level spreads)
        const academicData = await pool.request()
            .input('Days', sql.Int, days)
            .query(`
                SELECT TOP 5 StuEducationLevel AS school, COUNT(StuID) AS topScholarCount
                FROM Student
                WHERE StuEducationLevel IS NOT NULL AND DateCreated >= DATEADD(day, -@Days, GETDATE())
                GROUP BY StuEducationLevel
                ORDER BY topScholarCount DESC
            `);

        // QUERY 4: Total Registered Student Count for pipeline metrics
        const totalTalentResult = await pool.request()
            .input('Days', sql.Int, days)
            .query(`SELECT COUNT(StuID) AS total FROM Student WHERE DateCreated >= DATEADD(day, -@Days, GETDATE())`);
        const totalTalent = totalTalentResult.recordset[0]?.total || 0;

        // QUERY 5: Review Speed (Average processing time in days)
        const reviewSpeedResult = await pool.request()
            .input('OrgID', sql.Int, orgId)
            .input('Days', sql.Int, days)
            .query(`
                SELECT AVG(CAST(DATEDIFF(minute, a.DateApplied, n.DateCreated) AS FLOAT)) / 60.0 / 24.0 AS avgReviewDays
                FROM StudentNotifications n
                JOIN Applications a ON n.AppID = a.AppID
                JOIN Opportunities o ON a.OppID = o.OppID
                WHERE o.OrgId = @OrgID AND a.DateApplied >= DATEADD(day, -@Days, GETDATE())
            `);
        const avgReviewDays = reviewSpeedResult.recordset[0]?.avgReviewDays;

        return res.status(200).json({
            success: true,
            geoDensity: regionalData.recordset,
            recruitmentFunnel: funnelData.recordset,
            topInstitutions: academicData.recordset,
            totalTalent: totalTalent,
            avgReviewDays: avgReviewDays !== null && avgReviewDays !== undefined ? avgReviewDays : null
        });

    } catch (err) {
        console.error("Analytics Aggregation Fault: ", err);
        return res.status(500).json({ success: false, error: "Database analytics aggregation pipeline failed." });
    }
};
