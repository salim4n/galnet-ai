export async function register() {
  // Only run on server-side (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupAzureTracing } = await import("./instrumentation.node");
    setupAzureTracing();
  }
}
