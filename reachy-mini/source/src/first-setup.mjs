// Stock Reachy BLE provisioning. No storage, HTTP bridge, or command retries.
export const BLE_UUIDS = Object.freeze({
  service: '12345678-1234-5678-1234-56789abcdef0',
  command: '12345678-1234-5678-1234-56789abcdef1',
  response: '12345678-1234-5678-1234-56789abcdef2',
  status: '12345678-1234-5678-1234-56789abcdef3',
  network: '12345678-1234-5678-1234-56789abcdef4',
  hardwareId: '12345678-1234-5678-1234-56789abcdef7',
});
export const MAX_COMMAND_BYTES = 512;
export const PROVISIONING_ALGORITHM = 'x25519-hkdf-sha256-aesgcm';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const messages = {
  crypto: 'This browser cannot perform the required provisioning cryptography.',
  unavailable: 'Web Bluetooth is unavailable. Use a supported browser in a secure context.',
  selection: 'Bluetooth selection or connection did not complete.',
  disconnected: 'Bluetooth disconnected. Select the robot again and observe its status before another attempt.',
  timeout: 'Bluetooth response timed out. The connection was closed; select the robot again and observe status before another attempt.',
  transport: 'Bluetooth communication failed. Select the robot again and observe status before another attempt.',
  protocol: 'The robot returned an unsupported or incomplete response. Reconnect and observe status.',
  rejected: 'The robot rejected the request. Check its status before another attempt.',
  pin: 'PIN verification failed. Check the printed PIN and allow any robot lockout to expire.',
  auth: 'Verify the printed PIN before configuring Wi-Fi.',
  input: 'Enter a valid SSID, password, and five-character printed PIN.',
  size: 'The complete command exceeds the 512-byte Bluetooth limit.',
  probe: 'The robot did not return the complete synthetic write probe. No Wi-Fi credentials were sent.',
};
export class FirstSetupError extends Error {
  constructor(code) { super(messages[code] || messages.protocol); this.name = 'FirstSetupError'; this.code = code; }
}
const fail = (code) => new FirstSetupError(code);
const plainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const base64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
function unbase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw fail('protocol');
  try { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); } catch { throw fail('protocol'); }
}
function keySchema(v) {
  if (!plainObject(v) || v.alg !== PROVISIONING_ALGORITHM || typeof v.kid !== 'string' || !v.kid || v.kid.length > 64 || unbase64(v.pk).length !== 32) throw fail('protocol');
  return { kid: v.kid, pk: v.pk, alg: v.alg };
}
function json(value) { try { return JSON.parse(value); } catch { throw fail('protocol'); } }
export function validateWifiStatus(value) {
  if (!plainObject(value) || !['hotspot', 'wlan', 'disconnected', 'busy', null].includes(value.mode)
    || !(value.connected === null || typeof value.connected === 'string')
    || !(value.error === null || typeof value.error === 'string')
    || ('known' in value && (!Array.isArray(value.known) || !value.known.every((v) => typeof v === 'string')))) throw fail('protocol');
  // Preserve null (unknown) rather than coercing it to a disconnected state.
  // Never expose raw daemon errors: they can include user/network data.
  return { mode: value.mode, connected: value.connected, error: value.error === null ? null : 'Robot reported a Wi-Fi error.',
    ...('known' in value ? { known: [...value.known] } : {}) };
}
export function commandByteLength(command) {
  const length = encoder.encode(command).byteLength;
  if (length > MAX_COMMAND_BYTES) throw fail('size');
  return length;
}
function credentialInput({ ssid, password, pin }) {
  const passwordBytes = typeof password === 'string' ? encoder.encode(password).length : 0;
  if (typeof ssid !== 'string' || !ssid || encoder.encode(ssid).length > 32 || /[\u0000\r\n]/.test(ssid)
    || typeof password !== 'string' || !((passwordBytes >= 8 && passwordBytes <= 63) || /^[a-fA-F0-9]{64}$/.test(password)) || /\u0000/.test(password)
    || typeof pin !== 'string' || [...pin].length !== 5 || /[\s\u0000-\u001f\u007f]/u.test(pin)) throw fail('input');
}
export async function sealWifiPassword({ ssid, password, pin, keyExchange, crypto = globalThis.crypto }) {
  credentialInput({ ssid, password, pin });
  const key = keySchema(keyExchange);
  try {
    const pair = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
    const robotKey = await crypto.subtle.importKey('raw', unbase64(key.pk), { name: 'X25519' }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'X25519', public: robotKey }, pair.privateKey, 256);
    const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const aes = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(pin), info: encoder.encode('reachy-mini-wifi-psk-v1') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(ssid), tagLength: 128 }, aes, encoder.encode(password));
    return { ssid, kid: key.kid, epk: base64(await crypto.subtle.exportKey('raw', pair.publicKey)), nonce: base64(nonce), ct: base64(ct) };
  } catch { throw fail('crypto'); }
}
export async function cryptoPreflight({ crypto = globalThis.crypto } = {}) {
  try {
    const receiver = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
    const keyExchange = { alg: PROVISIONING_ALGORITHM, kid: 'synthetic', pk: base64(await crypto.subtle.exportKey('raw', receiver.publicKey)) };
    const payload = await sealWifiPassword({ ssid: 'synthetic-network', password: 'synthetic-password', pin: 'ABCDE', keyExchange, crypto });
    const sender = await crypto.subtle.importKey('raw', unbase64(payload.epk), 'X25519', false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'X25519', public: sender }, receiver.privateKey, 256);
    const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('ABCDE'), info: encoder.encode('reachy-mini-wifi-psk-v1') }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(payload.nonce), additionalData: encoder.encode(payload.ssid) }, key, unbase64(payload.ct));
    if (decoder.decode(opened) !== 'synthetic-password') throw fail('crypto');
    return { ok: true };
  } catch { throw fail('crypto'); }
}

export function createFirstSetupClient(options = {}) { return new FirstSetupClient(options); }
class FirstSetupClient {
  constructor({ bluetooth = globalThis.navigator?.bluetooth, crypto = globalThis.crypto, timeoutMs = 20000, onDisconnect = () => {} } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000) throw fail('input');
    this.bluetooth = bluetooth; this.crypto = crypto; this.timeoutMs = timeoutMs; this.onDisconnect = onDisconnect;
    this.device = null; this.server = null; this.command = null; this.response = null; this.pending = null;
    this.authenticated = false; this.queue = Promise.resolve(); this.generation = 0;
    this.notification = (event) => {
      if (!this.pending || this.pending.settled) return;
      try {
        const reply = decoder.decode(event.target.value);
        if (reply === 'OK: working') return;
        this.pending.settled = true;
        this.pending.resolve(reply);
      } catch { this.invalidate('protocol'); }
    };
    this.disconnection = () => this.invalidate('disconnected');
  }
  get connected() { return Boolean(this.server?.connected && this.command && this.response); }
  // Deliberately non-async: the chooser is invoked in the caller's user gesture.
  selectAndConnect() {
    if (!this.bluetooth?.requestDevice) return Promise.reject(fail('unavailable'));
    this.disconnect();
    let selection;
    // Current firmware advertises f3; older builds may advertise the command service.
    // Service filters are OR alternatives. Never request a name-wide/all-device scan.
    try { selection = this.bluetooth.requestDevice({ filters: [{ services: [BLE_UUIDS.status] }, { services: [BLE_UUIDS.service] }], optionalServices: [BLE_UUIDS.service, BLE_UUIDS.status] }); }
    catch { return Promise.reject(fail('selection')); }
    const generation = this.generation;
    return Promise.resolve(selection).then(async (device) => {
      if (generation !== this.generation) throw fail('disconnected');
      this.device = device; device.addEventListener('gattserverdisconnected', this.disconnection);
      let timer;
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { if (generation === this.generation) this.invalidate('timeout'); reject(fail('timeout')); }, this.timeoutMs); });
      const initialize = async () => {
        const server = await device.gatt.connect();
        if (generation !== this.generation) { server.disconnect(); throw fail('disconnected'); }
        this.server = server;
        const service = await server.getPrimaryService(BLE_UUIDS.service);
        if (generation !== this.generation) throw fail('disconnected');
        const command = await service.getCharacteristic(BLE_UUIDS.command);
        if (generation !== this.generation) throw fail('disconnected');
        const response = await service.getCharacteristic(BLE_UUIDS.response);
        if (generation !== this.generation) throw fail('disconnected');
        if (!command.properties?.write || !response.properties?.notify || typeof command.writeValueWithResponse !== 'function') throw fail('protocol');
        this.command = command; this.response = response;
        response.addEventListener('characteristicvaluechanged', this.notification);
        await response.startNotifications();
        if (generation !== this.generation) throw fail('disconnected');
      };
      try { await Promise.race([initialize(), timeout]); } finally { clearTimeout(timer); }
      return this.readIdentity();
    }).catch((error) => { if (generation === this.generation) this.invalidate('selection'); throw error instanceof FirstSetupError ? error : fail('selection'); });
  }
  enqueue(action) {
    const generation = this.generation;
    const result = this.queue.then(() => {
      if (generation !== this.generation || !this.connected) throw fail('disconnected');
      return action();
    });
    this.queue = result.catch(() => {});
    return result;
  }
  async send(command, validate) {
    commandByteLength(command);
    if (!this.connected || this.pending) throw fail('disconnected');
    const generation = this.generation;
    const characteristic = this.command;
    let timer;
    const reply = new Promise((resolve, reject) => {
      this.pending = { resolve, reject, settled: false };
      timer = setTimeout(() => this.invalidate('timeout'), this.timeoutMs);
    });
    // Notifications can arrive synchronously inside the write, before its promise resolves.
    // The timeout covers both the write promise and the final reply.
    const pending = this.pending;
    const write = Promise.resolve().then(() => {
      if (generation !== this.generation) throw fail('disconnected');
      return characteristic.writeValueWithResponse(encoder.encode(command));
    }).catch(() => {
      if (generation === this.generation) this.invalidate('transport');
      throw fail('transport');
    });
    const interruption = new Promise((_, reject) => { this.pending.abort = reject; });
    try {
      const [, value] = await Promise.race([Promise.all([write, reply]), interruption]);
      if (value.startsWith('ERROR:')) {
        this.authenticated = false;
        if (command.startsWith('BROWSER_SETUP_PROBE_')) { this.invalidate('probe'); throw fail('probe'); }
        throw fail(command.startsWith('PIN_') ? 'pin' : 'rejected');
      }
      try { return validate(value); } catch (error) {
        this.invalidate(error.code === 'probe' ? 'probe' : 'protocol');
        throw error instanceof FirstSetupError ? error : fail('protocol');
      }
    } finally { clearTimeout(timer); if (this.pending === pending) this.pending = null; }
  }
  inspect() { return this.enqueue(async () => {
    await this.send('PING', (reply) => { if (reply !== 'PONG') throw fail('protocol'); });
    const status = await this.status();
    const keyExchange = await this.keyExchange();
    return { status, keyExchange };
  }); }
  status() { return this.send('WIFI_STATUS', (reply) => validateWifiStatus(json(reply))); }
  getWifiStatus() { return this.enqueue(() => this.status()); }
  keyExchange() { return this.send('WIFI_KEYEX', (reply) => keySchema(json(reply))); }
  authenticate(pin) { return this.enqueue(async () => {
    if (typeof pin !== 'string' || [...pin].length !== 5 || /[\s\u0000-\u001f\u007f]/u.test(pin)) throw fail('input');
    this.authenticated = false;
    await this.send(`PIN_${pin}`, (reply) => { if (reply !== 'OK: Connected') throw fail('pin'); });
    this.authenticated = true;
    return { authenticated: true };
  }); }
  scanNetworks() { return this.enqueue(() => {
    if (!this.authenticated) throw fail('auth');
    return this.send('WIFI_SCAN', (reply) => { const v = json(reply); if (!Array.isArray(v) || !v.every((s) => typeof s === 'string')) throw fail('protocol'); return v; });
  }); }
  connectWifi({ ssid, password, pin }) { return this.enqueue(async () => {
    if (!this.authenticated) throw fail('auth');
    const payload = await sealWifiPassword({ ssid, password, pin, keyExchange: await this.keyExchange(), crypto: this.crypto });
    const command = `WIFI_CONNECT_ENC ${JSON.stringify(payload)}`;
    const commandBytes = commandByteLength(command);
    const probeLengths = [...new Set([197, 273, commandBytes])];
    for (const length of probeLengths) {
      const unique = base64(this.crypto.getRandomValues(new Uint8Array(12))).replace(/[+/=]/g, 'X');
      const prefix = `BROWSER_SETUP_PROBE_${unique}_`;
      const suffix = `_END_${unique}`;
      const probe = prefix + 'x'.repeat(length - prefix.length - suffix.length) + suffix;
      await this.send(probe, (reply) => { if (reply !== `ECHO: ${probe}`) throw fail('probe'); });
    }
    await this.send(command, (reply) => { if (reply !== `OK: Connecting to ${ssid}`) throw fail('protocol'); });
    return { accepted: true, commandBytes, probeLengths };
  }); }
  readIdentity() { return this.enqueue(async () => {
    const generation = this.generation;
    const identity = { deviceName: this.device?.name || null, network: null, hardwareId: null };
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { if (generation === this.generation) this.invalidate('timeout'); reject(fail('timeout')); }, this.timeoutMs); });
    const read = async () => { try {
      const service = await this.server.getPrimaryService(BLE_UUIDS.status);
      for (const [key, uuid] of [['network', BLE_UUIDS.network], ['hardwareId', BLE_UUIDS.hardwareId]]) {
        try { const char = await service.getCharacteristic(uuid); const value = decoder.decode(await char.readValue()); if (value.length <= 512) identity[key] = value; } catch { /* Optional characteristic. */ }
      }
    } catch { /* Optional service; commissioning service remains usable. */ } };
    try { await Promise.race([read(), timeout]); } finally { clearTimeout(timer); }
    if (generation !== this.generation || !this.connected) throw fail('disconnected');
    return identity;
  }); }
  invalidate(code) {
    this.generation += 1;
    const pending = this.pending;
    this.pending = null; this.authenticated = false;
    if (pending) { pending.reject(fail(code)); pending.abort?.(fail(code)); }
    this.response?.removeEventListener('characteristicvaluechanged', this.notification);
    this.device?.removeEventListener('gattserverdisconnected', this.disconnection);
    const server = this.server || this.device?.gatt;
    this.command = null; this.response = null; this.server = null; this.device = null;
    if (server?.connected) { try { server.disconnect(); } catch { /* Already unavailable. */ } }
    if (server) { try { this.onDisconnect(fail(code)); } catch { /* UI callback cannot restore transport. */ } }
  }
  disconnect() { this.invalidate('disconnected'); }
}
