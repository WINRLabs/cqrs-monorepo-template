import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core';
import { trace, Tracer } from '@opentelemetry/api';

export type { Span } from '@opentelemetry/api';
export { context, trace } from '@opentelemetry/api';

interface OtelSDKArgs {
  serviceName: string;
  isProd: boolean;
  collectorUrl: string;
}

export function createOtelSDK({ serviceName, isProd, collectorUrl }: OtelSDKArgs): () => Tracer {
  const traceExporter = new OTLPTraceExporter({
    url: collectorUrl,
  });

  const spanProcessor = new BatchSpanProcessor(traceExporter);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter,
    spanProcessors: [spanProcessor],
    instrumentations: [getNodeAutoInstrumentations()],
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
