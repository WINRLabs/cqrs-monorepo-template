import Pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';
import { trace } from '@justbet/tracer';

type PinoTypes = LoggerOptions<string>;

export type JustBetLogger = Logger;

export interface ProgramLoggerParams {
  level: PinoTypes['level'];
  name: PinoTypes['name'];
}

export const createProgramLogger = (opts: ProgramLoggerParams): JustBetLogger => {
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
    formatters: {
      log: (obj) => {
        const span = trace.getActiveSpan();
        if (!span) return obj;
        const { spanId, traceId } = span.spanContext();
        return { ...obj, spanId, traceId };
      },
    },
  };

  return Pino(loggerOptions);
};
