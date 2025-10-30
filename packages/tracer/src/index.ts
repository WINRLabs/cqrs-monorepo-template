import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';

export { trace } from '@opentelemetry/api';
export type { Span } from '@opentelemetry/api';

interface OtelSDKArgs {
  serviceName: string;
  isProd: boolean;
  collectorUrl: string;
}

export function createOtelSDK({ serviceName, isProd, collectorUrl }: OtelSDKArgs): NodeSDK {
  const sdk = new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  return sdk;
}
