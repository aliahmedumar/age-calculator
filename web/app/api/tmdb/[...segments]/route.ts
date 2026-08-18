import { NextRequest, NextResponse } from "next/server";
import { tmdbProxy } from "@/lib/server/tmdb";

export async function GET(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  try {
    const { segments } = await context.params;
    const path = segments.join("/");
    const payload = await tmdbProxy(path, request.nextUrl.searchParams);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: "TMDB proxy request failed", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
