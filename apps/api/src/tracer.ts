import {
  createOtelSDK,
  context,
  propagation,
  type Span,
} from "@justbet/tracer";

const getTracer = createOtelSDK({
  serviceName: "justbet-api",
  isProd: process.env.NODE_ENV === "production",
  collectorUrl:
    process.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces",
});

export const tracer = getTracer();
