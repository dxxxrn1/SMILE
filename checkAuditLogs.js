import { connectToDB } from "./src/server/dbConnection/dbconnection.js";

async function run() {
  const pool = await connectToDB();
  
  console.log("\n--- Latest 20 Audit Logs ---");
  const logs = await pool.request().query("SELECT TOP 20 LogId, Action, Details, Timestamp FROM AuditLogs ORDER BY Timestamp DESC");
  console.table(logs.recordset);
  
  process.exit(0);
}

run();
