import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, Node, Edge, useNodesState, useEdgesState, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, ranksep: 120, nodesep: 60 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 240, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 120,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export const MindmapView = () => {
  const { outline, isEditMode } = useTextbookStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Transform outline to nodes and edges with dagre layout
  useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    
    const traverse = (nodeList: OutlineNode[], parentId: string | null) => {
      nodeList.forEach((node) => {
        rawNodes.push({
          id: node.id,
          position: { x: 0, y: 0 },
          data: { label: node.title },
          type: 'default',
          style: {
            background: 'white',
            color: '#18181b', // zinc-900
            border: '1px solid #e4e4e7', // zinc-200
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            width: 240,
            padding: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            textAlign: 'left',
          }
        });

        if (parentId) {
          rawEdges.push({
            id: `e-${parentId}-${node.id}`,
            source: parentId,
            target: node.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#18181b', strokeWidth: 2 } // zinc-900
          });
        }
        
        if (node.children && node.children.length > 0) {
          traverse(node.children, node.id);
        }
      });
    };

    if (outline && outline.length > 0) {
      traverse(outline, null);
    }
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'LR');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [outline, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-zinc-50/50">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={isEditMode ? onNodesChange : undefined}
        onEdgesChange={isEditMode ? onEdgesChange : undefined}
        nodesDraggable={isEditMode}
        nodesConnectable={isEditMode}
        elementsSelectable={true}
        fitView
      >
        <Background color="#e4e4e7" gap={24} size={1.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
