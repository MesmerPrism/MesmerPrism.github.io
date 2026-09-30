// UI-only synthetic transport fixture. No hardware access, credentials or network requests.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FirstSetup from '../../public-site/FirstSetup.jsx';
import { BLE_UUIDS, createFirstSetupClient, PROVISIONING_ALGORITHM } from '../../src/first-setup.mjs';
import '../../public-site/style.css';
const available = () => true;
const unavailable = () => false;
function syntheticClient(mode, record, options) {
  class Response extends EventTarget {
    properties = { read: true, notify: true };
    value = new DataView(new ArrayBuffer(0));
    async startNotifications() {}
    store(text) { this.value = new DataView(new TextEncoder().encode(text).buffer); }
    async readValue() { this.dispatchEvent(new Event('characteristicvaluechanged')); return this.value; }
    emit(text) { this.store(text); this.dispatchEvent(new Event('characteristicvaluechanged')); }
  }
  const response = new Response();
  const command = { properties: { write: true }, async writeValueWithResponse(bytes) {
    const text = new TextDecoder().decode(bytes);
    if (!['PING', 'WIFI_STATUS', 'WIFI_KEYEX'].includes(text)) throw Error('Fixture permits public checks only');
    record(text);
    if (text === 'PING') return response.store('PONG');
    if ((mode === 'unsupported-status' && text === 'WIFI_STATUS') || (mode === 'unsupported-key' && text === 'WIFI_KEYEX')) return response.store(`ECHO: ${text}`);
    if (mode === 'timeout' || mode === 'pending-status') return response.store('OK: working');
    response.emit('OK: working');
    queueMicrotask(() => response.emit(mode === 'malformed' ? '{incomplete' : JSON.stringify(text === 'WIFI_STATUS'
      ? { mode: 'hotspot', connected: null, error: null }
      : { alg: PROVISIONING_ALGORITHM, kid: 'synthetic', pk: btoa('A'.repeat(32)) })));
  } };
  const device = new EventTarget(); device.name = 'Synthetic Reachy';
  const server = { connected: false, async connect() { this.connected = true; return this; }, disconnect() { this.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); }, async getPrimaryService(uuid) {
    if (uuid === BLE_UUIDS.service) return { async getCharacteristic(id) { return id === BLE_UUIDS.command ? command : response; } };
    return { async getCharacteristic(id) { return { async readValue() { return new DataView(new TextEncoder().encode(id === BLE_UUIDS.network ? 'HOTSPOT [wlan0] reachy-mini.local' : 'synthetic-id').buffer); } }; } };
  } };
  device.gatt = server;
  return createFirstSetupClient({ ...options, bluetooth: { requestDevice: () => Promise.resolve(device) }, timeoutMs: mode === 'pending-status' ? 5000 : 100 });
}
function Harness() {
  const [mode, setMode] = useState('unsupported-status');
  const [writes, setWrites] = useState([]);
  const [active, setActive] = useState(true);
  const [closed, setClosed] = useState(0);
  return <main><h1>Synthetic onboarding checks</h1><p>No robot traffic. This fixture permits only public setup checks.</p><label htmlFor="scenario">Scenario</label><select id="scenario" value={mode} onChange={event => { setWrites([]); setClosed(0); setActive(true); setMode(event.target.value); }}>
    {['unsupported-status', 'unsupported-key', 'ready', 'timeout', 'pending-status', 'malformed', 'no-bluetooth'].map(value => <option key={value}>{value}</option>)}
  </select><button type="button" onClick={() => setActive(value => !value)}>{active ? 'Leave setup' : 'Return to setup'}</button>{active && <FirstSetup key={mode} browserSupported={mode === 'no-bluetooth' ? unavailable : available} createClient={options => syntheticClient(mode, command => setWrites(current => [...current, command]), { ...options, onDisconnect(reason) { setClosed(count => count + 1); options.onDisconnect(reason); } })} />}<p data-testid="writes">Public checks sent: {writes.join(', ') || 'none'}</p><p>Closed Bluetooth connections: {closed}</p></main>;
}
createRoot(document.getElementById('root')).render(<Harness />);
