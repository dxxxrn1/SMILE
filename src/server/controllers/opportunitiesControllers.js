import { connectToDB, sql } from "../dbConnection/dbconnection.js";

export const createNewOpportunity = async (req, res) => {
    try {
        const {
            title,
            type,
            province,
            maxApplicants,
            description,
            requirements,
            deadline,
            startDate,
            applicationLink
        } = req.body;

        // Get OrgId from session/cookie of the logged-in organisation
        const orgId = req.user?.id;

        if (!orgId || req.user?.accountType !== "organization") {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorised. Please log in as an organisation." 
        });
}

        // if (!orgId) {
        //     return res.status(401).json({ 
        //         success: false, 
        //         message: "Unauthorised. Please log in as an organisation." 
        //     });
        // }

        if (!title || !type || !province || !description || !deadline) {
            return res.status(400).json({ 
                success: false, 
                message: "Please fill in all required fields." 
            });
        }

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
            .query(`
                INSERT INTO [dbo].[Opportunities]
                    (OrgId, Title, OppType, Province, Description, Requirements,
                     ApplicationLink, MaxApplicants, ApplicationDeadline, StartDate)
                VALUES
                    (@OrgId, @Title, @OppType, @Province, @Description, @Requirements,
                     @ApplicationLink, @MaxApplicants, @ApplicationDeadline, @StartDate)
            `);

        return res.status(201).json({ 
            success: true, 
            message: "Opportunity published successfully!" 
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ 
            success: false, 
            message: "Something went wrong. Please try again." 
        });
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
