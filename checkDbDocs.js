import { connectToDB } from "./src/server/dbConnection/dbconnection.js";

async function run() {
  const pool = await connectToDB();
  
  console.log("\n--- Pending Organisations ---");
  const pending = await pool.request().query("SELECT PendingId, OrgName, OrgDocument FROM PendingOrganisation");
  console.table(pending.recordset);

  console.log("\n--- Approved Organisations ---");
  const approved = await pool.request().query("SELECT OrgId, OrgName, OrgDocument FROM Organisation");
  console.table(approved.recordset);
  
  process.exit(0);
}

run();
