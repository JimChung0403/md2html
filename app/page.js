import {
  getMarkdownFilesFlat,
  getFormNameFromPath,
  groupFilesByDirectory,
  listForms,
  readMarkdownFile,
} from "../lib/md-files";
import ReaderApp from "./reader-app";

export const dynamic = "force-dynamic";

function getSearchParamValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function HomePage({ searchParams }) {
  const allFiles = await getMarkdownFilesFlat();
  const forms = listForms(allFiles);
  const requestedForm = getSearchParamValue(searchParams?.form);
  const selectedForm = forms.includes(requestedForm) ? requestedForm : "";
  const filteredFiles = selectedForm
    ? allFiles.filter((file) => getFormNameFromPath(file.path) === selectedForm)
    : allFiles;
  const directories = groupFilesByDirectory(filteredFiles);
  const requestedPath = getSearchParamValue(searchParams?.file);
  const selectedFile =
    filteredFiles.find((file) => file.path === requestedPath) ?? filteredFiles[0] ?? null;
  const content = selectedFile ? await readMarkdownFile(selectedFile.path) : "";

  return (
    <ReaderApp
      directories={directories}
      forms={forms}
      selectedForm={selectedForm}
      selectedPath={selectedFile?.path ?? ""}
      content={content}
    />
  );
}
