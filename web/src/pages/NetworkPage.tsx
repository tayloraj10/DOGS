import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import LoadingState from "../components/LoadingState";
import type { DirectoryEntry } from "../api/types";
import { CATEGORY_COLORS, CATEGORY_DISPLAY_NAMES } from "../api/types";

interface GraphNode {
  id: string;
  label: string;
  color: string;
  val: number;
  isHub: boolean;
  entryId?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function NetworkPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = categories.map((category) => ({
      id: `category:${category.slug}`,
      label: CATEGORY_DISPLAY_NAMES[category.slug],
      color: CATEGORY_COLORS[category.slug] ?? "#64748b",
      val: 18,
      isHub: true,
    }));

    const links: GraphLink[] = [];

    for (const entry of entries) {
      if (entry.categories.length === 0) continue;
      nodes.push({
        id: `entry:${entry.id}`,
        label: entry.name,
        color: CATEGORY_COLORS[entry.categories[0]] ?? "#94a3b8",
        val: 3,
        isHub: false,
        entryId: entry.id,
      });
      for (const slug of entry.categories) {
        links.push({ source: `category:${slug}`, target: `entry:${entry.id}` });
      }
    }

    return { nodes, links };
  }, [categories, entries]);

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Network</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          How entries connect to each other through shared categories
        </p>
      </div>

      {loading && <LoadingState />}

      {!loading && (
        <div className="mt-8 h-[600px] overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-800">
          <ForceGraph2D
            graphData={graphData}
            nodeId="id"
            nodeLabel="label"
            nodeColor="color"
            nodeVal="val"
            linkColor={() => "rgba(148, 163, 184, 0.35)"}
            backgroundColor="#020617"
            onNodeClick={(node) => {
              const graphNode = node as unknown as GraphNode;
              if (graphNode.entryId) navigate(`/entry/${graphNode.entryId}`);
            }}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const graphNode = node as unknown as GraphNode & { x: number; y: number };
              if (!graphNode.isHub) return;
              const fontSize = 13 / globalScale;
              ctx.font = `600 ${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#f8fafc";
              ctx.fillText(graphNode.label, graphNode.x, graphNode.y + 12);
            }}
          />
        </div>
      )}
    </div>
  );
}
