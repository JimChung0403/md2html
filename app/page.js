import { listMarkdownFiles, readMarkdownFile } from "../lib/md-files";
import ReaderApp from "./reader-app";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const directories = await listMarkdownFiles();
  const allFiles = directories.flatMap((directory) => directory.files);
  const requestedPath = searchParams?.file ?? "";
  const selectedFile =
    allFiles.find((file) => file.path === requestedPath) ?? allFiles[0] ?? null;
  const content = selectedFile ? await readMarkdownFile(selectedFile.path) : "";

  return (
    <ReaderApp
      directories={directories}
      selectedPath={selectedFile?.path ?? ""}
      content={content}
    />
  );
}
