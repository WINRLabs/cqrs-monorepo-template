import { opentelemetry } from "@elysiajs/opentelemetry";

import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { AmqplibInstrumentation } from "@opentelemetry/instrumentation-amqplib";

const ignoringPaths = ["/health", "/metrics", "/favicon.ico"];

export const instrumentation = opentelemetry({
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) =>
        ignoringPaths.some((path) => req?.url?.includes(path)) ?? false,
    }),
    new AmqplibInstrumentation({ enabled: true }),
  ],
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: Bun.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces",
      })
    ),
  ],
});
