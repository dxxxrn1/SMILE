import { connectToDB } from "../dbConnection/dbconnection.js";
import fs from "fs";
import path from "path";

const run = async () => {
  try {
    const pool = await connectToDB();
    if (!pool) {
      console.error("Failed to connect to database pool");
      process.exit(1);
    }
    const sqlPath = path.join(process.cwd(), "src", "server", "sql", "add_pending_organisation.sql");
    let sqlContent = fs.readFileSync(sqlPath, "utf8");
    
    // Clean up GO and USE statements for node mssql which doesn't support batch delimiters
    sqlContent = sqlContent.replace(/USE\s+\[\w+\];?/gi, "");
    // Split by GO if it has multiple batches or just clean it up
    const batches = sqlContent.split(/\bGO\b/gi);

    console.log("Executing SQL batches...");
    for (let batch of batches) {
      batch = batch.trim();
      if (batch) {
        console.log(`Running batch:\n${batch}\n`);
        await pool.request().query(batch);
      }
    }
    console.log("Migration ran successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

run();
