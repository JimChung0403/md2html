import { promises as fs } from "fs";
import path from "path";

const MARKDOWN_ROOT = path.resolve(process.cwd(), "mdfile");

export function getFormNameFromPath(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const segments = normalizedPath.split("/");

  if (segments[0] !== "forms" || segments.length < 3) {
    return "";
  }

  return segments[1];
}

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

export function groupFilesByDirectory(files) {
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

export async function getMarkdownFilesFlat() {
  const files = [];

  try {
    await walkDirectory(MARKDOWN_ROOT, MARKDOWN_ROOT, files);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function listMarkdownFiles() {
  const files = await getMarkdownFilesFlat();
  return groupFilesByDirectory(files);
}

export async function readMarkdownFile(relativeFilePath) {
  const normalizedPath = relativeFilePath.replaceAll("\\", "/");
  const absolutePath = path.resolve(MARKDOWN_ROOT, normalizedPath);

  if (!absolutePath.startsWith(MARKDOWN_ROOT + path.sep) && absolutePath !== MARKDOWN_ROOT) {
    throw new Error("Invalid file path.");
  }

  if (!isMarkdownFile(absolutePath)) {
    throw new Error("Only markdown files are supported.");
  }

  return fs.readFile(absolutePath, "utf8");
}

export async function filterMarkdownFiles(files, { form = "", keyword = "" } = {}) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  const formFilteredFiles = form
    ? files.filter((file) => getFormNameFromPath(file.path) === form)
    : files;

  if (!normalizedKeyword) {
    return formFilteredFiles;
  }

  const matchedFiles = await Promise.all(
    formFilteredFiles.map(async (file) => {
      const pathMatch =
        file.name.toLowerCase().includes(normalizedKeyword) ||
        file.path.toLowerCase().includes(normalizedKeyword);

      if (pathMatch) {
        return file;
      }

      const content = await readMarkdownFile(file.path);

      return content.toLowerCase().includes(normalizedKeyword) ? file : null;
    })
  );

  return matchedFiles.filter(Boolean);
}

export function listForms(files) {
  return Array.from(
    new Set(files.map((file) => getFormNameFromPath(file.path)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}
