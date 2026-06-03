import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.LUCAS_SERVER_NAME,
    database: "master", // connect to master to query all databases
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function run() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to master on:", process.env.LUCAS_SERVER_NAME);
    const result = await pool.request().query("SELECT name FROM sys.databases");
    console.table(result.recordset);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
