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
        return pool;
    } catch (err) {
        console.error(err);
    }
};

export { sql };