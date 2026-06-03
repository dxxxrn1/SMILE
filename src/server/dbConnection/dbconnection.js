import dotenv from "dotenv";
dotenv.config();

import sql from "mssql";

const config = {
    connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=${process.env.BRANDON_SERVER_NAME};Database=${process.env.DATABASE_NAME};Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes`
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