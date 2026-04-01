import sql from "mssql/msnodesqlv8.js";
import dotenv from "dotenv";

dotenv.config();

//Lucas Bohani Maluleke
const config = {

    connectionString:`Driver={ODBC Driver 18 for SQL Server};Server=${process.env.LUCAS_SERVER_NAME};Database=SMILE;Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes`

}

export const connectToDB = ()=>{

    try{
        console.log("trying  to connect to the Database");

        const pool = sql.connect(config);

        console.log("Successfully connected to the DB!!");

        return pool;

    }catch(err){

        console.log(err);
    }

}

export {sql};