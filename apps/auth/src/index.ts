import "./instrumentation";
import { tracer } from "./instrumentation";
import { logger } from "./logger";

import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { type Span } from "@jb/tracer";

const app = new Hono();

const PORT = parseInt(process.env.PORT || "8080");

app.get("/", (c: Context) => {
  const message = "Hello Hono!";
  logger.info({ message }, "Hello Hono!");
  return c.text(message);
});

app.get("/health", (c: Context) => {
  return tracer.startActiveSpan("health", (span: Span) => {
    span.setAttribute("naber", "naber");
    return c.json({ status: "ok" });
  });
});

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
  }
);
