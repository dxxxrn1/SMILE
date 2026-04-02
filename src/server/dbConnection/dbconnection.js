import dotenv from "dotenv";
dotenv.config();
import sql from "mssql/msnodesqlv8.js";

const config = {
    connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${process.env.LUCAS_SERVER_NAME};Database=SMILE;Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes`
};

export const connectToDB = async () => {

    try{
        console.log("Trying to connect to DB");

        const pool = await sql.connect(config);

        console.log("Successfully connected to DB");

        return pool;
    }catch(err){
        console.log(err);
    }
   
};

export { sql };