import { connectToDB, sql } from "../dbConnection/dbconnection.js";
import fs from "fs";
import path from "path";

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

// ✅ FIXED: Now uses connectToDB pool
async function ensureStudentProfileColumns() {
  const pool = await connectToDB();
  await pool.request().query(`
    IF COL_LENGTH('dbo.Student', 'StuBio') IS NULL
      ALTER TABLE dbo.Student ADD StuBio NVARCHAR(MAX) NULL;

    IF COL_LENGTH('dbo.Student', 'ProfilePicUrl') IS NULL
      ALTER TABLE dbo.Student ADD ProfilePicUrl NVARCHAR(255) NULL;

    IF COL_LENGTH('dbo.Student', 'StuAcademicSubjects') IS NULL
      ALTER TABLE dbo.Student ADD StuAcademicSubjects NVARCHAR(MAX) NULL;
  `);
}

function getProfileImageExtension(mimeType) {
  const allowed = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
  };
  return allowed[mimeType] || null;
}

// ✅ FIXED
export const getSavedOpportunities = async (req, res) => {
  try {
    const stuId = req.user.id;
    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);

    const result = await request.query(`
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
    `);

    return res.status(200).json({
      success: true,
      savedOpportunities: result.recordset
    });
  } catch (error) {
    console.error("Error fetching saved opportunities:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getStudentNotifications = async (req, res) => {
  try {
    const stuId = req.user.id;
    const pool = await connectToDB();
    await ensureStudentNotificationsTable(pool);

    const request = pool.request();
    request.input("StuID", stuId);

    const result = await request.query(`
      SELECT TOP 20
        NotificationID,
        AppID,
        Title,
        Message,
        NotificationType,
        IsRead,
        DateCreated
      FROM StudentNotifications
      WHERE StuID = @StuID
      ORDER BY DateCreated DESC
    `);

    const unreadResult = await pool.request()
      .input("StuID", stuId)
      .query(`
        SELECT COUNT(*) AS UnreadCount
        FROM StudentNotifications
        WHERE StuID = @StuID AND IsRead = 0
      `);

    return res.status(200).json({
      success: true,
      notifications: result.recordset,
      unreadCount: unreadResult.recordset[0]?.UnreadCount || 0
    });
  } catch (error) {
    console.error("Error fetching student notifications:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const markStudentNotificationsRead = async (req, res) => {
  try {
    const stuId = req.user.id;
    const pool = await connectToDB();
    await ensureStudentNotificationsTable(pool);

    const request = pool.request();
    request.input("StuID", stuId);
    await request.query(`
      UPDATE StudentNotifications
      SET IsRead = 1
      WHERE StuID = @StuID AND IsRead = 0
    `);

    return res.status(200).json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const getStudentApplications = async (req, res) => {
  try {
    const stuId = req.user.id;
    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);

    const result = await request.query(`
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
    `);

    return res.status(200).json({
      success: true,
      applications: result.recordset
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const deleteSavedOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const oppId = req.params.oppId;
    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);

    await request.query(`
      DELETE FROM SavedOpportunities
      WHERE StuID = @StuID AND OppID = @OppID
    `);

    return res.status(200).json({
      success: true,
      message: "Opportunity removed from saved list."
    });
  } catch (error) {
    console.error("Error deleting saved opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const saveOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { oppId } = req.body;

    if (!oppId) return res.status(400).json({ success: false, message: "Opportunity ID is required" });

    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM SavedOpportunities WHERE StuID = @StuID AND OppID = @OppID)
      BEGIN
        INSERT INTO SavedOpportunities (StuID, OppID) VALUES (@StuID, @OppID)
      END
    `);

    return res.status(200).json({ success: true, message: "Opportunity saved successfully." });
  } catch (error) {
    console.error("Error saving opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const applyForOpportunity = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { oppId } = req.body;

    if (!oppId) return res.status(400).json({ success: false, message: "Opportunity ID is required" });

    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);
    request.input("OppID", oppId);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM Applications WHERE StuID = @StuID AND OppID = @OppID)
      BEGIN
        INSERT INTO Applications (StuID, OppID, Status, DateApplied) VALUES (@StuID, @OppID, 'Pending', GETDATE())
      END
    `);

    return res.status(200).json({ success: true, message: "Application submitted successfully." });
  } catch (error) {
    console.error("Error applying for opportunity:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const getStudentProfile = async (req, res) => {
  try {
    const stuId = req.user.id;
    await ensureStudentProfileColumns();

    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);

    const result = await request.query(`
      SELECT StuID, StuName, StuLastName, StuEmail, StuProvince, StuEducationLevel, StuBio, ProfilePicUrl, StuAcademicSubjects
      FROM Student
      WHERE StuID = @StuID
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    return res.status(200).json({
      success: true,
      profile: result.recordset[0]
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const updateStudentProfile = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { firstName, lastName, educationLevel, bio, profilePic } = req.body;
    await ensureStudentProfileColumns();

    if (!firstName || !lastName || !bio) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    const pool = await connectToDB();

    const existing = await pool.request()
      .input("StuID", stuId)
      .query(`SELECT ProfilePicUrl FROM Student WHERE StuID = @StuID`);

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    let profilePicUrl = existing.recordset[0].ProfilePicUrl || null;
    if (typeof profilePic === "string" && profilePic.trim()) {
      if (profilePic.startsWith("data:image/")) {
        const matches = profilePic.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const extension = getProfileImageExtension(mimeType);
          if (!extension) {
            return res.status(400).json({ success: false, message: "Only JPG, PNG, GIF, or WEBP profile pictures are allowed." });
          }

          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: "Profile picture must be smaller than 2MB." });
          }

          const fileName = `student_${stuId}_${Date.now()}.${extension}`;
          const uploadDir = path.join(process.cwd(), "src", "frontEnd", "Assets", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, buffer);
          profilePicUrl = `/Assets/uploads/${fileName}`;
        }
      } else if (profilePic.startsWith("/Assets/")) {
        profilePicUrl = profilePic;
      } else {
        return res.status(400).json({ success: false, message: "Invalid profile picture format." });
      }
    }

    const request = pool.request();
    request.input("StuID", stuId);
    request.input("firstName", firstName);
    request.input("lastName", lastName);
    request.input("educationLevel", educationLevel || null);
    request.input("bio", bio);
    request.input("profilePicUrl", profilePicUrl);

    await request.query(`
      UPDATE Student
      SET StuName = @firstName,
          StuLastName = @lastName,
          StuEducationLevel = @educationLevel,
          StuBio = @bio,
          ProfilePicUrl = @profilePicUrl
      WHERE StuID = @StuID
    `);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profilePicUrl: profilePicUrl
    });
  } catch (error) {
    console.error("Error updating student profile:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ✅ FIXED
export const updateStudentBio = async (req, res) => {
  try {
    const stuId = req.user.id;
    const { bio, academicSubjects } = req.body;

    if (!bio) {
      return res.status(400).json({ success: false, message: "Bio content is required." });
    }

    const pool = await connectToDB();
    const request = pool.request();
    request.input("StuID", stuId);
    request.input("bio", bio);
    request.input("academicSubjects", academicSubjects || null);

    await request.query(`
      UPDATE Student
      SET StuBio = @bio,
          StuAcademicSubjects = ISNULL(@academicSubjects, StuAcademicSubjects)
      WHERE StuID = @StuID
    `);

    return res.status(200).json({
      success: true,
      message: "Bio updated successfully."
    });
  } catch (error) {
    console.error("Error updating bio:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
