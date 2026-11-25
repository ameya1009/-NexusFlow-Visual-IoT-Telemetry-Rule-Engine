import FlowCanvas from './components/FlowCanvas';
import Sidebar from './components/Sidebar';

export default function App() {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' }}>
      <Sidebar />
      <div style={{ flexGrow: 1, height: '100%' }}>
        <FlowCanvas />
      </div>
    </div>
  );
}