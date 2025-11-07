import { createOtelSDK, Span, SpanStatusCode, type Tracer } from "@jb/tracer";
import type { Context, TypedResponse } from "hono";
import { HandlerResponse } from "hono/types";
import { StatusCode } from "hono/utils/http-status";
import { JSONValue } from "hono/utils/types";

export const instrumentationConfig = {
  serviceName: "jb-auth",
  isProd: process.env.NODE_ENV === "production",
  collectorUrl:
    process.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces",
};

const getTracer = createOtelSDK(instrumentationConfig);

export const tracer: Tracer = getTracer();

export const spanCloser = async <T extends JSONValue>(
  span: Span,
  c: Context,
  cb: (c: Context) => HandlerResponse<T> | Promise<HandlerResponse<T>>
): Promise<TypedResponse<T> | Response> => {
  try {
    span.setAttribute("req.body", await c.req.text());
    return await Promise.resolve(cb(c));
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    span.end();
  }
};
