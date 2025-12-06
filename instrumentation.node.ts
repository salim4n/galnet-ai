import { useAzureMonitor } from "@azure/monitor-opentelemetry";

export function setupAzureTracing() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.log("[Tracing] No APPLICATIONINSIGHTS_CONNECTION_STRING found, skipping Azure Monitor setup");
    return;
  }

  try {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString,
      },
      instrumentationOptions: {
        azureSdk: { enabled: true },
        http: { enabled: true },
      },
    });

    console.log("[Tracing] Azure Application Insights configured successfully");
  } catch (error) {
    console.error("[Tracing] Failed to setup Azure Monitor:", error);
  }
}
