import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/server/config";

function decodePath(id: string): string {
  const decoded = Buffer.from(id, "base64url").toString("utf8");
  return normalize(decoded);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const relativePath = decodePath(id);
    const absolutePath = resolve(config.mediaRoot, relativePath);
    const allowedRoot = resolve(config.mediaRoot);

    if (!absolutePath.startsWith(allowedRoot)) {
      return NextResponse.json({ message: "Invalid stream path" }, { status: 400 });
    }

    const fileStats = await stat(absolutePath);
    const fileSize = fileStats.size;
    const range = request.headers.get("range");

    if (!range) {
      const stream = createReadStream(absolutePath);
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename=\"${basename(absolutePath)}\"`
        }
      });
    }

    const [startValue, endValue] = range.replace(/bytes=/, "").split("-");
    const start = Number(startValue);
    const end = endValue ? Number(endValue) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
      return new NextResponse("Requested range not satisfiable", { status: 416 });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(absolutePath, { start, end });

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename=\"${basename(absolutePath)}\"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Unable to stream media", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
