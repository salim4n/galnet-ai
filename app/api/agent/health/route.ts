import { NextResponse } from "next/server";
import { checkAzureHealth } from "@/lib/agent/azure-agent";

export async function GET() {
  try {
    const health = await checkAzureHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        isOnline: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
