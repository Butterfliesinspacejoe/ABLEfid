// server.js (ESM version)
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Needed because __dirname is not defined in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

// MIME types mapping
const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  // Default to index.html if root is requested
  let filePath = req.url === "/" ? "/index.html" : req.url;

  // Prevent directory traversal
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");

  // Full path on disk
  const fullPath = path.join(__dirname, filePath);

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("500 Internal Server Error");
      }
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
