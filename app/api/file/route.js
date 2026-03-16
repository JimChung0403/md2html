import { NextResponse } from "next/server";

import { readMarkdownFile } from "../../../lib/md-files";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path query parameter." }, { status: 400 });
  }

  try {
    const content = await readMarkdownFile(filePath);
    return NextResponse.json({ path: filePath, content });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
