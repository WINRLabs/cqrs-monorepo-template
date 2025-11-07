import Pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';
import { trace } from '@jb/tracer';

type PinoTypes = LoggerOptions<string>;

export type JBLogger = Logger;

export interface ProgramLoggerParams {
  level: PinoTypes['level'];
  name: PinoTypes['name'];
}

export const createProgramLogger = (opts: ProgramLoggerParams): JBLogger => {
  const loggerOptions: LoggerOptions = {
    name: opts.name,
    level: opts.level,

    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: true,
        colorize: true,
        ignore: 'time,hostname,req,res,pid',
      },
    },
  };

  return Pino(loggerOptions);
};

export const createProgramLoggerTelemetryConfig = (opts: ProgramLoggerParams) => {
  const loggerOptions: LoggerOptions = {
    name: opts.name,
    level: opts.level,

    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: true,
        colorize: true,
        ignore: 'time,hostname,req,res,pid',
      },
    },
    mixin: () => {
      const span = trace.getActiveSpan();
      if (!span) return {};
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    },
  };

  return Pino(loggerOptions);
};
