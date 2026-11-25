// Mocked IoT telemetry data for NexusFlow
export const mockDeviceSensors = [
  { id: 'dev-1', name: 'Turbine-7 Sensor', type: 'temperature', value: '78.4°C', status: 'Active' },
  { id: 'dev-2', name: 'Pressure Valve 03', type: 'pressure', value: '102.1 PSI', status: 'Warning' },
  { id: 'dev-3', name: 'Cooling Flow Meter', type: 'flow', value: '45.2 L/min', status: 'Optimal' },
];

export const fetchMockTelemetry = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDeviceSensors);
    }, 500);
  });
};