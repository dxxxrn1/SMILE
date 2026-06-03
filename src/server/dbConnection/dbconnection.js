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

        return pool;
    } catch (err) {
        console.error(err);
    }
};

export { sql };