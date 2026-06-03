import dotenv from "dotenv";
dotenv.config();

import sql from "mssql";

const config = {
<<<<<<< HEAD
    connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=${process.env.BRANDON_SERVER_NAME};Database=${process.env.DATABASE_NAME};Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes`
=======
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.LUCAS_SERVER_NAME,
    database: process.env.DATABASE_NAME,

    options: {
        encrypt: true,
        trustServerCertificate: false
    }
>>>>>>> dev
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