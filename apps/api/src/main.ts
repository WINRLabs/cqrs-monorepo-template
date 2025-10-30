import express from "express";
import type { Request, Response, Express } from "express";
import { createProgramLoggerTelemetryConfig } from "@justbet/logger";
import { createOtelSDK } from "@justbet/tracer";

const serviceName = process.env.SERVICE_NAME || "justbet-api";

const getTracer = createOtelSDK({
  serviceName,
  isProd: process.env.NODE_ENV === "production",
  collectorUrl:
    process.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces",
});

const logger = createProgramLoggerTelemetryConfig({
  level: process.env.LOG_LEVEL || "info",
  name: serviceName,
});

const PORT: number = parseInt(process.env.PORT || "8080");

const app: Express = express();

app.use(express.json());

function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get("/", (req: Request, res: Response) => {
  const tracer = getTracer();
  tracer.startActiveSpan("GET /", (span) => {
    try {
      const result = getRandomNumber(1, 6);

      span.setAttribute("dice.result", result);

      logger.info({ randomNumber: result }, `Rolled a ${result}`);

      res.json({ result });
    } finally {
      span.end();
    }
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  logger.info(`Listening for requests on http://localhost:${PORT}`);
});
