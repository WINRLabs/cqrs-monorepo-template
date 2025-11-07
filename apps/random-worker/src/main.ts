import "./tracer";
import { tracer } from "./tracer";
import { propagation, context, type Span } from "@jb/tracer";

import { createProgramLoggerTelemetryConfig } from "@jb/logger";
import amqp, { type ConsumeMessage } from "amqplib";

const serviceName = process.env.SERVICE_NAME || "jb-random-worker";

const AMQP_URL =
  process.env.AMQP_URL ||
  "amqp://default_user_jv9GUd8KvfaqOisBq5z:AFDTEkFFd17Aav9D6simibY9a9_Fzuwo@localhost:5672";

const logger = createProgramLoggerTelemetryConfig({
  level: process.env.LOG_LEVEL || "info",
  name: serviceName,
});

function getRandomNumber(min: number, max: number): Promise<number> {
  return new Promise((resolve, reject) => {
    tracer.startActiveSpan("getRandomNumber", (span: Span) => {
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
    if (msg === null) {
      logger.warn("No message received from queue");
      return;
    }

    // Extract trace context from message headers
    const headers = msg.properties.headers || {};

    const parentContext = propagation.extract(context.active(), headers, {
      get: (carrier: Record<string, any>, key: string) => {
        return carrier[key] as string | undefined;
      },
      keys: (carrier: Record<string, any>) => Object.keys(carrier),
    });

    // Start span with parent context using context.with
    context.with(parentContext, () => {
      tracer.startActiveSpan(
        "consumeMessageFromRandomNumberQueue",
        {
          kind: 1, // SERVER
        },
        async (span: Span) => {
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
            span.setStatus({
              code: 2,
              message: err instanceof Error ? err.message : "Unknown error",
            });
          } finally {
            span.end();
          }
        }
      );
    });
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
