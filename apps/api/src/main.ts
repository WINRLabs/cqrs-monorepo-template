import "./tracer.js";
import { tracer } from "./tracer.js";
import { context, propagation, type Span } from "@justbet/tracer";
import express from "express";
import type { Request, Response, Express } from "express";
import { createProgramLoggerTelemetryConfig } from "@justbet/logger";
import amqplib from "amqplib";

const PORT: number = parseInt(process.env.PORT || "8080");

const AMQP_URL =
  process.env.AMQP_URL ||
  "amqp://default_user_jv9GUd8KvfaqOisBq5z:AFDTEkFFd17Aav9D6simibY9a9_Fzuwo@localhost:5672";

const logger = createProgramLoggerTelemetryConfig({
  level: process.env.LOG_LEVEL || "info",
  name: process.env.SERVICE_NAME || "justbet-api",
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
    tracer.startActiveSpan(
      "sendMessageToRandomNumberQueue",
      async (span: Span) => {
        try {
          const message = "Hello World";
          span.setAttribute("message", message);

          // Inject trace context into message headers
          // TODO: try with hooks
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
      }
    );
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
