import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidBlock from "./mermaid-block";
import SidebarBrowser from "./sidebar-browser";

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
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

export default function ReaderApp({ directories, forms, selectedForm, selectedPath, content }) {
  return (
    <main className="page-shell">
      <section className="sidebar">
        <SidebarBrowser
          directories={directories}
          forms={forms}
          selectedForm={selectedForm}
          selectedPath={selectedPath}
        />
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
