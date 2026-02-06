import { NextResponse } from "next/server";
import { checkIgnitionHealth } from "@/lib/agent/ignition-agent";

export async function GET() {
  try {
    const health = await checkIgnitionHealth();
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
