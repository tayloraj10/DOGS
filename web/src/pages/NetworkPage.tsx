import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide } from "d3-force-3d";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import LoadingState from "../components/LoadingState";
import SocialIcon, { SOCIAL_FIELDS } from "../components/SocialIcon";
import type { DirectoryEntry } from "../api/types";
import { getCategoryColor, slugToLabel } from "../api/types";
import { useTheme } from "../hooks/useTheme";

interface GraphNode {
  id: string;
  label: string;
  color: string;
  val: number;
  isHub: boolean;
  entryId?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  orbitMidR?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  color: string;
}

const HUB_RADIUS = 38;
const ENTRY_RADIUS = 13;
const ORBIT_SPEED = 0.35;

// Hub positions weighted by entry count so large categories get proportionally more arc.
// Ring radius also scales with total entries so hubs spread farther as the directory grows.
function hubPositions(
  orderedCats: { slug: string }[],
  entryCounts: Record<string, number>,
): { x: number; y: number }[] {
  const n = orderedCats.length;
  if (n === 0) return [];
  const weights = orderedCats.map((c) => Math.sqrt(Math.max(entryCounts[c.slug] ?? 1, 1)));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const totalEntries = Object.values(entryCounts).reduce((s, c) => s + c, 0);
  const r = Math.max(300, Math.min(460, 210 + totalEntries * 1.1));
  let cumAngle = -Math.PI / 2;
  return orderedCats.map((_, i) => {
    const share = (weights[i] / totalWeight) * 2 * Math.PI;
    const hubAngle = cumAngle + share / 2;
    cumAngle += share;
    return { x: Math.round(r * Math.cos(hubAngle)), y: Math.round(r * Math.sin(hubAngle)) };
  });
}

// Reorder categories so co-occurring ones (entries shared between two categories)
// are placed adjacent on the ring, shortening the force arc and reducing jitter.
function orderByCooccurrence<T extends { slug: string }>(
  cats: T[],
  entries: { categories: string[] }[],
): T[] {
  const n = cats.length;
  if (n <= 2) return cats;

  const slugIdx = new Map(cats.map((c, i) => [c.slug, i]));
  const co = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const entry of entries) {
    const idxs = entry.categories.map((s) => slugIdx.get(s)).filter((i): i is number => i !== undefined);
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        co[idxs[a]][idxs[b]]++;
        co[idxs[b]][idxs[a]]++;
      }
    }
  }

  // Greedy nearest-neighbor: always extend the chain with the most-connected unvisited node
  const visited = new Array(n).fill(false);
  const order: number[] = [0];
  visited[0] = true;
  while (order.length < n) {
    const last = order[order.length - 1];
    let best = -1;
    let bestScore = -Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && co[last][j] > bestScore) {
        bestScore = co[last][j];
        best = j;
      }
    }
    if (best === -1) best = visited.findIndex((v) => !v);
    visited[best] = true;
    order.push(best);
  }

  return order.map((i) => cats[i]);
}

export default function NetworkPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const linksRef = useRef<GraphLink[]>([]);
  const hubNodesRef = useRef<GraphNode[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initDims = { width: window.innerWidth, height: Math.max(400, window.innerHeight - 70) };
  const [dimensions, setDimensions] = useState(initDims);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  // Only start observing once the graph div is mounted (loading=false)
  useEffect(() => {
    if (loading) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    update(); // Measure immediately
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Pre-load profile images; since simulation runs forever, canvas picks them up next frame
  useEffect(() => {
    let mounted = true;
    for (const entry of entries) {
      if (!entry.image_url || imagesRef.current[entry.id]) continue;
      const img = new Image();
      img.src = entry.image_url;
      img.onload = () => {
        if (mounted) imagesRef.current[entry.id] = img;
      };
    }
    return () => {
      mounted = false;
    };
  }, [entries]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Count entries per primary category for weighted hub placement and per-hub ring sizing
    const entryCounts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.categories.length === 0) continue;
      entryCounts[entry.categories[0]] = (entryCounts[entry.categories[0]] ?? 0) + 1;
    }

    const orderedCategories = orderByCooccurrence(categories, entries);
    const positions = hubPositions(orderedCategories, entryCounts);
    orderedCategories.forEach((category, i) => {
      const { x: hx, y: hy } = positions[i];
      const count = entryCounts[category.slug] ?? 0;
      const orbitMidR = count > 22 ? 205 : count > 8 ? 152 : 135;
      nodes.push({
        id: `category:${category.slug}`,
        label: category.name,
        color: getCategoryColor(category.slug),
        val: 60,
        isHub: true,
        x: hx,
        y: hy,
        fx: hx,
        fy: hy,
        orbitMidR,
      });
    });

    // Staggered orbit rings per hub using golden angle for angular placement.
    // Large categories (>22 entries) get 3 rings to avoid overcrowding and reduce jitter.
    const hubIndex: Record<string, number> = {};
    const PHI = Math.PI * (3 - Math.sqrt(5)); // ~137.5° golden angle

    for (const entry of entries) {
      if (entry.categories.length === 0) continue;
      const knownSlugs = entry.categories;
      const primarySlug = knownSlugs[0];
      const primaryColor = getCategoryColor(primarySlug);

      const hub = nodes.find((n) => n.id === `category:${primarySlug}`);
      const idx = hubIndex[primarySlug] ?? 0;
      hubIndex[primarySlug] = idx + 1;

      const count = entryCounts[primarySlug] ?? 1;
      const rings = count > 22 ? [130, 210, 280] : count > 8 ? [120, 185] : [110, 160];
      const ringR = rings[idx % rings.length];
      const angle = idx * PHI;

      nodes.push({
        id: `entry:${entry.id}`,
        label: entry.name,
        color: primaryColor,
        val: 3,
        isHub: false,
        entryId: entry.id,
        x: (hub?.x ?? 0) + Math.cos(angle) * ringR,
        y: (hub?.y ?? 0) + Math.sin(angle) * ringR,
      });
      for (const slug of knownSlugs) {
        links.push({
          source: `category:${slug}`,
          target: `entry:${entry.id}`,
          color: getCategoryColor(slug),
        });
      }
    }

    linksRef.current = links;
    hubNodesRef.current = nodes.filter((n) => n.isHub);
    return { nodes, links };
  }, [categories, entries]); // intentionally excludes dimensions — resize handled by dimension effect

  // Configure d3 forces after graph data changes
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    fg.d3Force("link")
      ?.distance((link: { source: GraphNode }) =>
        link.source?.isHub ? (link.source.orbitMidR ?? 160) : 80
      )
      ?.strength(0.5);

    // Strong repulsion between entries so same-category nodes don't pile up
    fg.d3Force("charge")?.strength((node: GraphNode) => (node.isHub ? 0 : -100));

    // Collision radius sized for 2 rings — a bit larger keeps the rings visually distinct
    fg.d3Force("collide", forceCollide(ENTRY_RADIUS + 8));

    // Disable center force — link force naturally clusters entries near their hub
    fg.d3Force("center", null);

    // Orbital force: inject constant tangential velocity every tick.
    // With d3AlphaDecay=0 (alpha stays 1) + d3VelocityDecay=0.25:
    //   equilibrium orbit speed ≈ 0.38 / 0.25 ≈ 1.5 px/tick (~12 sec/full orbit)
    fg.d3Force("orbit", () => {
      for (const link of linksRef.current) {
        const src = link.source as GraphNode & {
          x: number; y: number; vx: number; vy: number;
        };
        const tgt = link.target as GraphNode & {
          x: number; y: number; vx: number; vy: number;
        };
        if (!src?.isHub || src.x == null || tgt.x == null) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        tgt.vx = (tgt.vx ?? 0) + (-dy / dist) * ORBIT_SPEED;
        tgt.vy = (tgt.vy ?? 0) + (dx / dist) * ORBIT_SPEED;
      }
    });
  }, [graphData]);


  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      const { x, y, isHub, color, label, entryId } = n;

      if (isHub) {
        // Soft glow halo
        const glow = ctx.createRadialGradient(x, y, HUB_RADIUS * 0.5, x, y, HUB_RADIUS * 1.6);
        glow.addColorStop(0, color + "55");
        glow.addColorStop(1, color + "00");
        ctx.beginPath();
        ctx.arc(x, y, HUB_RADIUS * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Main filled circle
        ctx.beginPath();
        ctx.arc(x, y, HUB_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight ring
        ctx.beginPath();
        ctx.arc(x, y, HUB_RADIUS - 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 5;
        ctx.stroke();

        // Category name centered inside
        const fontSize = Math.max(9, 14 / globalScale);
        ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, y);
      } else {
        const img = entryId ? imagesRef.current[entryId] : undefined;

        if (img) {
          // Circular cropped profile image
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, ENTRY_RADIUS, 0, Math.PI * 2);
          ctx.clip();
          try {
            ctx.drawImage(
              img,
              x - ENTRY_RADIUS,
              y - ENTRY_RADIUS,
              ENTRY_RADIUS * 2,
              ENTRY_RADIUS * 2,
            );
          } catch {
            ctx.fillStyle = color;
            ctx.fill();
          }
          ctx.restore();
          // Category-color ring border
          ctx.beginPath();
          ctx.arc(x, y, ENTRY_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Solid colored dot with white outline
          ctx.beginPath();
          ctx.arc(x, y, ENTRY_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Name label below node — clamps with zoom so it's always legible when zoomed in
        const fontSize = Math.min(10, Math.max(4, 8.5 / globalScale));
        ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.75)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const name = label.length > 24 ? label.slice(0, 23) + "…" : label;
        ctx.fillText(name, x, y + ENTRY_RADIUS + 2);
      }
    },
    [isDark],
  );

  const nodePointerAreaPaint = useCallback(
    (node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
      const { x = 0, y = 0, isHub } = node as GraphNode & { x: number; y: number };
      ctx.beginPath();
      ctx.arc(x, y, isHub ? HUB_RADIUS : ENTRY_RADIUS + 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  const linkColor = useCallback(
    (link: unknown) => {
      const c = (link as GraphLink).color ?? "#94a3b8";
      return isDark ? `${c}55` : `${c}40`;
    },
    [isDark],
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  const entryCount = entries.filter((e) => e.categories.length > 0).length;
  const hubCount = categories.length;

  return (
    <div ref={containerRef} className="flex-1 relative min-h-0 overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeId="id"
        nodeLabel={(node) => {
          const n = node as unknown as GraphNode;
          return n.isHub ? "" : n.label;
        }}
        nodeVal="val"
        linkColor={linkColor}
        linkWidth={1.2}
        backgroundColor={isDark ? "#0f172a" : "#f8fafc"}
        d3AlphaDecay={0}
        d3VelocityDecay={0.25}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={(node) => {
          const n = node as unknown as GraphNode;
          if (n.entryId) {
            setSelectedEntry(entries.find((e) => e.id === n.entryId) ?? null);
          }
        }}
        width={dimensions.width}
        height={dimensions.height}
      />

      <div className="absolute bottom-4 left-4 text-xs px-3 py-1.5 rounded-full pointer-events-none select-none bg-black/30 backdrop-blur-sm text-white/90">
        {entryCount} entries · {hubCount} categories
      </div>

      {selectedEntry && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
              {selectedEntry.image_url ? (
                <img
                  src={selectedEntry.image_url}
                  alt={selectedEntry.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl font-semibold text-slate-300 dark:text-slate-600">
                    {selectedEntry.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col gap-3 p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {selectedEntry.name}
                </h2>
                {selectedEntry.location?.city && (
                  <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
                    {[selectedEntry.location.city, selectedEntry.location.state, selectedEntry.location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              {selectedEntry.description && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
                  {selectedEntry.description}
                </p>
              )}

              {selectedEntry.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEntry.categories.map((slug) => (
                    <span
                      key={slug}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: getCategoryColor(slug) }}
                    >
                      {slugToLabel(slug)}
                    </span>
                  ))}
                </div>
              )}

              {SOCIAL_FIELDS.filter((f) => selectedEntry.social_links?.[f]).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_FIELDS.filter((f) => selectedEntry.social_links?.[f]).map((field) => (
                    <SocialIcon key={field} field={field} href={selectedEntry.social_links![field]!} />
                  ))}
                </div>
              )}

              <button
                onClick={() => navigate(`/entry/${selectedEntry.id}`)}
                className="mt-1 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                View full profile →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
