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
    data: { label: '🌐 Source: sensor.scalar', type: 'source.sensor', sensorId: 'SN-001', metric: 'temperature' }, 
    position: { x: 250, y: 100 },
    style: { background: '#2d2d2d', color: '#fff', border: '1px solid #4f46e5', borderRadius: '8px', padding: '10px' }
  },
];

let id = 2;
const getId = () => `node_${id++}`;

function FlowCanvasContent() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
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
      
      if (!type) return;

      let nodeConfig = { type: 'source.sensor', sensorId: 'SN-001', metric: 'temperature' };
      let labelText = 'Node';
      let borderColor = '#4f46e5';

      if (rawJsonData) {
        try {
          nodeConfig = JSON.parse(rawJsonData);
          if (nodeConfig.type === 'source.sensor') {
            labelText = `🌐 Source: ${nodeConfig.type}\n(ID: ${nodeConfig.sensorId})`;
            borderColor = '#4f46e5';
          } else if (nodeConfig.type === 'filter.movingAverage') {
            labelText = `🔍 Filter: ${nodeConfig.type}\n(Window: ${nodeConfig.windowSize})`;
            borderColor = '#06b6d4';
          } else if (nodeConfig.type === 'action.sms') {
            labelText = `⚡ Action: ${nodeConfig.type}\n(Threshold: ${nodeConfig.threshold})`;
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
        data: { label: labelText, ...nodeConfig },
        position,
        style: { 
          background: '#2d2d2d', 
          color: '#fff', 
          border: `1px solid ${borderColor}`, 
          borderRadius: '8px', 
          padding: '12px',
          fontSize: '13px',
          width: '190px',
          whiteSpace: 'pre-line'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onpaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node properties from Settings Panel
  const handlePropertyChange = (key, value) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updatedData = { ...node.data, [key]: value };
          
          // Re-generate label based on updated properties
          let newLabel = node.data.label;
          if (updatedData.type === 'source.sensor') {
            newLabel = `🌐 Source: ${updatedData.type}\n(ID: ${updatedData.sensorId || ''})`;
          } else if (updatedData.type === 'filter.movingAverage') {
            newLabel = `🔍 Filter: ${updatedData.type}\n(Window: ${updatedData.windowSize || ''})`;
          } else if (updatedData.type === 'action.sms') {
            newLabel = `⚡ Action: ${updatedData.type}\n(Threshold: ${updatedData.threshold || ''})`;
          }
          updatedData.label = newLabel;

          const updatedNode = { ...node, data: updatedData };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  };

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onpaneClick}
          fitView
        >
          <Controls />
          <MiniMap style={{ background: '#1a1a1a' }} zoomable pannable />
          <Background gap={16} size={1} color="#333" />
        </ReactFlow>
      </div>

      {/* Right Settings Panel */}
      {selectedNode && (
        <div style={{
          width: '280px',
          background: '#1a1a1a',
          color: '#fff',
          padding: '20px',
          borderLeft: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#4f46e5' }}>Node Settings</h3>
            <button 
              onClick={() => setSelectedNode(null)}
              style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ fontSize: '12px', color: '#888' }}>
            ID: {selectedNode.id} | Type: {selectedNode.data.type}
          </div>

          <hr style={{ borderColor: '#333', margin: '0' }} />

          {selectedNode.data.type === 'source.sensor' && (
            <>
              <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                Sensor ID:
                <input 
                  type="text" 
                  value={selectedNode.data.sensorId || ''} 
                  onChange={(e) => handlePropertyChange('sensorId', e.target.value)}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '4px' }}
                />
              </label>
              <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                Metric:
                <input 
                  type="text" 
                  value={selectedNode.data.metric || ''} 
                  onChange={(e) => handlePropertyChange('metric', e.target.value)}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '4px' }}
                />
              </label>
            </>
          )}

          {selectedNode.data.type === 'filter.movingAverage' && (
            <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              Window Size:
              <input 
                type="number" 
                value={selectedNode.data.windowSize || ''} 
                onChange={(e) => handlePropertyChange('windowSize', parseInt(e.target.value) || 0)}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '4px' }}
              />
            </label>
          )}

          {selectedNode.data.type === 'action.sms' && (
            <>
              <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                Phone Number:
                <input 
                  type="text" 
                  value={selectedNode.data.phone || ''} 
                  onChange={(e) => handlePropertyChange('phone', e.target.value)}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '4px' }}
                />
              </label>
              <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                Threshold:
                <input 
                  type="number" 
                  value={selectedNode.data.threshold || ''} 
                  onChange={(e) => handlePropertyChange('threshold', parseInt(e.target.value) || 0)}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '4px' }}
                />
              </label>
            </>
          )}
        </div>
      )}
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