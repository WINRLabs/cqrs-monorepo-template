import express from "express";
import type { Request, Response, Express } from "express";
import { createProgramLoggerTelemetryConfig } from "@justbet/logger";
import { context, createOtelSDK, propagation } from "@justbet/tracer";
import amqplib from "amqplib";

const PORT: number = parseInt(process.env.PORT || "8080");

const AMQP_URL =
  process.env.AMQP_URL ||
  "amqp://default_user_jv9GUd8KvfaqOisBq5z:AFDTEkFFd17Aav9D6simibY9a9_Fzuwo@localhost:5672";

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

async function main() {
  const connection = await amqplib.connect(AMQP_URL);

  const channel = await connection.createChannel();

  const queue = await channel.assertQueue("random-number", {
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      "x-queue-type": "quorum",
    },
  });

  const app: Express = express();

  app.use(express.json());

  app.get("/", async (req: Request, res: Response) => {
    const tracer = getTracer();

    tracer.startActiveSpan("sendMessageToRandomNumberQueue", async (span) => {
      try {
        const message = "Hello World";
        span.setAttribute("message", message);

        const spanContext = span.spanContext();

        // Inject trace context into message headers
        const headers: Record<string, string> = {};
        propagation.inject(context.active(), headers, {
          set: (
            carrier: Record<string, string>,
            key: string,
            value: string
          ) => {
            carrier[key] = value;
          },
        });

        channel.sendToQueue(queue.queue, Buffer.from(message), {
          headers,
        });

        logger.info({ message }, "Message sent to queue");
        res.json({ message: "Message sent to queue", sentMessage: message });
      } catch (err) {
        logger.error(err, "Error sending message to queue");
        res.status(500).json({
          message: "Error sending message to queue",
          error: err instanceof Error ? err.message : "Unknown error",
        });
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
}

main().catch((err) => {
  logger.error(err, "Error starting the application");
  process.exit(1);
});
