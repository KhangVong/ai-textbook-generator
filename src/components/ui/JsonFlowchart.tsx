"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

interface FlowchartData {
  type?: string;
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; label?: string }[];
}

interface JsonFlowchartProps {
  data: string;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    const label = (node.data.label as string) || '';
    const lines = label.split('\n').length;
    const longestLine = Math.max(...label.split('\n').map(l => l.length));
    
    const w = Math.max(150, Math.min(250, longestLine * 8 + 20));
    const h = Math.max(50, lines * 20 + 20);

    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
    node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };

    node.style = {
      ...node.style,
      width: nodeWithPosition.width,
      height: nodeWithPosition.height,
    };

    return node;
  });

  return { nodes, edges };
};

export const JsonFlowchart: React.FC<JsonFlowchartProps> = ({ data }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed: FlowchartData = JSON.parse(data);
      
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error("Invalid format: missing nodes array");
      }

      const initialNodes: Node[] = parsed.nodes.map((n) => ({
        id: n.id,
        data: { label: n.label },
        position: { x: 0, y: 0 },
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: 500,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          minWidth: '150px',
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }));

      const initialEdges: Edge[] = (parsed.edges || []).map((e, index) => ({
        id: `e${e.source}-${e.target}-${index}`,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--accent))', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--accent))',
        },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontWeight: 500, fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.8 },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setError(null);
    } catch (err: any) {
      console.error("Flowchart JSON parsing error:", err);
      setError(err.message || "Failed to parse flowchart JSON");
    }
  }, [data, setNodes, setEdges]);

  if (error) {
    return (
      <div className="my-8 w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6">
        <div className="flex items-center space-x-2 text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <h4 className="font-semibold text-sm">Flowchart Data Error</h4>
        </div>
        <pre className="text-xs font-mono text-foreground bg-muted/50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
          {data}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-8 w-full h-[400px] border border-border rounded-xl shadow-sm overflow-hidden bg-background/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} className="bg-card border-border fill-foreground" />
      </ReactFlow>
    </div>
  );
};
