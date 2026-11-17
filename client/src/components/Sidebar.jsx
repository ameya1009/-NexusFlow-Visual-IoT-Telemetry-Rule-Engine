import React from 'react';

export default function Sidebar() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{
      width: '240px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '20px',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 10
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#00df89' }}>IoT Node Palette</h3>
      <div 
        onDragStart={(event) => onDragStart(event, 'dataSource')} 
        draggable
        style={{ padding: '10px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', cursor: 'grab', textAlign: 'center' }}
      >
        📡 Data Source
      </div>
      <div 
        onDragStart={(event) => onDragStart(event, 'mathOperation')} 
        draggable
        style={{ padding: '10px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', cursor: 'grab', textAlign: 'center' }}
      >
        ⚙️ Math Operation
      </div>
      <div 
        onDragStart={(event) => onDragStart(event, 'actionTrigger')} 
        draggable
        style={{ padding: '10px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', cursor: 'grab', textAlign: 'center' }}
      >
        🚨 Action Trigger (SMS/Webhook)
      </div>
    </aside>
  );
}