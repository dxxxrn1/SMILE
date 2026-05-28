import dotenv from "dotenv";
dotenv.config();
import sql from "mssql/msnodesqlv8.js";

const config = {
    connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${process.env.LUCAS_SERVER_NAME};Database=${process.env.DATABASE_NAME};Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes`
};

export const connectToDB = async () => {
    try {
        console.log("Trying to connect to DB");
        console.log("DB_SERVER:", process.env.LUCAS_SERVER_NAME);
        console.log("DB_DATABASE:", process.env.DATABASE_NAME);
        const pool = await sql.connect(config);
        console.log("Successfully connected to DB");
        return pool;
    } catch (err) {
        console.log(err);
    }
};

export { sql };