import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"] ?? "3000");

if (Number.isNaN(port) || port <= 0) {
  logger.warn({ port: process.env["PORT"] }, "Invalid PORT, using 3000");
}

const finalPort = Number.isNaN(port) || port <= 0 ? 3000 : port;

app.listen(finalPort, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port: finalPort }, "Server listening");
});
