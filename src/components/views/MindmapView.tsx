import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';

export const MindmapView = () => {
  const { outline, isEditMode } = useTextbookStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Transform outline to nodes and edges with naive layout
  useMemo(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    let yOffset = 0;
    
    const traverse = (nodeList: OutlineNode[], parentId: string | null, depth: number) => {
      nodeList.forEach((node) => {
        const x = depth * 320;
        const y = yOffset * 100;
        
        newNodes.push({
          id: node.id,
          position: { x, y },
          data: { label: node.title },
          type: 'default',
          style: {
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            color: 'var(--foreground)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            width: 220,
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        });

        if (parentId) {
          newEdges.push({
            id: `e-${parentId}-${node.id}`,
            source: parentId,
            target: node.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'var(--primary)', strokeWidth: 2 }
          });
        }
        
        yOffset++;
        if (node.children && node.children.length > 0) {
          traverse(node.children, node.id, depth + 1);
        }
      });
    };

    if (outline && outline.length > 0) {
      traverse(outline, null, 0);
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [outline, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-background/50">
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
        <Background color="#ccc" gap={24} size={1.5} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
