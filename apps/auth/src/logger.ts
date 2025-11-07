import { type JBLogger, createProgramLoggerTelemetryConfig } from "@jb/logger";

export const logger: JBLogger = createProgramLoggerTelemetryConfig({
  level: process.env.LOG_LEVEL || "info",
  name: "jb-auth",
});
