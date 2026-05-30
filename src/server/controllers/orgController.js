import dotenv from "dotenv";
dotenv.config();
import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(buffer, publicId, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}

function getImageExtension(mimeType) {
  const allowed = {
    "image/jpeg": "jpg",
    "image/jpg":  "jpg",
    "image/png":  "png",
    "image/gif":  "gif",
    "image/webp": "webp"
  };
  return allowed[mimeType] || null;
}

// GET /api/org/profile
export const getOrgProfile = async (req, res) => {
  try {
    const orgId = req.user?.id;
    if (!orgId || req.user?.accountType !== "organization") {
      return res.status(401).json({ success: false, message: "Unauthorised." });
    }

    const pool = await connectToDB();
    const result = await pool.request()
      .input("OrgId", sql.Int, orgId)
      .query(`
        SELECT OrgId, OrgName, OrgEmail, Type, Province, OrgBio, OrgProfilePic
        FROM Organisation
        WHERE OrgId = @OrgId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Organisation not found." });
    }

    return res.status(200).json({ success: true, profile: result.recordset[0] });
  } catch (err) {
    console.error("getOrgProfile error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// PUT /api/org/profile
export const updateOrgProfile = async (req, res) => {
  try {
    const orgId = req.user?.id;
    if (!orgId || req.user?.accountType !== "organization") {
      return res.status(401).json({ success: false, message: "Unauthorised." });
    }

    const { orgName, bio, profilePic } = req.body;

    if (!orgName || !bio) {
      return res.status(400).json({ success: false, message: "Organisation name and bio are required." });
    }

    const pool = await connectToDB();

    const existing = await pool.request()
      .input("OrgId", sql.Int, orgId)
      .query(`SELECT OrgProfilePic FROM Organisation WHERE OrgId = @OrgId`);

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Organisation not found." });
    }

    let profilePicUrl = existing.recordset[0].OrgProfilePic || null;

    if (typeof profilePic === "string" && profilePic.trim()) {
      if (profilePic.startsWith("data:image/")) {
        const matches = profilePic.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const extension = getImageExtension(mimeType);

          if (!extension) {
            return res.status(400).json({ success: false, message: "Only JPG, PNG, GIF, or WEBP images are allowed." });
          }

          const buffer = Buffer.from(matches[2], "base64");
          if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: "Image must be smaller than 2MB." });
          }

          // ✅ Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(
            buffer,
            `org_${orgId}`,
            "smile/organisations"
          );
          profilePicUrl = uploadResult.secure_url;
        }
      } else {
        return res.status(400).json({ success: false, message: "Invalid image format." });
      }
    }

    await pool.request()
      .input("OrgId",         sql.Int,          orgId)
      .input("OrgName",       sql.VarChar(255),  orgName)
      .input("OrgBio",        sql.NVarChar,      bio)
      .input("OrgProfilePic", sql.NVarChar(255), profilePicUrl)
      .query(`
        UPDATE Organisation
        SET OrgName       = @OrgName,
            OrgBio        = @OrgBio,
            OrgProfilePic = @OrgProfilePic
        WHERE OrgId = @OrgId
      `);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profilePicUrl
    });
  } catch (err) {
    console.error("updateOrgProfile error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// GET /api/org/public-profile/:orgId
export const getOrgPublicProfile = async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId, 10);
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Invalid organisation ID." });
    }

    const pool = await connectToDB();
    const result = await pool.request()
      .input("OrgId", sql.Int, orgId)
      .query(`
        SELECT OrgName, OrgBio, OrgProfilePic, Type, Province
        FROM Organisation
        WHERE OrgId = @OrgId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Organisation not found." });
    }

    return res.status(200).json({ success: true, org: result.recordset[0] });
  } catch (err) {
    console.error("getOrgPublicProfile error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};