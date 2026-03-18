"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

function createTree(directories) {
  const root = { name: "mdfile", path: "", directories: [], files: [] };

  for (const directory of directories) {
    if (directory.directory === "root") {
      root.files.push(...directory.files);
      continue;
    }

    const segments = directory.directory.split("/");
    let currentNode = root;
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let nextNode = currentNode.directories.find((node) => node.path === currentPath);

      if (!nextNode) {
        nextNode = { name: segment, path: currentPath, directories: [], files: [] };
        currentNode.directories.push(nextNode);
        currentNode.directories.sort((a, b) => a.name.localeCompare(b.name));
      }

      currentNode = nextNode;
    }

    currentNode.files.push(...directory.files.sort((a, b) => a.name.localeCompare(b.name)));
  }

  return root;
}

function isTreeOpen(nodePath, selectedPath, selectedForm) {
  if (!nodePath) {
    return true;
  }

  if (selectedForm) {
    if (nodePath === "forms") {
      return true;
    }

    if (nodePath === `forms/${selectedForm}`) {
      return true;
    }

    if (nodePath.startsWith(`forms/${selectedForm}/`)) {
      return true;
    }
  }

  return selectedPath === nodePath || selectedPath.startsWith(`${nodePath}/`);
}

function buildFileHref(filePath, selectedForm) {
  const params = new URLSearchParams();

  if (selectedForm) {
    params.set("form", selectedForm);
  }

  params.set("file", filePath);

  return `/?${params.toString()}`;
}

function buildFormHref(searchParams, form, selectedPath) {
  const params = new URLSearchParams(searchParams.toString());

  if (form) {
    params.set("form", form);
  } else {
    params.delete("form");
  }

  if (
    selectedPath &&
    (!form || selectedPath.startsWith(`forms/${form}/`) || !selectedPath.startsWith("forms/"))
  ) {
    params.set("file", selectedPath);
  } else {
    params.delete("file");
  }

  return params.toString() ? `?${params.toString()}` : "";
}

function filterDirectoriesByPaths(directories, matchedPaths) {
  const matchedPathSet = new Set(matchedPaths);

  return directories
    .map((directory) => ({
      ...directory,
      files: directory.files.filter((file) => matchedPathSet.has(file.path)),
    }))
    .filter((directory) => directory.files.length > 0);
}

function FileLink({ file, selectedPath, selectedForm }) {
  const isActive = file.path === selectedPath;

  return (
    <li>
      <Link className={`tree-file${isActive ? " active" : ""}`} href={buildFileHref(file.path, selectedForm)}>
        {file.name}
      </Link>
    </li>
  );
}

function TreeNode({ node, selectedPath, selectedForm }) {
  return (
    <li className="tree-node">
      <details open={isTreeOpen(node.path, selectedPath, selectedForm)}>
        <summary>{node.name}</summary>

        <ul className="tree-list">
          {node.directories.map((directory) => (
            <TreeNode
              key={directory.path}
              node={directory}
              selectedPath={selectedPath}
              selectedForm={selectedForm}
            />
          ))}
          {node.files.map((file) => (
            <FileLink
              key={file.path}
              file={file}
              selectedPath={selectedPath}
              selectedForm={selectedForm}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function SidebarBrowser({ directories, forms, selectedForm, selectedPath }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [matchedPaths, setMatchedPaths] = useState([]);
  const [searchState, setSearchState] = useState("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setKeyword("");
    setMatchedPaths([]);
    setSearchState("idle");
  }, [selectedForm]);

  useEffect(() => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      setMatchedPaths([]);
      setSearchState("idle");
      return;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      setSearchState("loading");

      try {
        const params = new URLSearchParams();
        params.set("q", normalizedKeyword);

        if (selectedForm) {
          params.set("form", selectedForm);
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Search failed.");
        }

        const payload = await response.json();
        setMatchedPaths(Array.isArray(payload.paths) ? payload.paths : []);
        setSearchState("done");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setMatchedPaths([]);
        setSearchState("error");
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [keyword, selectedForm]);

  const visibleDirectories = useMemo(() => {
    if (!keyword.trim()) {
      return directories;
    }

    return filterDirectoriesByPaths(directories, matchedPaths);
  }, [directories, keyword, matchedPaths]);

  const tree = useMemo(() => createTree(visibleDirectories), [visibleDirectories]);
  const emptyTreeMessage = keyword.trim()
    ? "找不到符合關鍵字的檔案內容。"
    : "目前找不到 markdown 檔案。";

  function handleFormChange(event) {
    const nextForm = event.target.value;
    const nextHref = buildFormHref(searchParams, nextForm, selectedPath);

    startTransition(() => {
      router.replace(`${pathname}${nextHref}`, { scroll: false });
    });
  }

  return (
    <>
      <div className="sidebar-header">
        <div className="sidebar-filters">
          <label className="filter-field">
            <span className="filter-label">Form</span>
            <select value={selectedForm} onChange={handleFormChange}>
              <option value="">全部 Form</option>
              {forms.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Keyword</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={selectedForm ? `搜尋 ${selectedForm} 內容` : "先選 form，再搜尋內容"}
            />
          </label>

          <p className="filter-hint">
            {isPending || searchState === "loading"
              ? "搜尋中..."
              : "URL 只保留 form；keyword 只過濾左側 tree，不會跳檔。"}
          </p>
        </div>

        <p className="eyebrow">MD Reader</p>
        <h1>目錄 Tree</h1>
        <p className="sidebar-copy">
          先選 form，再用關鍵字搜尋內容；左側只保留符合條件的目錄與檔案。
        </p>
      </div>

      <div className="tree-panel">
        {visibleDirectories.length === 0 ? (
          <div className="empty-state">
            <p>{emptyTreeMessage}</p>
          </div>
        ) : (
          <ul className="tree-root">
            {tree.directories.map((directory) => (
              <TreeNode
                key={directory.path}
                node={directory}
                selectedPath={selectedPath}
                selectedForm={selectedForm}
              />
            ))}
            {tree.files.map((file) => (
              <FileLink
                key={file.path}
                file={file}
                selectedPath={selectedPath}
                selectedForm={selectedForm}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
