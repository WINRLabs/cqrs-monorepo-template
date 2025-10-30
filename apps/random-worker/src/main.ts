import { createProgramLoggerTelemetryConfig } from "@justbet/logger";
import { createOtelSDK } from "@justbet/tracer";
import amqp, { type ConsumeMessage } from "amqplib";

const serviceName = process.env.SERVICE_NAME || "justbet-random-worker";

const AMQP_URL = process.env.AMQP_URL || "amqp://localhost";

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

function getRandomNumber(min: number, max: number): Promise<number> {
  const tracer = getTracer();
  return new Promise((resolve, reject) => {
    tracer.startActiveSpan("getRandomNumber", (span) => {
      try {
        const result = Math.floor(Math.random() * (max - min + 1) + min);
        span.setAttribute("randomNumber", result);
        resolve(result);
      } catch (err) {
        reject(err instanceof Error ? err.message : "Unknown error");
      } finally {
        span.end();
      }
    });
  });
}

async function main() {
  const connection = await amqp.connect(AMQP_URL);

  const channel = await connection.createChannel();

  const queue = await channel.assertQueue("random-number", {
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      "x-queue-type": "quorum",
    },
  });

  await channel.consume(queue.queue, (msg: ConsumeMessage | null) => {
    const tracer = getTracer();
    tracer.startActiveSpan(
      "consumeMessageFromRandomNumberQueue",
      async (span) => {
        if (msg === null) {
          logger.warn("No message received from queue");
          span.setStatus({
            code: 2,
            message: "No message received from queue",
          });

          span.end();

          return;
        }

        try {
          span.setAttribute("message", msg.content.toString());
          const result = await getRandomNumber(1, 6);
          span.setAttribute("result", result);
          logger.info(
            { message: msg.content.toString(), result },
            "Generated random number"
          );
          channel.ack(msg, false);
        } catch (err) {
          logger.error(err, "Error consuming message from queue");
        } finally {
          span.end();
        }
      }
    );
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
