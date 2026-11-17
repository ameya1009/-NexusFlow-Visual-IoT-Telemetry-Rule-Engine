import React, { useState, useCallback, useRef } from 'react';
import { 
  ReactFlow, 
  MiniMap,
  Controls, 
  Background, 
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'NexusFlow IoT Input' }, position: { x: 250, y: 100 } },
];

let id = 0;
const getId = () => `dnd_node_${id++}`;

function FlowCanvasContent() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) {
        return;
      }

      // Mouse position ko canvas coordinates mein convert karta hai
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'default',
        data: { label: `${type.toUpperCase()} (IoT Node)` },
        position,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
      >
        <Controls />
        <MiniMap style={{ background: '#222' }} zoomable pannable />
        <Background gap={16} size={1} color="#333" />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
        <FlowCanvasContent />
      </div>
    </ReactFlowProvider>
  );
}