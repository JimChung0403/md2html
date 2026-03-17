"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let isMermaidInitialized = false;

function initializeMermaid() {
  if (isMermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
    fontFamily: 'Georgia, "Times New Roman", serif',
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
  });

  isMermaidInitialized = true;
}

function getIntrinsicSize(svgElement) {
  const viewBox = svgElement.viewBox?.baseVal;

  if (viewBox?.width && viewBox?.height) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const width = Number.parseFloat(svgElement.getAttribute("width")) || svgElement.clientWidth;
  const height =
    Number.parseFloat(svgElement.getAttribute("height")) || svgElement.clientHeight;

  return { width, height };
}

export default function MermaidBlock({ chart }) {
  const chartId = useId().replaceAll(":", "");
  const frameRef = useRef(null);
  const graphicRef = useRef(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      if (!chart.trim()) {
        setSvg("");
        setError("");
        return;
      }

      try {
        initializeMermaid();
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${chartId}`, chart);

        if (cancelled) {
          return;
        }

        setSvg(renderedSvg);
        setError("");
      } catch (renderError) {
        if (cancelled) {
          return;
        }

        setSvg("");
        setError(renderError instanceof Error ? renderError.message : "Mermaid render failed.");
      }
    }

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, chartId]);

  useLayoutEffect(() => {
    if (!svg || !frameRef.current || !graphicRef.current) {
      return;
    }

    const frame = frameRef.current;
    const graphic = graphicRef.current;

    const updateSize = () => {
      const svgElement = graphic.querySelector("svg");

      if (!svgElement) {
        return;
      }

      const { width, height: svgHeight } = getIntrinsicSize(svgElement);
      const availableWidth = frame.clientWidth - 8;
      const nextScale =
        width > availableWidth ? Math.max(availableWidth / width, 0.45) : 1;
      const nextHeight = svgHeight ? Math.ceil(svgHeight * nextScale) : null;

      setScale((current) => (Math.abs(current - nextScale) > 0.01 ? nextScale : current));
      setHeight((current) => (current !== nextHeight ? nextHeight : current));
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(frame);

    return () => {
      resizeObserver.disconnect();
    };
  }, [svg]);

  if (error) {
    return (
      <section className="mermaid-block mermaid-error">
        <p className="mermaid-caption">Mermaid 圖表渲染失敗，以下保留原始內容。</p>
        <pre>
          <code>{chart}</code>
        </pre>
      </section>
    );
  }

  return (
    <section className="mermaid-block">
      <div className="mermaid-caption">Flowchart</div>
      {!svg ? <p className="mermaid-loading">正在產生流程圖...</p> : null}
      {svg ? (
        <div className="mermaid-frame" ref={frameRef}>
          <div className="mermaid-stage" style={height ? { height: `${height}px` } : undefined}>
            <div
              className="mermaid-graphic"
              ref={graphicRef}
              style={{ transform: `scale(${scale})` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
