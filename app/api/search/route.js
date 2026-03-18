import { NextResponse } from "next/server";

import { filterMarkdownFiles, getMarkdownFilesFlat } from "../../../lib/md-files";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim() ?? "";
  const form = searchParams.get("form")?.trim() ?? "";

  if (!keyword) {
    return NextResponse.json({ paths: [] });
  }

  try {
    const files = await getMarkdownFilesFlat();
    const matchedFiles = await filterMarkdownFiles(files, { form, keyword });

    return NextResponse.json({
      paths: matchedFiles.map((file) => file.path),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
