import React from 'react';

export default function Sidebar() {
  const onDragStart = (event, nodeType, nodeData) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{
      width: '260px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '20px',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100vh',
      boxSizing: 'border-box'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#4f46e5' }}>NexusFlow Palette</h3>
      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
        Drag nodes onto the canvas to build your pipeline workflow according to the contracts.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        
        {/* Source Node */}
        <div
          onDragStart={(event) => onDragStart(event, 'source', { type: 'source.sensor', sensorId: 'SN-001', metric: 'temperature' })}
          draggable
          style={{
            padding: '12px',
            background: '#2d2d2d',
            border: '1px solid #4f46e5',
            borderRadius: '6px',
            cursor: 'grab',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🌐 Source: sensor.scalar
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Sensor ID, Metric</div>
        </div>

        {/* Filter Node */}
        <div
          onDragStart={(event) => onDragStart(event, 'filter', { type: 'filter.movingAverage', windowSize: 5 })}
          draggable
          style={{
            padding: '12px',
            background: '#2d2d2d',
            border: '1px solid #06b6d4',
            borderRadius: '6px',
            cursor: 'grab',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔍 Filter: movingAverage
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Window Size: 5</div>
        </div>

        {/* Action Node */}
        <div
          onDragStart={(event) => onDragStart(event, 'action', { type: 'action.sms', phone: '+1234567890', threshold: 80 })}
          draggable
          style={{
            padding: '12px',
            background: '#2d2d2d',
            border: '1px solid #10b981',
            borderRadius: '6px',
            cursor: 'grab',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ⚡ Action: smsAlert
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Phone number, Threshold</div>
        </div>

      </div>
    </aside>
  );
}