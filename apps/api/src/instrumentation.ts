import { createOtelSDK, type Tracer } from "@jb/tracer";

const getTracer = createOtelSDK({
  serviceName: process.env.SERVICE_NAME || "jb-api",
  isProd: process.env.NODE_ENV === "production",
  collectorUrl:
    process.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces",
});

export const tracer: Tracer = getTracer();
