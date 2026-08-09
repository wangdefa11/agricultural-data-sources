"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EmbedBlock } from "../content/types";

export function EmbeddedChart({ block }: { block: EmbedBlock }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(block.height ?? 720);

  const requestHeight = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "commodity-chart-measure" },
      "*",
    );
  }, []);

  const syncHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const document = iframe.contentDocument;
      if (!document) return;
      const content = document.querySelector("main") ?? document.body;
      const nextHeight = Math.ceil(content.getBoundingClientRect().height) + 2;
      if (nextHeight > 0) {
        setHeight((current) => Math.abs(current - nextHeight) < 2 ? current : nextHeight);
      }
    } catch {
      // 非同源嵌入无法读取内容高度，保留配置中的回退高度。
    }
  }, []);

  const handleLoad = useCallback(() => {
    observerRef.current?.disconnect();
    syncHeight();

    try {
      const document = iframeRef.current?.contentDocument;
      const content = document?.querySelector("main") ?? document?.body;
      if (content) {
        observerRef.current = new ResizeObserver(syncHeight);
        observerRef.current.observe(content);
      }
    } catch {
      // 非同源嵌入使用回退高度。
    }
    requestHeight();
  }, [requestHeight, syncHeight]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "commodity-chart-height") return;
      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setHeight(Math.ceil(nextHeight));
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("resize", syncHeight);
    requestAnimationFrame(requestHeight);
    const retry = window.setTimeout(requestHeight, 250);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", syncHeight);
      observerRef.current?.disconnect();
    };
  }, [requestHeight, syncHeight]);

  return (
    <iframe
      ref={iframeRef}
      src={block.src}
      title={block.title}
      loading="lazy"
      scrolling="no"
      style={{ height }}
      onLoad={handleLoad}
    />
  );
}
