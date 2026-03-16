import { promises as fs } from "fs";
import path from "path";

const MARKDOWN_ROOT = path.resolve(process.cwd(), "mdfile");

function isMarkdownFile(fileName) {
  return fileName.endsWith(".md") || fileName.endsWith(".markdown");
}

async function walkDirectory(currentDir, rootDir, output) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(absolutePath, rootDir, output);
      continue;
    }

    if (entry.isFile() && isMarkdownFile(entry.name)) {
      output.push({
        name: entry.name,
        path: path.relative(rootDir, absolutePath).split(path.sep).join("/"),
      });
    }
  }
}

function groupFilesByDirectory(files) {
  const directoryMap = new Map();

  for (const file of files) {
    const segments = file.path.split("/");
    const directory = segments.length > 1 ? segments.slice(0, -1).join("/") : "root";
    const bucket = directoryMap.get(directory) ?? {
      directory,
      label: directory === "root" ? "根目錄" : directory.split("/").at(-1),
      files: [],
    };

    bucket.files.push(file);
    directoryMap.set(directory, bucket);
  }

  return Array.from(directoryMap.values())
    .map((group) => ({
      ...group,
      files: group.files.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.directory.localeCompare(b.directory));
}

async function getResolvedRoot() {
  return fs.realpath(MARKDOWN_ROOT);
}

export async function listMarkdownFiles() {
  const files = [];

  try {
    await walkDirectory(MARKDOWN_ROOT, MARKDOWN_ROOT, files);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return groupFilesByDirectory(files.sort((a, b) => a.path.localeCompare(b.path)));
}

export async function readMarkdownFile(relativeFilePath) {
  const resolvedRoot = await getResolvedRoot();
  const normalizedPath = relativeFilePath.replaceAll("\\", "/");
  const absolutePath = path.resolve(resolvedRoot, normalizedPath);

  if (!absolutePath.startsWith(resolvedRoot + path.sep) && absolutePath !== resolvedRoot) {
    throw new Error("Invalid file path.");
  }

  if (!isMarkdownFile(absolutePath)) {
    throw new Error("Only markdown files are supported.");
  }

  return fs.readFile(absolutePath, "utf8");
}
