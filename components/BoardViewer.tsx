"use client";

import { ShapeSvg, getBBox, LIGHT } from "./Whiteboard";

/**
 * Fully static renderer for public share links (see app/share/[token]).
 * Deliberately non-interactive — no pan/zoom/selection/pointer handlers —
 * since this is meant to embed as a fixed visual (e.g. a Notion iframe),
 * not as a mini-editor. If interactivity is ever wanted here, that's a
 * new feature, not a bug in this component.
 */
export default function BoardViewer({ board }) {
  const els = board.elements || [];
  const noop = () => {};

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

  return (
    <div style={{ position: "fixed", inset: 0, background: board.canvasBg || "#FFFFFF" }}>
      <svg width="100%" height="100%" viewBox={`${minX} ${minY} ${w} ${h}`} style={{ display: "block" }}>
        <rect x={minX} y={minY} width={w} height={h} fill={board.canvasBg || "#FFFFFF"} />
        {els.map((el) => (
          <g key={el.id} opacity={el.opacity}>
            <ShapeSvg el={el} theme={LIGHT} isEmbedInteracting={false} hideLabel={false} onLabelDoubleClick={noop} />
          </g>
        ))}
      </svg>
    </div>
  );
}
