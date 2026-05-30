// Register global error handlers for Azure deployment diagnostics
process.on("unhandledRejection", (reason) => {
  console.error("=== UNHANDLED REJECTION ===");
  console.error(reason);
});
process.on("uncaughtException", (error) => {
  console.error("=== UNCAUGHT EXCEPTION ===");
  console.error(error.stack || error);
  process.exit(1);
});

// Global polyfills to prevent canvas/pdf-parse ReferenceErrors on environment load
if (typeof global.DOMMatrix === "undefined") {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === "undefined") {
  global.ImageData = class ImageData {};
}
if (typeof global.Path2D === "undefined") {
  global.Path2D = class Path2D {};
}

import dotenv from "dotenv";
dotenv.config();
import "./src/server/main.js";
