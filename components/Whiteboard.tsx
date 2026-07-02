"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MousePointer2,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Copy,
  Image as ImageIcon,
  Link2,
  Globe,
  Save,
  Upload,
  ChevronDown,
  Plus,
  Pencil as PencilIcon,
  Sun,
  Moon,
  Home,
} from "lucide-react";

/* ---------------------------------------------------------------
   Theme
----------------------------------------------------------------*/
const LIGHT = {
  appBg: "#F6F6F3",
  panelBg: "rgba(255,255,255,0.94)",
  panelBorder: "#E6E6E1",
  ink: "#232326",
  muted: "#9A9AA2",
  hover: "#F0F0EE",
  hud: "#B9B9B4",
  shadow: "0 8px 24px rgba(30,30,32,0.08)",
};
const DARK = {
  appBg: "#1B1B1D",
  panelBg: "rgba(32,32,35,0.92)",
  panelBorder: "#3A3A3E",
  ink: "#EDEDEC",
  muted: "#8F8F96",
  hover: "#2B2B2F",
  hud: "#5C5C61",
  shadow: "0 8px 24px rgba(0,0,0,0.35)",
};

const CANVAS_BACKGROUNDS = [
  { name: "Paper", value: "#FFFFFF", dot: "#E4E4E0" },
  { name: "Ivory", value: "#FBF8F2", dot: "#E9E2D3" },
  { name: "Mist", value: "#F3F6F5", dot: "#DCE4E2" },
  { name: "Sky", value: "#F1F5FB", dot: "#DCE5F1" },
  { name: "Slate", value: "#20232B", dot: "#343945" },
  { name: "Ink", value: "#121214", dot: "#2A2A2D" },
];

const STROKE_COLORS = [
  { name: "Graphite", value: "#232326" },
  { name: "Indigo", value: "#4C5FF7" },
  { name: "Teal", value: "#12A594" },
  { name: "Amber", value: "#DB8B1E" },
  { name: "Rose", value: "#E5484D" },
  { name: "Paper", value: "#F6F6F3" },
];

const FILL_COLORS = [
  { name: "None", value: "transparent" },
  { name: "Indigo", value: "#EEF1FF" },
  { name: "Teal", value: "#E7F8F5" },
  { name: "Amber", value: "#FDF3E3" },
  { name: "Rose", value: "#FCEAEA" },
];

const STROKE_WIDTHS = [
  { label: "S", value: 1.5 },
  { label: "M", value: 2.5 },
  { label: "L", value: 4 },
];

const FONT_SIZES = [
  { label: "S", value: 16 },
  { label: "M", value: 20 },
  { label: "L", value: 28 },
  { label: "XL", value: 36 },
];

const ROUGHNESS = [
  { label: "Architect", value: "architect", amp: 0.5, passes: 1 },
  { label: "Artist", value: "artist", amp: 1.7, passes: 2 },
  { label: "Cartoonist", value: "cartoonist", amp: 3.4, passes: 2 },
];

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select", key: "1" },
  { id: "rectangle", icon: Square, label: "Rectangle", key: "2" },
  { id: "diamond", icon: Diamond, label: "Diamond", key: "3" },
  { id: "ellipse", icon: Circle, label: "Ellipse", key: "4" },
  { id: "arrow", icon: ArrowRight, label: "Arrow", key: "5" },
  { id: "line", icon: Minus, label: "Line", key: "6" },
  { id: "freehand", icon: Pencil, label: "Draw", key: "7" },
  { id: "text", icon: Type, label: "Text", key: "8" },
  { id: "eraser", icon: Eraser, label: "Eraser", key: "9" },
];

const FILL_TYPES = ["rectangle", "diamond", "ellipse"];
const WEIGHT_TYPES = ["rectangle", "diamond", "ellipse", "line", "arrow", "freehand"];
const SKETCH_TYPES = ["rectangle", "diamond", "ellipse", "line", "arrow"];
const STROKELESS_TYPES = ["image", "embed"];
const BOX_TYPES = ["rectangle", "diamond", "ellipse", "text", "image", "embed", "link"];
const LABELABLE_TYPES = ["rectangle", "diamond", "ellipse"];
const EDGE_TYPES = ["rectangle", "diamond"];
const EDGES = [{ label: "Sharp", value: "sharp" }, { label: "Round", value: "round" }];

/* ---------------------------------------------------------------
   Geometry / sketch helpers
----------------------------------------------------------------*/
let idCounter = 0;
const genId = () => `el_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function roughnessInfo(key) {
  return ROUGHNESS.find((r) => r.value === key) || ROUGHNESS[1];
}
function jitteredSegment(x1, y1, x2, y2, rand, amp) {
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * amp * 2;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * amp * 2;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${mx.toFixed(2)} ${my.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
function sketchyPath(points, seed, roughnessKey, closed) {
  const { amp, passes } = roughnessInfo(roughnessKey);
  const rand = seededRandom(seed || 1);
  const pts = closed ? [...points, points[0]] : points;
  let d = "";
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      d += jitteredSegment(x1, y1, x2, y2, rand, amp) + " ";
    }
  }
  return d;
}
function cornerCuts(points, radius) {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const toPrev = [prev[0] - p[0], prev[1] - p[1]];
    const toNext = [next[0] - p[0], next[1] - p[1]];
    const lenPrev = Math.hypot(toPrev[0], toPrev[1]) || 1;
    const lenNext = Math.hypot(toNext[0], toNext[1]) || 1;
    const r = Math.min(radius, lenPrev / 2, lenNext / 2);
    return {
      p,
      a: [p[0] + (toPrev[0] / lenPrev) * r, p[1] + (toPrev[1] / lenPrev) * r],
      b: [p[0] + (toNext[0] / lenNext) * r, p[1] + (toNext[1] / lenNext) * r],
    };
  });
}
function sketchyRoundedPath(points, seed, roughnessKey, radius) {
  const { amp, passes } = roughnessInfo(roughnessKey);
  const rand = seededRandom(seed || 1);
  const n = points.length;
  const corners = cornerCuts(points, radius);
  let d = "";
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < n; i++) {
      const from = corners[i];
      const to = corners[(i + 1) % n];
      d += jitteredSegment(from.b[0], from.b[1], to.a[0], to.a[1], rand, amp) + " ";
      d += `M ${to.a[0].toFixed(2)} ${to.a[1].toFixed(2)} Q ${to.p[0].toFixed(2)} ${to.p[1].toFixed(2)} ${to.b[0].toFixed(2)} ${to.b[1].toFixed(2)} `;
    }
  }
  return d;
}
function roundedPolygonPath(points, radius) {
  const n = points.length;
  const corners = cornerCuts(points, radius);
  let d = `M ${corners[0].b[0].toFixed(2)} ${corners[0].b[1].toFixed(2)} `;
  for (let i = 1; i <= n; i++) {
    const c = corners[i % n];
    d += `L ${c.a[0].toFixed(2)} ${c.a[1].toFixed(2)} Q ${c.p[0].toFixed(2)} ${c.p[1].toFixed(2)} ${c.b[0].toFixed(2)} ${c.b[1].toFixed(2)} `;
  }
  return d + "Z";
}
function ellipsePoints(cx, cy, rx, ry, segments = 20) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}
function smoothFreehandPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} `;
  for (let i = 1; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    d += `Q ${x1.toFixed(2)} ${y1.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)} `;
  }
  const last = points[points.length - 1];
  d += `L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
  return d;
}
function getBBox(el) {
  if (el.type === "text") return { x: el.x, y: el.y, w: el.width || 40, h: el.height || 30 };
  if (BOX_TYPES.includes(el.type)) return { x: el.x, y: el.y, w: el.w || 40, h: el.h || 30 };
  if (el.type === "line" || el.type === "arrow" || el.type === "freehand") {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}
function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function hitTestPoint(el, x, y, threshold) {
  if (el.type === "text") {
    const pad = threshold, w = el.width || 40, h = el.height || 30;
    return x >= el.x - pad && x <= el.x + w + pad && y >= el.y - pad && y <= el.y + h + pad;
  }
  if (BOX_TYPES.includes(el.type)) {
    const pad = threshold;
    return x >= el.x - pad && x <= el.x + el.w + pad && y >= el.y - pad && y <= el.y + el.h + pad;
  }
  if (el.type === "line" || el.type === "arrow") {
    const [p1, p2] = el.points;
    return distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= threshold;
  }
  if (el.type === "freehand") {
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = el.points[i], p2 = el.points[i + 1];
      if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= threshold) return true;
    }
    return el.points.length === 1 && Math.hypot(x - el.points[0].x, y - el.points[0].y) <= threshold;
  }
  return false;
}
function measureText(text, fontSize) {
  const lines = text.split("\n");
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { width: Math.max(30, longest * fontSize * 0.56), height: Math.max(fontSize * 1.35, lines.length * fontSize * 1.35) };
}
function createShapeElement(type, x, y, style) {
  const base = { id: genId(), type, stroke: style.stroke, fill: style.fill, strokeWidth: style.strokeWidth, roughness: style.roughness, opacity: style.opacity, seed: Math.floor(Math.random() * 100000) + 1 };
  if (type === "rectangle" || type === "diamond" || type === "ellipse") return { ...base, x, y, w: 0, h: 0, edges: style.edges };
  if (type === "line" || type === "arrow") return { ...base, points: [{ x, y }, { x, y }] };
  if (type === "freehand") return { ...base, points: [{ x, y }] };
  return base;
}
function downscaleImageFile(file) {
  return new Promise<{ blob: Blob; width: number; height: number; mime: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const keepPng = file.type === "image/png" || file.type === "image/svg+xml";
        const mime = keepPng ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Could not process image")); return; }
            resolve({ blob, width: canvas.width, height: canvas.height, mime });
          },
          mime,
          keepPng ? undefined : 0.86
        );
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------
   Shape renderer
----------------------------------------------------------------*/
function ShapeLabel({ el, hidden }) {
  if (!el.label || hidden) return null;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const fontSize = el.labelFontSize || 16;
  const lines = el.label.split("\n");
  const lineHeight = fontSize * 1.3;
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={cx} y={startY} textAnchor="middle" dominantBaseline="middle" fontFamily="'Kalam', cursive" fontSize={fontSize} fill={el.stroke} style={{ userSelect: "none" }}>
      {lines.map((line, i) => (
        <tspan key={i} x={cx} y={startY + i * lineHeight}>{line || " "}</tspan>
      ))}
    </text>
  );
}
function ShapeSvg({ el, theme, isEmbedInteracting, hideLabel }) {
  const { type, seed, roughness } = el;
  if (type === "rectangle") {
    const pts = [[el.x, el.y], [el.x + el.w, el.y], [el.x + el.w, el.y + el.h], [el.x, el.y + el.h]];
    const radius = el.edges === "round" ? Math.min(28, Math.min(el.w, el.h) * 0.16) : 0;
    const d = radius > 0 ? sketchyRoundedPath(pts, seed, roughness, radius) : sketchyPath(pts, seed, roughness, true);
    return (
      <>
        {el.fill !== "transparent" && (
          radius > 0
            ? <path d={roundedPolygonPath(pts, radius)} fill={el.fill} stroke="none" />
            : <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={el.fill} stroke="none" />
        )}
        <path d={d} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <ShapeLabel el={el} hidden={hideLabel} />
      </>
    );
  }
  if (type === "diamond") {
    const pts = [[el.x + el.w / 2, el.y], [el.x + el.w, el.y + el.h / 2], [el.x + el.w / 2, el.y + el.h], [el.x, el.y + el.h / 2]];
    const radius = el.edges === "round" ? Math.min(22, Math.min(el.w, el.h) * 0.14) : 0;
    const d = radius > 0 ? sketchyRoundedPath(pts, seed, roughness, radius) : sketchyPath(pts, seed, roughness, true);
    return (
      <>
        {el.fill !== "transparent" && (
          radius > 0
            ? <path d={roundedPolygonPath(pts, radius)} fill={el.fill} stroke="none" />
            : <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={el.fill} stroke="none" />
        )}
        <path d={d} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <ShapeLabel el={el} hidden={hideLabel} />
      </>
    );
  }
  if (type === "ellipse") {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const pts = ellipsePoints(cx, cy, Math.max(el.w / 2, 0.1), Math.max(el.h / 2, 0.1));
    const d = sketchyPath(pts, seed, roughness, true);
    return (
      <>
        {el.fill !== "transparent" && <ellipse cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2} fill={el.fill} stroke="none" />}
        <path d={d} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <ShapeLabel el={el} hidden={hideLabel} />
      </>
    );
  }
  if (type === "line" || type === "arrow") {
    const [p1, p2] = el.points;
    const d = sketchyPath([[p1.x, p1.y], [p2.x, p2.y]], seed, roughness, false);
    let head = null;
    if (type === "arrow") {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const len = 14 + el.strokeWidth * 2;
      const a1 = angle + Math.PI - 0.4, a2 = angle + Math.PI + 0.4;
      const h1 = [p2.x + len * Math.cos(a1), p2.y + len * Math.sin(a1)];
      const h2 = [p2.x + len * Math.cos(a2), p2.y + len * Math.sin(a2)];
      const hd = sketchyPath([[p2.x, p2.y], h1], seed + 1, roughness, false) + " " + sketchyPath([[p2.x, p2.y], h2], seed + 2, roughness, false);
      head = <path d={hd} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" />;
    }
    return (
      <>
        <path d={d} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        {head}
      </>
    );
  }
  if (type === "freehand") {
    const d = smoothFreehandPath(el.points.map((p) => [p.x, p.y]));
    return <path d={d} fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (type === "text") {
    const lines = el.text.split("\n");
    return (
      <text x={el.x} y={el.y + el.fontSize} fontFamily="'Kalam', cursive" fontSize={el.fontSize} fill={el.stroke} style={{ userSelect: "none" }}>
        {lines.map((line, i) => (
          <tspan key={i} x={el.x} dy={i === 0 ? 0 : el.fontSize * 1.35}>{line || " "}</tspan>
        ))}
      </text>
    );
  }
  if (type === "image") {
    return <image href={el.src} x={el.x} y={el.y} width={el.w} height={el.h} preserveAspectRatio="xMidYMid slice" />;
  }
  if (type === "embed") {
    return (
      <foreignObject x={el.x} y={el.y} width={el.w} height={el.h}>
        <div
          style={{ width: "100%", height: "100%", border: `1px solid ${isEmbedInteracting ? "#4C5FF7" : theme.panelBorder}`, borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: isEmbedInteracting ? "0 0 0 3px rgba(76,95,247,0.18)" : "none" }}
        >
          <iframe src={el.url} title="embed" style={{ width: "100%", height: "100%", border: "none", pointerEvents: isEmbedInteracting ? "auto" : "none" }} />
        </div>
      </foreignObject>
    );
  }
  if (type === "link") {
    const cx = el.x + 14, cy = el.y + el.h / 2;
    return (
      <g>
        <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={12} fill={el.fill || "#EEF1FF"} stroke={el.stroke} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={4} fill="none" stroke={el.stroke} strokeWidth={1.5} />
        <circle cx={cx + 8} cy={cy} r={4} fill="none" stroke={el.stroke} strokeWidth={1.5} />
        <text x={el.x + 32} y={cy + 5} fontFamily="'Inter', sans-serif" fontSize={13} fontWeight={600} fill={el.stroke}>{el.label}</text>
      </g>
    );
  }
  return null;
}

/* ---------------------------------------------------------------
   Main component
----------------------------------------------------------------*/
export default function Whiteboard({ board, boardList }) {
  const router = useRouter();
  const boardId = board.id;

  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? DARK : LIGHT;

  const [projects, setProjects] = useState(boardList);
  const [boardName, setBoardName] = useState(board.name);
  const [projectsPanelOpen, setProjectsPanelOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);

  const [elements, setElements] = useState(board.elements || []);
  const [canvasBg, setCanvasBg] = useState(board.canvasBg || CANVAS_BACKGROUNDS[0].value);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tool, setTool] = useState("select");
  const [style, setStyle] = useState({ stroke: STROKE_COLORS[0].value, fill: FILL_COLORS[0].value, strokeWidth: STROKE_WIDTHS[1].value, roughness: "artist", opacity: 1, fontSize: 20, edges: "sharp" });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [marquee, setMarquee] = useState(null);
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [linkDraft, setLinkDraft] = useState(null);
  const [embedDraft, setEmbedDraft] = useState(null);
  const [embedUrlInput, setEmbedUrlInput] = useState("");
  const [interactingEmbedId, setInteractingEmbedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // idle | saving | saved | error
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const elementsRef = useRef(elements);
  const canvasBgRef = useRef(canvasBg);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const styleRef = useRef(style);
  const toolRef = useRef(tool);
  const selectedIdsRef = useRef(selectedIds);
  const snapshotRef = useRef(null);
  const spaceHeldRef = useRef(false);
  const textareaRef = useRef(null);
  const labelTextareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { canvasBgRef.current = canvasBg; }, [canvasBg]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { styleRef.current = style; }, [style]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("board-theme") : null;
    if (saved === "dark") setIsDark(true);
  }, []);

  useEffect(() => {
    if (editingText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingText?.id]);

  useEffect(() => {
    if (editingLabel && labelTextareaRef.current) {
      labelTextareaRef.current.focus();
      labelTextareaRef.current.select();
    }
  }, [editingLabel?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- persistence ---------- */
  const saveNow = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: elementsRef.current, canvasBg: canvasBgRef.current }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveStatus("saved");
      setProjects((prev) => prev.map((p) => (p.id === boardId ? { ...p, updatedAt: new Date().toISOString() } : p)));
    } catch (e) {
      setSaveStatus("error");
      setToast("Couldn't save — check your connection");
    }
  }, [boardId]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setSaveStatus("idle");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveNow, 700);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, canvasBg]);

  /* ---------- project (board) actions ---------- */
  const goToBoard = useCallback(
    async (id) => {
      if (id === boardId) return;
      clearTimeout(saveTimerRef.current);
      await saveNow();
      router.push(`/board/${id}`);
    },
    [boardId, router, saveNow]
  );

  const addProject = useCallback(
    async (name = "") => {
      clearTimeout(saveTimerRef.current);
      await saveNow();
      try {
        const res = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name || "Untitled board" }),
        });
        const data = await res.json();
        if (data.board) {
          router.push(`/board/${data.board.id}`);
          return data.board;
        }
      } catch (e) {
        setToast("Could not create a new board");
      }
      return null;
    },
    [router, saveNow]
  );

  const renameProject = useCallback(
    async (id, name) => {
      const finalName = name || "Untitled board";
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: finalName } : p)));
      if (id === boardId) setBoardName(finalName);
      try {
        await fetch(`/api/boards/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: finalName }),
        });
      } catch (e) {
        setToast("Rename didn't save");
      }
    },
    [boardId]
  );

  const deleteProject = useCallback(
    async (id) => {
      try {
        await fetch(`/api/boards/${id}`, { method: "DELETE" });
      } catch (e) {
        setToast("Could not delete that board");
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (id === boardId) router.push("/");
    },
    [boardId, router]
  );

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/boards");
      const data = await res.json();
      if (data.boards) setProjects(data.boards);
    } catch (e) {
      /* keep stale list */
    }
  }, []);

  /* ---------- history ---------- */
  const beginChange = useCallback(() => { snapshotRef.current = JSON.parse(JSON.stringify(elementsRef.current)); }, []);
  const endChange = useCallback(() => {
    if (snapshotRef.current !== null) {
      setPast((p) => [...p.slice(-49), snapshotRef.current]);
      setFuture([]);
      snapshotRef.current = null;
    }
  }, []);
  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [elementsRef.current, ...f]);
      setElements(prev);
      setSelectedIds([]);
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, elementsRef.current]);
      setElements(next);
      setSelectedIds([]);
      return f.slice(1);
    });
  }, []);

  /* ---------- coordinate transforms ---------- */
  const screenToWorld = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left - panRef.current.x) / zoomRef.current, y: (clientY - rect.top - panRef.current.y) / zoomRef.current };
  }, []);

  /* ---------- element mutation helpers ---------- */
  const updateSelectedStyle = useCallback(
    (patch) => {
      setStyle((s) => ({ ...s, ...patch }));
      if (selectedIdsRef.current.length > 0) {
        beginChange();
        setElements((prev) => prev.map((el) => (selectedIdsRef.current.includes(el.id) ? { ...el, ...patch } : el)));
        endChange();
      }
    },
    [beginChange, endChange]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIdsRef.current.length === 0) return;
    beginChange();
    setElements((prev) => prev.filter((el) => !selectedIdsRef.current.includes(el.id)));
    setSelectedIds([]);
    endChange();
  }, [beginChange, endChange]);

  const duplicateSelected = useCallback(() => {
    if (selectedIdsRef.current.length === 0) return;
    beginChange();
    const offset = 16;
    const dupes = elementsRef.current
      .filter((el) => selectedIdsRef.current.includes(el.id))
      .map((el) => {
        const clone = { ...el, id: genId() };
        if (clone.points) clone.points = clone.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
        if (clone.x !== undefined) { clone.x += offset; clone.y += offset; }
        return clone;
      });
    setElements((prev) => [...prev, ...dupes]);
    setSelectedIds(dupes.map((d) => d.id));
    endChange();
  }, [beginChange, endChange]);

  const clearCanvas = useCallback(() => {
    if (elementsRef.current.length === 0) return;
    beginChange();
    setElements([]);
    setSelectedIds([]);
    endChange();
  }, [beginChange, endChange]);

  /* ---------- pointer interaction ---------- */
  const dragRef = useRef(null);

  const finishTextEdit = useCallback(
    (commit) => {
      setEditingText((draft) => {
        if (!draft) return null;
        if (commit && draft.text.trim() !== "") {
          const { width, height } = measureText(draft.text, draft.fontSize);
          beginChange();
          if (draft.isNew) {
            setElements((prev) => [...prev, { id: draft.id, type: "text", x: draft.x, y: draft.y, text: draft.text, fontSize: draft.fontSize, stroke: draft.stroke, opacity: draft.opacity, width, height }]);
          } else {
            setElements((prev) => prev.map((el) => (el.id === draft.id ? { ...el, text: draft.text, width, height } : el)));
          }
          endChange();
        }
        return null;
      });
      setTool((t) => (t === "text" ? "select" : t));
    },
    [beginChange, endChange]
  );

  const startTextAt = useCallback((x, y, existing) => {
    if (existing) {
      setEditingText({ id: existing.id, x: existing.x, y: existing.y, text: existing.text, fontSize: existing.fontSize, stroke: existing.stroke, opacity: existing.opacity, isNew: false });
    } else {
      setEditingText({ id: genId(), x, y, text: "", fontSize: styleRef.current.fontSize, stroke: styleRef.current.stroke, opacity: styleRef.current.opacity, isNew: true });
    }
  }, []);

  const finishLabelEdit = useCallback(
    (commit) => {
      setEditingLabel((draft) => {
        if (!draft) return null;
        if (commit) {
          const text = draft.text.trim();
          beginChange();
          setElements((prev) =>
            prev.map((el) => {
              if (el.id !== draft.id) return el;
              if (text === "") return { ...el, label: undefined };
              const b = getBBox(el);
              const labelFontSize = Math.max(12, Math.min(28, Math.min(b.w, b.h) * 0.22));
              return { ...el, label: text, labelFontSize };
            })
          );
          endChange();
        }
        return null;
      });
    },
    [beginChange, endChange]
  );

  const startLabelEdit = useCallback((el) => {
    const b = getBBox(el);
    setEditingLabel({ id: el.id, x: b.x, y: b.y, w: b.w, h: b.h, text: el.label || "", fontSize: el.labelFontSize || 16, stroke: el.stroke });
  }, []);

  const onWindowPointerMove = useCallback(
    (e) => {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setCursorWorld({ x: Math.round(x), y: Math.round(y) });
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === "pan") {
        setPan({ x: drag.panStartX + (e.clientX - drag.startClientX), y: drag.panStartY + (e.clientY - drag.startClientY) });
        return;
      }
      if (drag.mode === "shape-draw") {
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.id) return el;
            if (el.type === "rectangle" || el.type === "diamond" || el.type === "ellipse") {
              return { ...el, x: Math.min(drag.startX, x), y: Math.min(drag.startY, y), w: Math.abs(x - drag.startX), h: Math.abs(y - drag.startY) };
            }
            if (el.type === "line" || el.type === "arrow") return { ...el, points: [el.points[0], { x, y }] };
            return el;
          })
        );
        return;
      }
      if (drag.mode === "freehand-draw") {
        setElements((prev) => prev.map((el) => (el.id === drag.id ? { ...el, points: [...el.points, { x, y }] } : el)));
        return;
      }
      if (drag.mode === "move") {
        const dx = x - drag.startX, dy = y - drag.startY;
        setElements((prev) =>
          prev.map((el) => {
            const orig = drag.origins[el.id];
            if (!orig) return el;
            if (orig.points) return { ...el, points: orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
            return { ...el, x: orig.x + dx, y: orig.y + dy };
          })
        );
        return;
      }
      if (drag.mode === "resize") {
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.id) return el;
            if (el.type === "line" || el.type === "arrow") {
              const pts = [...drag.originPoints];
              pts[drag.handle] = { x, y };
              return { ...el, points: pts };
            }
            const o = drag.origin;
            let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
            const h = drag.handle;
            if (h.includes("e")) nw = Math.max(4, x - o.x);
            if (h.includes("s")) nh = Math.max(4, y - o.y);
            if (h.includes("w")) { nw = Math.max(4, o.x + o.w - x); nx = o.x + o.w - nw; }
            if (h.includes("n")) { nh = Math.max(4, o.y + o.h - y); ny = o.y + o.h - nh; }
            return { ...el, x: nx, y: ny, w: nw, h: nh };
          })
        );
        return;
      }
      if (drag.mode === "marquee") {
        const rect = { x: Math.min(drag.startX, x), y: Math.min(drag.startY, y), w: Math.abs(x - drag.startX), h: Math.abs(y - drag.startY) };
        setMarquee(rect);
        const hits = elementsRef.current.filter((el) => rectsIntersect(getBBox(el), rect)).map((el) => el.id);
        setSelectedIds(hits);
        return;
      }
      if (drag.mode === "erase") {
        setElements((prev) => prev.filter((el) => !hitTestPoint(el, x, y, 8 / zoomRef.current)));
        return;
      }
    },
    [screenToWorld]
  );

  const onWindowPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.mode === "shape-draw") {
        const el = elementsRef.current.find((e) => e.id === drag.id);
        const bbox = el ? getBBox(el) : null;
        if (bbox && bbox.w < 3 && bbox.h < 3) {
          setElements((prev) => prev.filter((e) => e.id !== drag.id));
          snapshotRef.current = null;
        } else {
          endChange();
          setSelectedIds([drag.id]);
        }
        setTool("select");
      } else if (drag.mode === "freehand-draw") {
        const el = elementsRef.current.find((e) => e.id === drag.id);
        if (el && el.points.length < 2) {
          setElements((prev) => prev.filter((e) => e.id !== drag.id));
          snapshotRef.current = null;
        } else {
          endChange();
          setSelectedIds([drag.id]);
        }
        setTool("select");
      } else if (drag.mode === "move" || drag.mode === "resize" || drag.mode === "erase") {
        endChange();
      } else if (drag.mode === "marquee") {
        setMarquee(null);
      }
    }
    dragRef.current = null;
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
  }, [endChange, onWindowPointerMove]);

  const beginDrag = useCallback(
    (info) => {
      dragRef.current = info;
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);
    },
    [onWindowPointerMove, onWindowPointerUp]
  );

  const handleCanvasPointerDown = useCallback(
    (e) => {
      if (editingText) finishTextEdit(true);
      if (editingLabel) finishLabelEdit(true);
      if (linkDraft) setLinkDraft(null);
      if (embedDraft) setEmbedDraft(null);
      if (interactingEmbedId) setInteractingEmbedId(null);
      if (projectsPanelOpen) setProjectsPanelOpen(false);

      if (e.button === 1 || spaceHeldRef.current) {
        beginDrag({ mode: "pan", panStartX: panRef.current.x, panStartY: panRef.current.y, startClientX: e.clientX, startClientY: e.clientY });
        return;
      }
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const t = toolRef.current;

      if (t === "select") {
        if (!e.shiftKey) setSelectedIds([]);
        beginDrag({ mode: "marquee", startX: x, startY: y });
        return;
      }
      if (t === "text") { startTextAt(x, y, null); return; }
      if (t === "link") { setLinkDraft({ x, y, w: 190, h: 52 }); setTool("select"); refreshProjects(); return; }
      if (t === "embed") { setEmbedDraft({ x, y, w: 420, h: 300 }); setEmbedUrlInput(""); setTool("select"); return; }
      if (t === "eraser") {
        beginChange();
        setElements((prev) => prev.filter((el) => !hitTestPoint(el, x, y, 8 / zoomRef.current)));
        beginDrag({ mode: "erase" });
        return;
      }
      if (t === "freehand") {
        const el = createShapeElement("freehand", x, y, styleRef.current);
        beginChange();
        setElements((prev) => [...prev, el]);
        beginDrag({ mode: "freehand-draw", id: el.id });
        return;
      }
      const el = createShapeElement(t, x, y, styleRef.current);
      beginChange();
      setElements((prev) => [...prev, el]);
      beginDrag({ mode: "shape-draw", id: el.id, startX: x, startY: y });
    },
    [beginChange, beginDrag, editingLabel, editingText, embedDraft, finishLabelEdit, finishTextEdit, interactingEmbedId, linkDraft, projectsPanelOpen, refreshProjects, screenToWorld, startTextAt]
  );

  const handleShapePointerDown = useCallback(
    (e, el) => {
      if (toolRef.current !== "select") return;
      e.stopPropagation();
      if (editingText) finishTextEdit(true);
      if (editingLabel) finishLabelEdit(true);

      if (LABELABLE_TYPES.includes(el.type) && e.detail === 2) { startLabelEdit(el); return; }
      if (el.type === "text" && e.detail === 2) { startTextAt(el.x, el.y, el); return; }
      if (el.type === "link" && e.detail === 2) {
        if (el.targetId === boardId) return;
        goToBoard(el.targetId);
        return;
      }
      if (el.type === "embed" && e.detail === 2) { setInteractingEmbedId(el.id); return; }

      let nextSelected = selectedIdsRef.current;
      if (e.shiftKey) {
        nextSelected = nextSelected.includes(el.id) ? nextSelected.filter((id) => id !== el.id) : [...nextSelected, el.id];
      } else if (!nextSelected.includes(el.id)) {
        nextSelected = [el.id];
      }
      setSelectedIds(nextSelected);

      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const origins = {};
      elementsRef.current.forEach((it) => {
        if (nextSelected.includes(it.id)) origins[it.id] = it.points ? { points: it.points.map((p) => ({ ...p })) } : { x: it.x, y: it.y };
      });
      beginChange();
      beginDrag({ mode: "move", startX: x, startY: y, origins });
    },
    [beginChange, beginDrag, boardId, editingLabel, editingText, finishLabelEdit, finishTextEdit, goToBoard, screenToWorld, startLabelEdit, startTextAt]
  );

  const handleResizePointerDown = useCallback(
    (e, el, handle) => {
      e.stopPropagation();
      beginChange();
      if (el.type === "line" || el.type === "arrow") {
        beginDrag({ mode: "resize", id: el.id, handle, originPoints: el.points.map((p) => ({ ...p })) });
      } else {
        beginDrag({ mode: "resize", id: el.id, handle, origin: { x: el.x, y: el.y, w: el.w, h: el.h } });
      }
    },
    [beginChange, beginDrag]
  );

  /* ---------- wheel: pan / zoom ---------- */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = svgRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        setZoom((z) => {
          const nz = Math.min(4, Math.max(0.1, z * (1 - e.deltaY * 0.002)));
          setPan((p) => ({ x: cx - ((cx - p.x) / z) * nz, y: cy - ((cy - p.y) / z) * nz }));
          return nz;
        });
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      const typing = activeTag === "TEXTAREA" || activeTag === "INPUT";
      if (e.code === "Space" && !typing) spaceHeldRef.current = true;
      if (typing) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
      if (meta && e.key.toLowerCase() === "a") { e.preventDefault(); setSelectedIds(elementsRef.current.map((el) => el.id)); return; }
      if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); return; }
      if (e.key === "Escape") {
        setSelectedIds([]); setTool("select"); setLinkDraft(null); setEmbedDraft(null); setInteractingEmbedId(null); setProjectsPanelOpen(false);
        return;
      }
      const found = TOOLS.find((t) => t.key === e.key);
      if (found) setTool(found.id);
    };
    const onKeyUp = (e) => { if (e.code === "Space") spaceHeldRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [undo, redo, duplicateSelected, deleteSelected, saveNow]);

  /* ---------- save-before-unload ---------- */
  useEffect(() => {
    const onBeforeUnload = () => { saveNow(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveNow]);

  /* ---------- image insert ---------- */
  const handleImageFileChosen = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setToast("Uploading image…");
      try {
        const { blob, width, height, mime } = await downscaleImageFile(file);
        const form = new FormData();
        form.append("file", blob, `image.${mime === "image/png" ? "png" : "jpg"}`);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
        const rect = containerRef.current.getBoundingClientRect();
        const wx = (rect.width / 2 - panRef.current.x) / zoomRef.current;
        const wy = (rect.height / 2 - panRef.current.y) / zoomRef.current;
        const w = Math.min(400, width);
        const h = w * (height / width);
        const newEl = { id: genId(), type: "image", x: wx - w / 2, y: wy - h / 2, w, h, src: data.url, opacity: 1 };
        beginChange();
        setElements((prev) => [...prev, newEl]);
        endChange();
        setSelectedIds([newEl.id]);
        setTool("select");
        setToast(null);
      } catch (err: any) {
        setToast(err.message || "Could not upload that image");
      }
    },
    [beginChange, endChange]
  );

  /* ---------- embed insert ---------- */
  const insertEmbed = useCallback(() => {
    if (!embedDraft) return;
    if (!embedUrlInput.trim()) { setEmbedDraft(null); return; }
    let url = embedUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    beginChange();
    setElements((prev) => [...prev, { id: genId(), type: "embed", x: embedDraft.x, y: embedDraft.y, w: embedDraft.w, h: embedDraft.h, url, opacity: 1 }]);
    endChange();
    setEmbedDraft(null);
  }, [beginChange, endChange, embedDraft, embedUrlInput]);

  /* ---------- JSON export / import ---------- */
  const exportJSON = useCallback(() => {
    const payload = { version: 1, name: boardName, elements: elementsRef.current, canvasBg: canvasBgRef.current };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${boardName.replace(/[^a-z0-9-_ ]/gi, "").trim() || "board"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [boardName]);

  const handleJSONFileChosen = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.elements)) throw new Error("bad format");
        const created = await addProject(parsed.name || file.name.replace(/\.json$/i, ""));
        if (created) {
          await fetch(`/api/boards/${created.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ elements: parsed.elements, canvasBg: parsed.canvasBg || CANVAS_BACKGROUNDS[0].value }),
          });
        }
      } catch (err) {
        setToast("That file couldn't be imported");
      }
    },
    [addProject]
  );

  /* ---------- PNG export ---------- */
  const exportPNG = useCallback(() => {
    try {
      const els = elementsRef.current;
      if (els.length === 0) { setToast("Nothing to export yet"); return; }
      const boxes = els.map(getBBox);
      const minX = Math.min(...boxes.map((b) => b.x)) - 40, minY = Math.min(...boxes.map((b) => b.y)) - 40;
      const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 40, maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 40;
      const w = Math.max(50, maxX - minX), h = Math.max(50, maxY - minY);

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("xmlns", svgNS);
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
      const bg = document.createElementNS(svgNS, "rect");
      bg.setAttribute("x", String(minX)); bg.setAttribute("y", String(minY)); bg.setAttribute("width", String(w)); bg.setAttribute("height", String(h)); bg.setAttribute("fill", canvasBgRef.current);
      svg.appendChild(bg);

      const contentGroup = svgRef.current.querySelector("#content-layer");
      if (contentGroup) {
        const clone = contentGroup.cloneNode(true);
        clone.querySelectorAll("iframe").forEach((f) => f.remove());
        svg.appendChild(clone);
      }

      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = w * scale; canvas.height = h * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = canvasBgRef.current;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = dataUrl; a.download = "board.png"; a.click();
        } catch (err) { setToast("Export failed — try again"); }
      };
      img.onerror = () => setToast("Export failed — try again");
      img.src = url;
    } catch (err) {
      setToast("Export failed — try again");
    }
  }, []);

  /* ---------- derived ---------- */
  const selectedElements = useMemo(() => elements.filter((el) => selectedIds.includes(el.id)), [elements, selectedIds]);
  const effectiveType = useMemo<string | null>(() => {
    if (selectedElements.length > 0) {
      const types = new Set(selectedElements.map((e) => e.type));
      return (types.size === 1 ? [...types][0] : "mixed") as string;
    }
    if (tool === "select" || tool === "eraser" || tool === "link" || tool === "embed") return null;
    return tool;
  }, [selectedElements, tool]);
  const showPanel = effectiveType !== null;
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null;
  const worldToScreen = useCallback((x, y) => ({ x: x * zoom + pan.x, y: y * zoom + pan.y }), [zoom, pan]);

  const gridSize = 28 * zoom;
  const gridOffsetX = ((pan.x % gridSize) + gridSize) % gridSize;
  const gridOffsetY = ((pan.y % gridSize) + gridSize) % gridSize;
  const gridDot = CANVAS_BACKGROUNDS.find((c) => c.value === canvasBg)?.dot || "#E4E4E0";

  const handlePositions = useMemo(() => {
    if (!singleSelected) return [];
    if (singleSelected.type === "text" || singleSelected.type === "link") return [];
    if (singleSelected.type === "line" || singleSelected.type === "arrow") {
      return singleSelected.points.map((p, i) => ({ key: `pt-${i}`, handle: i, wx: p.x, wy: p.y }));
    }
    const b = getBBox(singleSelected);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return [
      { key: "nw", handle: "nw", wx: b.x, wy: b.y }, { key: "n", handle: "n", wx: cx, wy: b.y }, { key: "ne", handle: "ne", wx: b.x + b.w, wy: b.y },
      { key: "e", handle: "e", wx: b.x + b.w, wy: cy }, { key: "se", handle: "se", wx: b.x + b.w, wy: b.y + b.h }, { key: "s", handle: "s", wx: cx, wy: b.y + b.h },
      { key: "sw", handle: "sw", wx: b.x, wy: b.y + b.h }, { key: "w", handle: "w", wx: b.x, wy: cy },
    ];
  }, [singleSelected]);

  const cursorForHandle = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

  const multiBBox = useMemo(() => {
    if (selectedElements.length < 2) return null;
    const boxes = selectedElements.map(getBBox);
    const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)), maxY = Math.max(...boxes.map((b) => b.y + b.h));
    return { x, y, w: maxX - x, h: maxY - y };
  }, [selectedElements]);

  const canvasCursor = spaceHeldRef.current ? "grab" : tool === "select" ? "default" : tool === "text" ? "text" : tool === "eraser" ? "cell" : tool === "link" || tool === "embed" ? "copy" : "crosshair";

  const sortedProjects = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  function toggleTheme() {
    setIsDark((d) => {
      const next = !d;
      window.localStorage.setItem("board-theme", next ? "dark" : "light");
      return next;
    });
  }

  const saveLabel = saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : saveStatus === "idle" ? "Unsaved" : "Saved";

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, background: theme.appBg, overflow: "hidden", fontFamily: "'Inter', -apple-system, sans-serif", userSelect: "none" }}>
      <style>{`
        * { box-sizing: border-box; }
        .tb-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; border: none; background: transparent; color: ${theme.ink}; cursor: pointer; transition: background 120ms ease, color 120ms ease, transform 100ms ease; }
        .tb-btn:hover { background: ${theme.hover}; }
        .tb-btn:active { transform: scale(0.94); }
        .tb-btn.active { background: #4C5FF7; color: white; }
        .tb-btn:disabled { opacity: 0.35; cursor: default; }
        .tb-btn:disabled:hover { background: transparent; }
        .swatch { width: 22px; height: 22px; border-radius: 7px; cursor: pointer; border: 2px solid transparent; transition: transform 100ms ease, border-color 100ms ease; }
        .swatch:hover { transform: scale(1.08); }
        .swatch.selected { border-color: ${theme.ink}; }
        .panel-label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: ${theme.muted}; font-weight: 600; margin-bottom: 6px; }
        .seg-btn { flex: 1; padding: 6px 0; border-radius: 8px; border: 1px solid ${theme.panelBorder}; background: ${isDark ? "#242427" : "white"}; font-size: 12px; color: ${theme.ink}; cursor: pointer; font-family: inherit; }
        .seg-btn.on { background: ${theme.ink}; color: ${isDark ? "#1B1B1D" : "white"}; border-color: ${theme.ink}; }
        .proj-row { display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 8px; cursor: pointer; }
        .proj-row:hover { background: ${theme.hover}; }
        .proj-row.active { background: ${isDark ? "rgba(76,95,247,0.18)" : "rgba(76,95,247,0.08)"}; }
        .icon-btn-sm { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: none; background: transparent; color: ${theme.muted}; cursor: pointer; }
        .icon-btn-sm:hover { background: ${theme.panelBorder}; color: ${theme.ink}; }
        input.proj-name-input { font: inherit; font-size: 13px; color: ${theme.ink}; background: transparent; border: none; border-bottom: 1px solid #4C5FF7; outline: none; padding: 1px 0; width: 100%; }
      `}</style>

      <svg ref={svgRef} width="100%" height="100%" style={{ cursor: canvasCursor, display: "block" }} onPointerDown={handleCanvasPointerDown}>
        <defs>
          <pattern id="dotgrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={gridOffsetX} y={gridOffsetY}>
            <circle cx="1.2" cy="1.2" r="1.2" fill={gridDot} />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill={canvasBg} />
        <rect x="0" y="0" width="100%" height="100%" fill="url(#dotgrid)" />

        <g id="content-layer" transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {elements.map((el) =>
            editingText && editingText.id === el.id ? null : (
              <g key={el.id} opacity={el.opacity} onPointerDown={(e) => handleShapePointerDown(e, el)} style={{ cursor: tool === "select" ? "move" : "inherit" }}>
                <ShapeSvg el={el} theme={theme} isEmbedInteracting={interactingEmbedId === el.id} hideLabel={editingLabel?.id === el.id} />
              </g>
            )
          )}

          {linkDraft && <rect x={linkDraft.x} y={linkDraft.y} width={linkDraft.w} height={linkDraft.h} rx={12} fill="#EEF1FF" stroke="#4C5FF7" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />}
          {embedDraft && <rect x={embedDraft.x} y={embedDraft.y} width={embedDraft.w} height={embedDraft.h} rx={8} fill="none" stroke="#4C5FF7" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />}

          {selectedIds.length > 0 && (
            <g pointerEvents="none">
              {selectedElements.map((el) => {
                const b = getBBox(el);
                return <rect key={el.id} x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} fill="none" stroke="#4C5FF7" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} rx={4 / zoom} />;
              })}
              {multiBBox && <rect x={multiBBox.x - 8} y={multiBBox.y - 8} width={multiBBox.w + 16} height={multiBBox.h + 16} fill="none" stroke="#4C5FF7" strokeWidth={1 / zoom} rx={6 / zoom} />}
            </g>
          )}
        </g>
      </svg>

      {singleSelected &&
        handlePositions.map((h) => {
          const s = worldToScreen(h.wx, h.wy);
          const isEndpoint = singleSelected.type === "line" || singleSelected.type === "arrow";
          return (
            <div key={h.key} onPointerDown={(e) => handleResizePointerDown(e, singleSelected, h.handle)}
              style={{ position: "absolute", left: s.x - 6, top: s.y - 6, width: 12, height: 12, borderRadius: isEndpoint ? "50%" : 3, background: "white", border: "2px solid #4C5FF7", cursor: isEndpoint ? "pointer" : cursorForHandle[h.handle], zIndex: 20 }} />
          );
        })}

      {marquee && (
        <div style={{ position: "absolute", left: worldToScreen(marquee.x, marquee.y).x, top: worldToScreen(marquee.x, marquee.y).y, width: marquee.w * zoom, height: marquee.h * zoom, background: "rgba(76,95,247,0.08)", border: "1px solid #4C5FF7", pointerEvents: "none" }} />
      )}

      {editingText && (
        <textarea
          ref={textareaRef}
          value={editingText.text}
          onChange={(e) => setEditingText((d) => ({ ...d, text: e.target.value }))}
          onBlur={() => finishTextEdit(true)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { e.currentTarget.blur(); finishTextEdit(false); } }}
          style={{
            position: "absolute", left: worldToScreen(editingText.x, editingText.y).x, top: worldToScreen(editingText.x, editingText.y).y,
            fontFamily: "'Kalam', cursive", fontSize: editingText.fontSize * zoom, lineHeight: 1.35, color: editingText.stroke,
            background: "transparent", border: "none", outline: "1px dashed #4C5FF7", outlineOffset: 4, resize: "none", padding: 0,
            minWidth: 60, minHeight: editingText.fontSize * zoom * 1.4,
            width: Math.max(120, measureText(editingText.text || " ", editingText.fontSize).width * zoom),
            height: Math.max(40, measureText(editingText.text || " ", editingText.fontSize).height * zoom + 10),
            overflow: "hidden",
          }}
        />
      )}

      {editingLabel && (
        <textarea
          ref={labelTextareaRef}
          value={editingLabel.text}
          onChange={(e) => setEditingLabel((d) => ({ ...d, text: e.target.value }))}
          onBlur={() => finishLabelEdit(true)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { e.currentTarget.blur(); finishLabelEdit(false); } }}
          style={{
            position: "absolute", left: worldToScreen(editingLabel.x, editingLabel.y).x, top: worldToScreen(editingLabel.x, editingLabel.y).y,
            width: editingLabel.w * zoom, height: editingLabel.h * zoom, boxSizing: "border-box",
            fontFamily: "'Kalam', cursive", fontSize: editingLabel.fontSize * zoom, lineHeight: `${editingLabel.fontSize * zoom * 1.3}px`, color: editingLabel.stroke,
            textAlign: "center", background: "transparent", border: "1px dashed #4C5FF7", resize: "none", outline: "none",
            padding: `${Math.max(0, (editingLabel.h * zoom - editingLabel.text.split("\n").length * editingLabel.fontSize * zoom * 1.3) / 2)}px 4px`,
            overflow: "hidden",
          }}
        />
      )}

      {linkDraft && (
        <div onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "absolute", left: worldToScreen(linkDraft.x, linkDraft.y).x, top: worldToScreen(linkDraft.x, linkDraft.y).y + linkDraft.h * zoom + 8, width: 220, maxHeight: 260, overflowY: "auto", background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 12, boxShadow: theme.shadow, padding: 8, zIndex: 30 }}>
          <div className="panel-label" style={{ padding: "2px 4px" }}>Link to board</div>
          {projects.filter((p) => p.id !== boardId).map((p) => (
            <div key={p.id} className="proj-row" onClick={() => {
              beginChange();
              setElements((prev) => [...prev, { id: genId(), type: "link", x: linkDraft.x, y: linkDraft.y, w: linkDraft.w, h: linkDraft.h, targetId: p.id, label: p.name, stroke: "#4C5FF7", fill: "#EEF1FF", opacity: 1 }]);
              endChange();
              setLinkDraft(null);
            }}>
              <Link2 size={13} color={theme.muted} />
              <span style={{ fontSize: 13, color: theme.ink }}>{p.name}</span>
            </div>
          ))}
          <div className="proj-row" onClick={async () => {
            const p = await addProject(`Untitled ${projects.length + 1}`);
            if (!p) return;
            // addProject navigates away, so store the pending link via query — simplest: just tell the user.
            setToast(`Created "${p.name}" — link it from here once you're back`);
          }}>
            <Plus size={13} color="#4C5FF7" />
            <span style={{ fontSize: 13, color: "#4C5FF7", fontWeight: 600 }}>New linked board</span>
          </div>
        </div>
      )}

      {embedDraft && (
        <div onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "absolute", left: worldToScreen(embedDraft.x, embedDraft.y).x, top: worldToScreen(embedDraft.x, embedDraft.y).y + embedDraft.h * zoom + 8, width: 280, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 12, boxShadow: theme.shadow, padding: 12, zIndex: 30 }}>
          <div className="panel-label">Embed a web page</div>
          <input autoFocus value={embedUrlInput} onChange={(e) => setEmbedUrlInput(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") insertEmbed(); if (e.key === "Escape") setEmbedDraft(null); }}
            placeholder="https://example.com"
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.panelBorder}`, fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 8, background: isDark ? "#242427" : "white", color: theme.ink }} />
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, lineHeight: 1.4 }}>Some sites block embedding — if it stays blank, that site doesn't allow it.</div>
          <button className="seg-btn on" style={{ width: "100%" }} onClick={insertEmbed}>Insert embed</button>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFileChosen} />
      <input ref={jsonInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleJSONFileChosen} />

      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, padding: 5, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 16, boxShadow: theme.shadow }}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return <button key={t.id} className={`tb-btn${tool === t.id ? " active" : ""}`} title={`${t.label} (${t.key})`} onClick={() => setTool(t.id)}><Icon size={18} strokeWidth={2} /></button>;
        })}
        <div style={{ width: 1, background: theme.panelBorder, margin: "4px 3px" }} />
        <button className="tb-btn" title="Insert image" onClick={() => imageInputRef.current?.click()}><ImageIcon size={18} /></button>
        <button className={`tb-btn${tool === "link" ? " active" : ""}`} title="Link to another board" onClick={() => setTool("link")}><Link2 size={18} /></button>
        <button className={`tb-btn${tool === "embed" ? " active" : ""}`} title="Embed a web page" onClick={() => setTool("embed")}><Globe size={18} /></button>
      </div>

      <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <button onClick={() => router.push("/")} title="All boards" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, flexShrink: 0, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 12, boxShadow: theme.shadow, cursor: "pointer" }}>
          <Home size={16} color={theme.muted} />
        </button>
        <div>
          <button onClick={(e) => { e.stopPropagation(); refreshProjects(); setProjectsPanelOpen((v) => !v); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 12, boxShadow: theme.shadow, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{boardName}</span>
            <ChevronDown size={14} color={theme.muted} />
          </button>

          {projectsPanelOpen && (
            <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "relative", marginTop: 6, width: 260, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 14, boxShadow: theme.shadow, padding: 10, zIndex: 30 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div className="panel-label" style={{ margin: 0 }}>Boards</div>
                <button className="icon-btn-sm" onClick={() => addProject()}><Plus size={14} /></button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {sortedProjects.map((p) => (
                  <div key={p.id} className={`proj-row${p.id === boardId ? " active" : ""}`} onClick={() => { if (renamingId !== p.id) goToBoard(p.id); }}>
                    {renamingId === p.id ? (
                      <input className="proj-name-input" autoFocus defaultValue={p.name} onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => { renameProject(p.id, e.target.value.trim()); setRenamingId(null); }}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setRenamingId(null); }} />
                    ) : (
                      <span style={{ fontSize: 13, color: theme.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    )}
                    <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); setRenamingId(p.id); }} title="Rename"><PencilIcon size={12} /></button>
                    <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} title="Delete"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${theme.panelBorder}`, paddingTop: 10 }}>
                <div className="panel-label">Background</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {CANVAS_BACKGROUNDS.map((c) => (
                    <div key={c.value} className={`swatch${canvasBg === c.value ? " selected" : ""}`} style={{ background: c.value, border: c.value === "#FFFFFF" ? "1px solid #E6E6E1" : "2px solid transparent" }} title={c.name} onClick={() => setCanvasBg(c.value)} />
                  ))}
                </div>
                <div className="panel-label">Theme</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className={`seg-btn${!isDark ? " on" : ""}`} onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Sun size={13} /> Light</button>
                  <button className={`seg-btn${isDark ? " on" : ""}`} onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Moon size={13} /> Dark</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 2, padding: 5, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 16, boxShadow: theme.shadow }}>
        <button className="tb-btn" title="Undo (Ctrl+Z)" onClick={undo} disabled={past.length === 0}><Undo2 size={18} /></button>
        <button className="tb-btn" title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={future.length === 0}><Redo2 size={18} /></button>
        <button className="tb-btn" title="Duplicate (Ctrl+D)" onClick={duplicateSelected} disabled={selectedIds.length === 0}><Copy size={18} /></button>
        <div style={{ width: 1, background: theme.panelBorder, margin: "4px 3px" }} />
        <button className="tb-btn" title="Save as… (.json)" onClick={exportJSON}><Save size={18} /></button>
        <button className="tb-btn" title="Import a board (.json)" onClick={() => jsonInputRef.current?.click()}><Upload size={18} /></button>
        <button className="tb-btn" title="Export PNG" onClick={exportPNG}><Download size={18} /></button>
        <div style={{ width: 1, background: theme.panelBorder, margin: "4px 3px" }} />
        <button className="tb-btn" title="Clear board" onClick={clearCanvas}><Trash2 size={18} /></button>
      </div>

      {showPanel && (
        <div style={{ position: "absolute", top: 78, left: 20, width: 168, padding: 14, display: "flex", flexDirection: "column", gap: 14, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 16, boxShadow: theme.shadow }}>
          {!STROKELESS_TYPES.includes(effectiveType) && (
            <div>
              <div className="panel-label">Stroke</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STROKE_COLORS.map((c) => (
                  <div key={c.value} className={`swatch${style.stroke === c.value ? " selected" : ""}`} style={{ background: c.value, border: c.value === "#F6F6F3" ? "1px solid #E6E6E1" : undefined }} title={c.name} onClick={() => updateSelectedStyle({ stroke: c.value })} />
                ))}
              </div>
            </div>
          )}

          {FILL_TYPES.includes(effectiveType) && (
            <div>
              <div className="panel-label">Fill</div>
              <div style={{ display: "flex", gap: 6 }}>
                {FILL_COLORS.map((c) => (
                  <div key={c.value} className={`swatch${style.fill === c.value ? " selected" : ""}`}
                    style={{ background: c.value === "transparent" ? "white" : c.value, backgroundImage: c.value === "transparent" ? "linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)" : "none", backgroundSize: "8px 8px", backgroundPosition: "0 0, 4px 4px" }}
                    title={c.name} onClick={() => updateSelectedStyle({ fill: c.value })} />
                ))}
              </div>
            </div>
          )}

          {effectiveType === "text" && (
            <div>
              <div className="panel-label">Size</div>
              <div style={{ display: "flex", gap: 4 }}>
                {FONT_SIZES.map((f) => (
                  <button key={f.value} className={`seg-btn${style.fontSize === f.value ? " on" : ""}`} onClick={() => {
                    setStyle((s) => ({ ...s, fontSize: f.value }));
                    if (selectedIdsRef.current.length > 0) {
                      beginChange();
                      setElements((prev) => prev.map((el) => (selectedIdsRef.current.includes(el.id) && el.type === "text" ? { ...el, fontSize: f.value, ...measureText(el.text, f.value) } : el)));
                      endChange();
                    }
                  }}>{f.label}</button>
                ))}
              </div>
            </div>
          )}

          {WEIGHT_TYPES.includes(effectiveType) && (
            <div>
              <div className="panel-label">Weight</div>
              <div style={{ display: "flex", gap: 4 }}>
                {STROKE_WIDTHS.map((w) => (
                  <button key={w.value} className={`seg-btn${style.strokeWidth === w.value ? " on" : ""}`} onClick={() => updateSelectedStyle({ strokeWidth: w.value })}>{w.label}</button>
                ))}
              </div>
            </div>
          )}

          {SKETCH_TYPES.includes(effectiveType) && (
            <div>
              <div className="panel-label">Sketch</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ROUGHNESS.map((r) => (
                  <button key={r.value} className={`seg-btn${style.roughness === r.value ? " on" : ""}`} style={{ width: "100%" }} onClick={() => updateSelectedStyle({ roughness: r.value })}>{r.label}</button>
                ))}
              </div>
            </div>
          )}

          {EDGE_TYPES.includes(effectiveType) && (
            <div>
              <div className="panel-label">Corners</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {EDGES.map((opt) => (
                  <button key={opt.value} className={`seg-btn${style.edges === opt.value ? " on" : ""}`} style={{ width: "100%" }} onClick={() => updateSelectedStyle({ edges: opt.value })}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="panel-label">Opacity</div>
            <input type="range" min={0.1} max={1} step={0.05} value={style.opacity} onChange={(e) => updateSelectedStyle({ opacity: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: "#4C5FF7" }} />
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", alignItems: "center", gap: 2, padding: 5, background: theme.panelBg, backdropFilter: "blur(8px)", border: `1px solid ${theme.panelBorder}`, borderRadius: 14, boxShadow: theme.shadow }}>
        <button className="tb-btn" style={{ width: 30, height: 30 }} onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}><ZoomOut size={16} /></button>
        <button onClick={() => setZoom(1)} style={{ width: 52, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: theme.muted, background: "none", border: "none", cursor: "pointer" }} title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button className="tb-btn" style={{ width: 30, height: 30 }} onClick={() => setZoom((z) => Math.min(4, z + 0.1))}><ZoomIn size={16} /></button>
      </div>

      <div style={{ position: "absolute", bottom: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, pointerEvents: "none" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: theme.hud, letterSpacing: "0.02em" }}>
          x {cursorWorld.x} · y {cursorWorld.y} · {elements.length} object{elements.length === 1 ? "" : "s"}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: saveStatus === "error" ? "#E5484D" : theme.hud }}>{saveLabel}</div>
      </div>

      {toast && (
        <div style={{ position: "absolute", bottom: 70, left: "50%", transform: "translateX(-50%)", background: theme.ink, color: theme.appBg, padding: "8px 16px", borderRadius: 10, fontSize: 13, zIndex: 40 }}>{toast}</div>
      )}
    </div>
  );
}
