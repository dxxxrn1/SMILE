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
                org.OrgName
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
        const request = pool.request();
        
        request.input("OrgId", sql.Int, orgId);

        // Fetch applications for opportunities belonging to this organization
        const query = `
            SELECT 
                a.AppID, a.Status AS ApplicationStatus, a.DateApplied,
                o.Title AS OpportunityTitle, o.OppType, o.Province AS OpportunityProvince,
                s.StuID, s.StuName, s.StuLastName, s.StuEmail, s.StuProvince, s.StuEducationLevel
            FROM [dbo].[Applications] a
            JOIN [dbo].[Opportunities] o ON a.OppID = o.OppID
            JOIN [dbo].[Student] s ON a.StuID = s.StuID
            WHERE o.OrgId = @OrgId
            ORDER BY a.DateApplied DESC
        `;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            applicants: result.recordset
        });

    } catch (err) {
        console.error("Error fetching org applicants:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch applicants." });
    }
};