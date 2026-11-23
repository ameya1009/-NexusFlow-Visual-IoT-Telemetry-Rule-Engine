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
    data: { label: '🌐 Source: sensor.scalar\n(ID: SN-001)', type: 'source.sensor', sensorId: 'SN-001', metric: 'temperature' }, 
    position: { x: 250, y: 100 },
    style: { background: '#2d2d2d', color: '#fff', border: '1px solid #4f46e5', borderRadius: '8px', padding: '12px', fontSize: '13px', width: '190px', whiteSpace: 'pre-line' }
  },
];

let id = 2;
const getId = (existingNodes = []) => {
  const maxNum = existingNodes.reduce((acc, n) => {
    const match = String(n.id).match(/node_(\d+)/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, id - 1);
  id = maxNum + 1;
  return `node_${id++}`;
};

function FlowCanvasContent() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [exportedJson, setExportedJson] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const { screenToFlowPosition } = useReactFlow();

  const showStatus = (text, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

 const getNodeStyle = (nodeType) => {
    let borderColor = '#4f46e5';
    if (nodeType === 'filter.movingAverage') borderColor = '#06b6d4';
    if (nodeType === 'math.operation') borderColor = '#a855f7';
    if (nodeType === 'logic.condition') borderColor = '#f59e0b';
    if (nodeType === 'action.sms' || nodeType === 'action.webhook') borderColor = '#10b981';

    return {
      background: '#2d2d2d',
      color: '#fff',
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '12px',
      fontSize: '13px',
      width: '190px',
      whiteSpace: 'pre-line'
    };
  };

const generateLabel = (data) => {
    if (data.type === 'source.sensor') {
      return `🌐 Source: ${data.type}\n(ID: ${data.sensorId || ''})`;
    } else if (data.type === 'filter.movingAverage') {
      return `🔍 Filter: ${data.type}\n(Window: ${data.windowSize || ''})`;
    } else if (data.type === 'math.operation') {
      return `➗ Math: ${data.type}\n(Factor: ${data.factor ?? ''})`;
    } else if (data.type === 'logic.condition') {
      return `🔀 Condition: ${data.type}\n(${data.operator || '>'} ${data.value ?? ''})`;
    } else if (data.type === 'action.sms') {
      return `⚡ Action: ${data.type}\n(Threshold: ${data.threshold ?? ''})`;
    } else if (data.type === 'action.webhook') {
      return `🪝 Action: ${data.type}\n(URL set: ${data.webhookUrl ? 'Yes' : 'No'})`;
    }
    return 'Node';
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const rawJsonData = event.dataTransfer.getData('application/json');
      
      if (!type) return;

      let nodeConfig = { type: 'source.sensor', sensorId: 'SN-001', metric: 'temperature' };
      if (rawJsonData) {
        try {
          nodeConfig = JSON.parse(rawJsonData);
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
        data: { label: generateLabel(nodeConfig), ...nodeConfig },
        position,
        style: getNodeStyle(nodeConfig.type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handlePropertyChange = (key, value) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const updatedData = { ...node.data, [key]: value };
          updatedData.label = generateLabel(updatedData);

          const updatedNode = { ...node, data: updatedData };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  };

  // Client-Side Validation (Fields, connectivity, and cycles/loops)
  const validateGraph = () => {
    if (nodes.length === 0) {
      return { valid: false, error: 'Canvas is empty. Add at least one node.' };
    }

    // 1. Check required configuration fields per node type
    for (const node of nodes) {
      const { type } = node.data || {};

      if (type === 'source.sensor') {
        if (!node.data.sensorId || !String(node.data.sensorId).trim()) {
          return { valid: false, error: `Validation Failed: Source node (${node.id}) requires a Sensor ID.` };
        }
        if (!node.data.metric || !String(node.data.metric).trim()) {
          return { valid: false, error: `Validation Failed: Source node (${node.id}) requires a Metric.` };
        }
      }

      if (type === 'filter.movingAverage') {
        const win = Number(node.data.windowSize);
        if (!win || win <= 0) {
          return { valid: false, error: `Validation Failed: Filter node (${node.id}) requires a Window Size greater than 0.` };
        }
      }

      if (type === 'action.sms') {
        if (!node.data.phone || !String(node.data.phone).trim()) {
          return { valid: false, error: `Validation Failed: SMS Action node (${node.id}) requires a Phone Number.` };
        }
        if (node.data.threshold === undefined || node.data.threshold === '' || Number.isNaN(Number(node.data.threshold))) {
          return { valid: false, error: `Validation Failed: SMS Action node (${node.id}) requires a valid Threshold.` };
        }
      }

      if (type === 'action.webhook') {
        if (!node.data.webhookUrl || !String(node.data.webhookUrl).trim()) {
          return { valid: false, error: `Validation Failed: Webhook Action node (${node.id}) requires a Webhook URL.` };
        }
      }
    }

    // 2. Check incoming/outgoing connectivity
    for (const node of nodes) {
      const hasIncoming = edges.some((e) => e.target === node.id);
      const hasOutgoing = edges.some((e) => e.source === node.id);

      if (node.data.type === 'action.sms' || node.data.type === 'action.webhook') {
        if (!hasIncoming) {
          return {
            valid: false,
            error: `Validation Failed: Action node (${node.id}) must have an incoming connection.`
          };
        }
      } else if (node.data.type !== 'source.sensor') {
        if (!hasIncoming || !hasOutgoing) {
          return {
            valid: false,
            error: `Validation Failed: Processing node (${node.id}) should have both incoming and outgoing connections.`
          };
        }
      }
    }

    // 3. Check for cycles / loops using DFS
    const adjList = {};
    nodes.forEach((n) => (adjList[n.id] = []));
    edges.forEach((e) => {
      if (adjList[e.source]) adjList[e.source].push(e.target);
    });

    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (nodeId) => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        for (const neighbor of adjList[nodeId] || []) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) return true;
          if (recStack.has(neighbor)) return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        return { valid: false, error: 'Validation Failed: Graph contains an infinite loop (cycle detected).' };
      }
    }

    return { valid: true };
  };

  // Serialize React Flow state into clean Backend JSON Contract
  const serializeToContractJson = () => {
    const cleanNodes = nodes.map((node) => {
      const { label, type, ...configParams } = node.data;
      return {
        id: node.id,
        type: type,
        data: configParams,
        position: node.position
      };
    });

    const cleanEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target
    }));

    return {
      nodes: cleanNodes,
      edges: cleanEdges
    };
  };

  const handleExportJson = () => {
    const validation = validateGraph();
    if (!validation.valid) {
      showStatus(validation.error, true);
      return;
    }

    const contractPayload = serializeToContractJson();
    setExportedJson(JSON.stringify(contractPayload, null, 2));
    showStatus('Graph validated and serialized to contract JSON!');
  };

  const handleSaveGraph = () => {
    const validation = validateGraph();
    if (!validation.valid) {
      showStatus(validation.error, true);
      return;
    }

    const contractPayload = serializeToContractJson();
    localStorage.setItem('nexusflow_saved_graph', JSON.stringify(contractPayload));
    showStatus('Graph saved successfully!');
  };

const handleLoadGraph = () => {
    const saved = localStorage.getItem('nexusflow_saved_graph');
    if (!saved) {
      showStatus('No saved graph found in storage.', true);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        showStatus('Saved graph data format is invalid.', true);
        return;
      }

      const restoredNodes = parsed.nodes.map((n) => {
        const fullData = { type: n.type, ...n.data };
        fullData.label = generateLabel(fullData);
        return {
          id: n.id,
          type: n.type === 'source.sensor' ? 'input' : 'default',
          data: fullData,
          position: n.position || { x: 200, y: 200 },
          style: getNodeStyle(n.type)
        };
      });

      getId(restoredNodes);
      setNodes(restoredNodes);
      setEdges(parsed.edges);
      setSelectedNode(null);
      setExportedJson(null);
      showStatus('Saved graph loaded onto canvas!');
    } catch (e) {
      showStatus('Failed to deserialize saved graph.', true);
    }
  };

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      
      {/* Top Action Toolbar */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '20px',
        zIndex: 10,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <button 
          onClick={handleSaveGraph}
          style={{ background: '#2d2d2d', color: '#fff', border: '1px solid #444', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          💾 Save Graph
        </button>
        <button 
          onClick={handleLoadGraph}
          style={{ background: '#2d2d2d', color: '#fff', border: '1px solid #444', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          📂 Load Saved
        </button>
        <button 
          onClick={handleExportJson}
          style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          🚀 Validate & Export JSON
        </button>
      </div>

      {/* Status Toast Notification */}
      {statusMessage && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          zIndex: 20,
          background: statusMessage.isError ? '#7f1d1d' : '#064e3b',
          color: '#fff',
          border: `1px solid ${statusMessage.isError ? '#ef4444' : '#10b981'}`,
          padding: '10px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          maxWidth: '400px'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main React Flow Canvas */}
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
          onPaneClick={onPaneClick}
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

      {/* Exported Contract JSON Modal */}
      {exportedJson && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #4f46e5',
            borderRadius: '8px',
            padding: '20px',
            width: '500px',
            maxWidth: '90%',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#10b981' }}>✅ Serialized Contract JSON</h3>
              <button 
                onClick={() => setExportedJson(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <pre style={{
              background: '#111',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflowX: 'auto',
              maxHeight: '350px',
              border: '1px solid #333',
              margin: 0
            }}>
              {exportedJson}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportedJson);
                  showStatus('Copied JSON to clipboard!');
                }}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                📋 Copy JSON
              </button>
            </div>
          </div>
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