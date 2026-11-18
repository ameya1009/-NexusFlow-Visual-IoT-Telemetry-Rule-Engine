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
  { 
    id: '1', 
    type: 'input', 
    data: { label: '🌐 Source: sensor.scalar' }, 
    position: { x: 250, y: 100 },
    style: { background: '#2d2d2d', color: '#fff', border: '1px solid #4f46e5', borderRadius: '8px', padding: '10px' }
  },
];

let id = 0;
const getId = () => `node_${id++}`;

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
      const rawJsonData = event.dataTransfer.getData('application/json');
      
      if (!type) {
        return;
      }

      let labelText = `${type.toUpperCase()} Node`;
      let borderColor = '#4f46e5';

      if (rawJsonData) {
        try {
          const parsedData = JSON.parse(rawJsonData);
          if (parsedData.type === 'source.sensor') {
            labelText = `🌐 Source: ${parsedData.type}\n(ID: ${parsedData.sensorId})`;
            borderColor = '#4f46e5';
          } else if (parsedData.type === 'filter.movingAverage') {
            labelText = `🔍 Filter: ${parsedData.type}\n(Window: ${parsedData.windowSize})`;
            borderColor = '#06b6d4';
          } else if (parsedData.type === 'action.sms') {
            labelText = `⚡ Action: ${parsedData.type}\n(Threshold: ${parsedData.threshold})`;
            borderColor = '#10b981';
          }
        } catch (e) {
          console.error("Error parsing dropped node data", e);
        }
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'default',
        data: { label: labelText },
        position,
        style: { 
          background: '#2d2d2d', 
          color: '#fff', 
          border: `1px solid ${borderColor}`, 
          borderRadius: '8px', 
          padding: '12px',
          fontSize: '13px',
          width: '180px',
          whiteSpace: 'pre-line'
        },
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
        <MiniMap style={{ background: '#1a1a1a' }} zoomable pannable />
        <Background gap={16} size={1} color="#333" />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh', background: '#111', display: 'flex' }}>
        <FlowCanvasContent />
      </div>
    </ReactFlowProvider>
  );
}