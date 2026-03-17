import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidBlock from "./mermaid-block";

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}

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

function isTreeOpen(nodePath, selectedPath) {
  if (!nodePath) {
    return true;
  }

  return selectedPath === nodePath || selectedPath.startsWith(`${nodePath}/`);
}

function FileLink({ file, selectedPath }) {
  const isActive = file.path === selectedPath;

  return (
    <li>
      <Link
        className={`tree-file${isActive ? " active" : ""}`}
        href={`/?file=${encodeURIComponent(file.path)}`}
      >
        {file.name}
      </Link>
    </li>
  );
}

function TreeNode({ node, selectedPath }) {
  return (
    <li className="tree-node">
      <details open={isTreeOpen(node.path, selectedPath)}>
        <summary>{node.name}</summary>

        <ul className="tree-list">
          {node.directories.map((directory) => (
            <TreeNode key={directory.path} node={directory} selectedPath={selectedPath} />
          ))}
          {node.files.map((file) => (
            <FileLink key={file.path} file={file} selectedPath={selectedPath} />
          ))}
        </ul>
      </details>
    </li>
  );
}

function MarkdownPre({ children }) {
  return children;
}

function MarkdownCode({ inline, className, children, ...props }) {
  const language = className?.match(/language-([\w-]+)/)?.[1]?.toLowerCase();
  const value = String(children).replace(/\n$/, "");

  if (!inline && language === "mermaid") {
    return <MermaidBlock chart={value} />;
  }

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <pre>
      <code className={className} {...props}>
        {value}
      </code>
    </pre>
  );
}

function MarkdownTable({ children, ...props }) {
  return (
    <div className="table-scroll">
      <table {...props}>{children}</table>
    </div>
  );
}

export default function ReaderApp({ directories, selectedPath, content }) {
  const tree = createTree(directories);

  return (
    <main className="page-shell">
      <section className="sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">MD Reader</p>
          <h1>目錄 Tree</h1>
          <p className="sidebar-copy">左側顯示目錄與檔案樹，點選檔案後在右側閱讀。</p>
        </div>

        <div className="tree-panel">
          {directories.length === 0 ? (
            <EmptyState message="目前找不到 markdown 檔案。" />
          ) : (
            <ul className="tree-root">
              {tree.directories.map((directory) => (
                <TreeNode key={directory.path} node={directory} selectedPath={selectedPath} />
              ))}
              {tree.files.map((file) => (
                <FileLink key={file.path} file={file} selectedPath={selectedPath} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="viewer">
        <div className="viewer-header">
          <p className="viewer-label">目前檔案</p>
          <h2>{selectedPath || "尚未選擇檔案"}</h2>
        </div>

        <div className="viewer-content">
          {!selectedPath ? (
            <EmptyState message="請先選擇要閱讀的 markdown 檔案。" />
          ) : (
            <article className="markdown-body">
              <ReactMarkdown
                components={{
                  code: MarkdownCode,
                  pre: MarkdownPre,
                  table: MarkdownTable,
                }}
                remarkPlugins={[remarkGfm]}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
