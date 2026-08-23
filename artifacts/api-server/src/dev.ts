// Dev entry point: loads .env BEFORE any other imports, with override
// to ensure Freebuff/Replit env vars don't shadow .env values
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ override: true, path: path.resolve(__dirname, "..", ".env") });
// Dynamic import ensures dotenv is loaded before index.ts and its dependencies
await import("./index");
