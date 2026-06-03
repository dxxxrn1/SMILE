import dotenv from "dotenv";
dotenv.config();

import sql from "mssql";

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.LUCAS_SERVER_NAME,
    database: process.env.DATABASE_NAME,

    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

export const connectToDB = async () => {
    try {
        const pool = await sql.connect(config);
        console.log("Successfully connected to Azure SQL");

        // Ensure IsLoggedIn columns exist for session tracking
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Student') AND name = 'IsLoggedIn')
            BEGIN
                ALTER TABLE dbo.Student ADD IsLoggedIn INT NOT NULL DEFAULT 0;
            END
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Organisation') AND name = 'IsLoggedIn')
            BEGIN
                ALTER TABLE dbo.Organisation ADD IsLoggedIn INT NOT NULL DEFAULT 0;
            END
        `);

        // Ensure binary document columns exist for NPO registration PDF storage
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PendingOrganisation') AND name = 'OrgDocFile')
            BEGIN
                ALTER TABLE dbo.PendingOrganisation ADD OrgDocFile VARBINARY(MAX) NULL;
            END
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PendingOrganisation') AND name = 'OrgDocFileName')
            BEGIN
                ALTER TABLE dbo.PendingOrganisation ADD OrgDocFileName NVARCHAR(255) NULL;
            END
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PendingOrganisation') AND name = 'OrgDocMimeType')
            BEGIN
                ALTER TABLE dbo.PendingOrganisation ADD OrgDocMimeType NVARCHAR(100) NULL;
            END

            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Organisation') AND name = 'OrgDocFile')
            BEGIN
                ALTER TABLE dbo.Organisation ADD OrgDocFile VARBINARY(MAX) NULL;
            END
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Organisation') AND name = 'OrgDocFileName')
            BEGIN
                ALTER TABLE dbo.Organisation ADD OrgDocFileName NVARCHAR(255) NULL;
            END
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Organisation') AND name = 'OrgDocMimeType')
            BEGIN
                ALTER TABLE dbo.Organisation ADD OrgDocMimeType NVARCHAR(100) NULL;
            END
        `);

        return pool;
    } catch (err) {
        console.error(err);
    }
};

export { sql };