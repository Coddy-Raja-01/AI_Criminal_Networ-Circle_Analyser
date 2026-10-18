import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import { NodeSchema, EdgeSchema } from './types';

interface GraphViewProps {
  nodes: NodeSchema[];
  edges: EdgeSchema[];
  selectedNodeId?: string | null;
  onSelectNode: (node: NodeSchema) => void;
  highlightedNodeIds?: string[];
  highlightedEdgeRef?: string | null;
}

// Community color palette
const COMMUNITY_COLORS = [
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#14b8a6', // Teal
];

// Entity Type Colors
export const TYPE_COLORS: Record<string, string> = {
  Person: '#818cf8',      // Indigo
  Organization: '#fbbf24',// Amber
  Vehicle: '#34d399',     // Emerald
  Phone: '#c084fc',       // Purple
  Location: '#f43f5e',    // Rose
  Document: '#38bdf8',    // Sky
  Account: '#60a5fa',     // Blue
};

export const EDGE_COLORS: Record<string, string> = {
  Call: '#06b6d4',
  Transaction: '#10b981',
  Uses_Vehicle: '#f97316',
  Uses_Phone: '#a855f7',
  Mentioned_In: '#64748b',
  Co_Accused: '#ef4444',
  Co_Mentioned: '#475569',
};

export const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  highlightedNodeIds = [],
  highlightedEdgeRef = null
}) => {
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Resize listener
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Filter nodes & edges
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;
    if (filterType !== 'ALL') {
      filteredNodes = nodes.filter(n => n.type === filterType);
    }
    const nodeSet = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      return nodeSet.has(src) && nodeSet.has(tgt);
    });

    return {
      nodes: filteredNodes.map(n => ({ ...n })),
      links: filteredEdges.map(e => ({ ...e }))
    };
  }, [nodes, edges, filterType]);

  // Center on selected node if specified
  useEffect(() => {
    if (selectedNodeId && fgRef.current) {
      const targetNode = filteredData.nodes.find(n => n.id === selectedNodeId);
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        fgRef.current.centerAt(targetNode.x, targetNode.y, 800);
        fgRef.current.zoom(2.5, 800);
      }
    }
  }, [selectedNodeId, filteredData]);

  // Zoom controls
  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 400);
  };
  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.7, 400);
  };
  const handleZoomFit = () => {
    if (fgRef.current) fgRef.current.zoomToFit(600, 40);
  };

  // Node Canvas Rendering
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = node.id === selectedNodeId;
    const isHovered = hoveredNode && hoveredNode.id === node.id;
    const isHighlighted = highlightedNodeIds.includes(node.id);

    // Radius scaled by centrality score
    const cScore = node.centrality_score || 0.1;
    const baseRadius = 4 + cScore * 14;
    const radius = isSelected || isHighlighted ? baseRadius + 3 : baseRadius;

    // Outer Community Ring
    const commColor = COMMUNITY_COLORS[node.community_id % COMMUNITY_COLORS.length] || '#71717a';
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI, false);
    ctx.fillStyle = commColor;
    ctx.fill();

    // Node Body (Entity Type Color)
    const typeColor = TYPE_COLORS[node.type] || '#a1a1aa';
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = typeColor;
    ctx.fill();

    // Glowing selection border
    if (isSelected || isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // High risk marker
    if (node.risk_flag) {
      ctx.beginPath();
      ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 3, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    }

    // Label rendering: show on hover, selection, or when scale is sufficient
    const showLabel = isSelected || isHovered || isHighlighted || globalScale > 1.4 || cScore > 0.45;
    if (showLabel) {
      const label = node.label || node.id;
      const fontSize = Math.max(10 / globalScale, 9);
      ctx.font = `${fontSize}px Inter, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Background pill for readability
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth + 6, fontSize + 4];
      ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
      ctx.fillRect(
        node.x - bckgDimensions[0] / 2,
        node.y + radius + 4,
        bckgDimensions[0],
        bckgDimensions[1]
      );

      ctx.fillStyle = isSelected ? '#38bdf8' : '#e4e4e7';
      ctx.fillText(label, node.x, node.y + radius + fontSize * 0.7 + 4);
    }
  }, [selectedNodeId, hoveredNode, highlightedNodeIds]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[480px] bg-zinc-950 overflow-hidden select-none">
      
      {/* Floating Graph Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg p-1 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomFit}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        
        <div className="h-4 w-px bg-zinc-700 mx-1" />

        {/* Entity Type Filter */}
        <div className="flex items-center gap-1 text-xs text-zinc-400 pl-1 pr-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-0.5 border border-zinc-700 focus:outline-none"
          >
            <option value="ALL">All Types ({nodes.length})</option>
            <option value="Person">Persons</option>
            <option value="Organization">Organizations</option>
            <option value="Vehicle">Vehicles</option>
            <option value="Phone">Phones</option>
            <option value="Document">Documents</option>
          </select>
        </div>
      </div>

      {nodes.length > 0 && (
        <div className="absolute top-16 left-3 z-10 rounded-md border border-zinc-800/80 bg-zinc-900/85 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-lg backdrop-blur-md">
          Select a node to explore its connections
        </div>
      )}

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-lg p-2.5 text-[11px] text-zinc-300 shadow-lg space-y-1.5 hidden md:block">
        <div className="font-semibold text-zinc-400 text-[10px] tracking-wider uppercase">Entity Types (Fill)</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-xs">
          {Object.entries(TYPE_COLORS).map(([type, col]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
              <span>{type}</span>
            </div>
          ))}
        </div>
        <div className="font-semibold text-zinc-400 text-[10px] tracking-wider uppercase pt-1 border-t border-zinc-800">Edge Types</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-xs">
          {Object.entries(EDGE_COLORS).slice(0, 4).map(([type, col]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ backgroundColor: col }} />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Information Tooltip Card */}
      {hoveredNode && (
        <div className="absolute top-3 right-3 z-10 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-lg p-3 shadow-xl max-w-xs pointer-events-none text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1.5 mb-1.5">
            <span className="font-bold text-zinc-100">{hoveredNode.label}</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: `${TYPE_COLORS[hoveredNode.type]}22`,
                color: TYPE_COLORS[hoveredNode.type] || '#a1a1aa'
              }}
            >
              {hoveredNode.type}
            </span>
          </div>
          <div className="space-y-1 text-zinc-400 font-mono text-[11px]">
            <div>Centrality: <span className="text-purple-400 font-bold">{hoveredNode.centrality_score}</span></div>
            <div>Syndicate Cell: <span className="text-zinc-200">Cell #{hoveredNode.community_id}</span></div>
            {hoveredNode.risk_flag && (
              <div className="text-red-400 font-bold">⚠ HIGH RISK PRIORITY HUB</div>
            )}
          </div>
        </div>
      )}

      {/* 2D Force Graph */}
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeId="id"
        nodeLabel="" // Handled in custom canvas
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={(link: any) => {
          if (highlightedEdgeRef && link.evidence_ref === highlightedEdgeRef) {
            return '#f43f5e';
          }
          return EDGE_COLORS[link.type] || '#52525b';
        }}
        linkWidth={(link: any) => {
          if (highlightedEdgeRef && link.evidence_ref === highlightedEdgeRef) return 3.5;
          return Math.min(2.5, Math.max(1, (link.weight || 1) * 0.8));
        }}
        linkDirectionalParticles={(link: any) => {
          if (link.type === 'Transaction') return 2;
          if (link.type === 'Call') return 1;
          return 0;
        }}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        onNodeClick={(node: any) => onSelectNode(node)}
        onNodeHover={(node: any) => setHoveredNode(node)}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
};
