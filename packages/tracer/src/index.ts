import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
// import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core';
import { trace, Tracer } from '@opentelemetry/api';

import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

export type { Span, Tracer } from '@opentelemetry/api';
export { trace, context, propagation } from '@opentelemetry/api';
export { SpanStatusCode } from '@opentelemetry/api';

interface OtelSDKArgs {
  serviceName: string;
  isProd: boolean;
  collectorUrl: string;
}

const ignoringPaths = ['/health', '/metrics', '/favicon.ico'];

export function createOtelSDK({ serviceName, isProd, collectorUrl }: OtelSDKArgs): () => Tracer {
  const traceExporter = new OTLPTraceExporter({
    url: collectorUrl,
  });

  const wrappedExporter = {
    export: (spans: any, resultCallback: any) => {
      return traceExporter.export(spans, (result: any) => {
        if (result.code !== 0) {
          console.error(`[OpenTelemetry] Export failed:`, result);
        }

        resultCallback(result);
      });
    },
    shutdown: () => traceExporter.shutdown(),
  };

  // Batch processor with faster flush settings for local testing
  const spanProcessor = new BatchSpanProcessor(wrappedExporter as any, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 1000, // Flush every 1 second instead of default 5 seconds
    exportTimeoutMillis: 30000,
  });

  /*
  const consoleExporter = new ConsoleSpanExporter();
  const consoleProcessor = new BatchSpanProcessor(consoleExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 1000,
    exportTimeoutMillis: 30000,
  });
  */

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter,
    spanProcessors: [spanProcessor /*, consoleProcessor */],
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => ignoringPaths.some((path) => req?.url?.includes(path)) ?? false,
      }),
      new ExpressInstrumentation({ enabled: true, ignoreLayers: ignoringPaths }),
      new AmqplibInstrumentation({ enabled: true }),
    ],
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
        new B3Propagator({
          injectEncoding: B3InjectEncoding.MULTI_HEADER,
        }),
      ],
    }),

    /*
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
    }),
    */
  });

  sdk.start();

  return () => trace.getTracer(serviceName);
}
