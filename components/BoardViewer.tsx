"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShapeSvg, getBBox, LIGHT } from "./Whiteboard";

/**
 * Renderer for public share links (see app/share/[token]).
 * Deliberately non-interactive in its default (static) mode — no
 * pan/zoom/selection/pointer handlers — since this is meant to embed as a
 * fixed visual (e.g. a Notion iframe), not as a mini-editor.
 *
 * When `dynamic` is true, pan/zoom navigation is added (mirroring the
 * pattern in Whiteboard.tsx), but still no selection, editing, or tools —
 * it's a read-only map you can navigate, not an editor.
 */
export default function BoardViewer({ board, dynamic = false }) {
  const els = board.elements || [];
  const noop = () => {};
  // Starts false so the client's first hydration render matches the
  // server-rendered HTML (no <canvas> there, so label text wrapping in
  // ShapeSvg/ShapeLabel falls back to a rough estimate) — flips true
  // post-mount so labels re-wrap using real canvas font metrics. See
  // wrapLabelLines in Whiteboard.tsx for why this must not just check
  // `typeof document` inline (document already exists client-side by the
  // very first hydration render, before this effect has run).
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => { setCanvasReady(true); }, []);

  if (els.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: board.canvasBg || "#FFFFFF", fontFamily: "'Inter', -apple-system, sans-serif", color: LIGHT.muted, fontSize: 14 }}>
        This board is empty.
      </div>
    );
  }

  const boxes = els.map(getBBox);
  const minX = Math.min(...boxes.map((b) => b.x)) - 40, minY = Math.min(...boxes.map((b) => b.y)) - 40;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 40, maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 40;
  const w = Math.max(50, maxX - minX), h = Math.max(50, maxY - minY);

  if (!dynamic) {
    return (
      <div style={{ position: "fixed", inset: 0, background: board.canvasBg || "#FFFFFF" }}>
        <svg width="100%" height="100%" viewBox={`${minX} ${minY} ${w} ${h}`} style={{ display: "block" }}>
          <rect x={minX} y={minY} width={w} height={h} fill={board.canvasBg || "#FFFFFF"} />
          {els.map((el) => (
            <g key={el.id} opacity={el.opacity}>
              <ShapeSvg el={el} theme={LIGHT} isEmbedInteracting={false} hideLabel={false} onLabelDoubleClick={noop} canvasReady={canvasReady} />
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return <DynamicBoardViewer board={board} els={els} contentBox={{ minX, minY, w, h }} />;
}

function DynamicBoardViewer({ board, els, contentBox }) {
  const noop = () => {};
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  // See the matching comment in BoardViewer above — this is a separate
  // component instance with its own mount/hydration lifecycle.
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => { setCanvasReady(true); }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const padding = 0.9;
    const fitZoom = Math.min(4, Math.max(0.1, Math.min((rect.width / contentBox.w) * padding, (rect.height / contentBox.h) * padding)));
    const contentCenterX = contentBox.minX + contentBox.w / 2;
    const contentCenterY = contentBox.minY + contentBox.h / 2;
    setZoom(fitZoom);
    setPan({ x: rect.width / 2 - contentCenterX * fitZoom, y: rect.height / 2 - contentCenterY * fitZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAtPoint = useCallback((screenX, screenY, nextZoomFn) => {
    setZoom((z) => {
      const nz = Math.min(4, Math.max(0.1, nextZoomFn(z)));
      setPan((p) => ({
        x: screenX - ((screenX - p.x) / z) * nz,
        y: screenY - ((screenY - p.y) / z) * nz,
      }));
      return nz;
    });
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = node.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        zoomAtPoint(cx, cy, (z) => z * (1 - e.deltaY * 0.002));
      } else if (e.shiftKey) {
        setPan((p) => ({ x: p.x - e.deltaY, y: p.y }));
      } else if (e.altKey) {
        setPan((p) => ({ x: p.x, y: p.y - e.deltaY }));
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

  const onPointerDown = useCallback((e) => {
    dragRef.current = { startClientX: e.clientX, startClientY: e.clientY, panStartX: pan.x, panStartY: pan.y };
    setDragging(true);
  }, [pan]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      setPan({ x: drag.panStartX + (e.clientX - drag.startClientX), y: drag.panStartY + (e.clientY - drag.startClientY) });
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, background: board.canvasBg || "#FFFFFF", overflow: "hidden", userSelect: "none" }}>
      <svg
        width="100%"
        height="100%"
        style={{ display: "block", cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
      >
        <rect x="0" y="0" width="100%" height="100%" fill={board.canvasBg || "#FFFFFF"} />
        <g id="content-layer" transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {els.map((el) => (
            <g key={el.id} opacity={el.opacity}>
              <ShapeSvg el={el} theme={LIGHT} isEmbedInteracting={false} hideLabel={false} onLabelDoubleClick={noop} canvasReady={canvasReady} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
