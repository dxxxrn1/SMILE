import { sql } from "../dbConnection/dbconnection.js";

// Fetch Student's Saved Opportunities
export const getSavedOpportunities = async (req, res) => {
  try {
    const stuId = req.user.id;

    const query = `
      SELECT 
        so.SaveID,
        o.OppID,
        o.Title,
        o.OppType,
        o.Province,
        o.ApplicationDeadline,
        org.OrgName
      FROM SavedOpportunities so
      JOIN Opportunities o ON so.OppID = o.OppID
      JOIN Organisation org ON o.OrgId = org.OrgId
      WHERE so.StuID = @StuID
      ORDER BY so.DateSaved DESC
    `;

    const request = new sql.Request();
    request.input("StuID", stuId);
    
    const result = await request.query(query);

    return res.status(200).json({
      success: true,
      savedOpportunities: result.recordset
    });
  } catch (error) {
    console.error("Error fetching saved opportunities:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Fetch Student's Applications
export const getStudentApplications = async (req, res) => {
  try {
    const stuId = req.user.id;

    const query = `
      SELECT 
        a.AppID,
        a.Status,
        a.DateApplied,
        o.OppID,
        o.Title,
        org.OrgName
      FROM Applications a
      JOIN Opportunities o ON a.OppID = o.OppID
      JOIN Organisation org ON o.OrgId = org.OrgId
      WHERE a.StuID = @StuID
      ORDER BY a.DateApplied DESC
    `;

    const request = new sql.Request();
    request.input("StuID", stuId);
    
    const result = await request.query(query);

    return res.status(200).json({
      success: true,
      applications: result.recordset
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Delete a saved opportunity
export const deleteSavedOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const oppId = req.params.oppId;

    const query = `
      DELETE FROM SavedOpportunities
      WHERE StuID = @StuID AND OppID = @OppID
    `;

    const request = new sql.Request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);
    
    await request.query(query);

    return res.status(200).json({
      success: true,
      message: "Opportunity removed from saved list."
    });
  } catch (error) {
    console.error("Error deleting saved opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Save an opportunity
export const saveOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { oppId } = req.body;

    if (!oppId) return res.status(400).json({ success: false, message: "Opportunity ID is required" });

    const query = `
      IF NOT EXISTS (SELECT 1 FROM SavedOpportunities WHERE StuID = @StuID AND OppID = @OppID)
      BEGIN
        INSERT INTO SavedOpportunities (StuID, OppID) VALUES (@StuID, @OppID)
      END
    `;

    const request = new sql.Request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);
    
    await request.query(query);

    return res.status(200).json({ success: true, message: "Opportunity saved successfully." });
  } catch (error) {
    console.error("Error saving opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Apply for an opportunity
export const applyForOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { oppId } = req.body;

    if (!oppId) return res.status(400).json({ success: false, message: "Opportunity ID is required" });

    const query = `
      IF NOT EXISTS (SELECT 1 FROM Applications WHERE StuID = @StuID AND OppID = @OppID)
      BEGIN
        INSERT INTO Applications (StuID, OppID, Status, DateApplied) VALUES (@StuID, @OppID, 'Pending', GETDATE())
      END
    `;

    const request = new sql.Request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);
    
    await request.query(query);

    return res.status(200).json({ success: true, message: "Application submitted successfully." });
  } catch (error) {
    console.error("Error applying for opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
