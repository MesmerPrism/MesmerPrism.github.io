import { useEffect, useRef, useState } from 'react';
import { createFirstSetupClient, cryptoPreflight, FirstSetupError } from '../src/first-setup.mjs';

function statusText(status) {
  if (!status) return 'No Wi-Fi status read yet.';
  const modes = { hotspot: 'Robot access point', wlan: 'Joined a Wi-Fi network', busy: 'Changing network', disconnected: 'Disconnected' };
  return `${modes[status.mode] || 'Unknown network state'}${status.connected ? `: ${status.connected}` : ''}${status.error ? '. The robot reports a network error.' : ''}`;
}

export default function FirstSetup() {
  const [capability, setCapability] = useState('checking');
  const [identity, setIdentity] = useState(null);
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Checking this browser…');
  const [joined, setJoined] = useState(false);
  const client = useRef(null);
  const pin = useRef('');
  const requestedNetwork = useRef('');
  const operation = useRef(0);
  const mounted = useRef(true);
  const wifiForm = useRef(null);
  const pinForm = useRef(null);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function check() {
      if (!window.isSecureContext || !navigator.bluetooth?.requestDevice) {
        setCapability('unsupported');
        setMessage('Bluetooth setup needs a browser with Web Bluetooth, such as desktop Chrome or Edge, or Chrome on Android. Open this page there; no helper download is needed.');
        return;
      }
      try {
        await cryptoPreflight();
        if (!cancelled) { setCapability('ready'); setMessage('Browser check passed. Setup code is loaded; keep this tab open. You can stay connected to the internet while Bluetooth configures Reachy.'); }
      } catch {
        if (!cancelled) { setCapability('unsupported'); setMessage('This browser could not complete the encryption check. Try an up-to-date Chrome or Edge browser.'); }
      }
    }
    check();
    return () => { cancelled = true; mounted.current = false; operation.current++; pin.current = ''; client.current?.disconnect(); };
  }, []);

  function clearSecrets() {
    pin.current = '';
    pinForm.current?.reset();
    if (wifiForm.current) wifiForm.current.elements.password.value = '';
    setAuthenticated(false);
  }

  function disconnect() {
    operation.current++;
    client.current?.disconnect();
    client.current = null;
    clearSecrets();
    setConnected(false); setBusy(false); setError('');
    setMessage('Bluetooth disconnected. No Wi-Fi request will be repeated automatically.');
  }

  async function run(label, action) {
    const id = ++operation.current;
    setBusy(true); setError(''); setMessage(label);
    try { await action(id); }
    catch (failure) {
      if (mounted.current && operation.current === id) {
        // Protocol errors are fixed public messages; never display raw browser
        // exceptions or a credential-bearing command/robot response.
        setError(failure instanceof FirstSetupError ? failure.message : 'The browser operation failed. Check Bluetooth and try selecting Reachy again.');
        clearSecrets();
        if (!client.current?.connected) setConnected(false);
        setMessage('Setup stopped. Check the last observed status before trying again.');
      }
    } finally { if (mounted.current && operation.current === id) setBusy(false); }
  }

  function select() {
    client.current?.disconnect();
    clearSecrets(); setJoined(false); setStatus(null); setIdentity(null); setConnected(false);
    const selectedClient = createFirstSetupClient({ onDisconnect: reason => {
      if (client.current !== selectedClient || !mounted.current) return;
      operation.current++; clearSecrets(); setConnected(false); setBusy(false);
      if (reason instanceof FirstSetupError && reason.code !== 'disconnected') setError(reason.message);
      setMessage('Bluetooth disconnected. A Wi-Fi request may still be running on Reachy. Select the same robot and read its status before submitting again.');
    } });
    client.current = selectedClient;
    // Start requestDevice in this click's activation, before any async preflight.
    const selection = selectedClient.selectAndConnect();
    run('Select your powered-on Reachy in the browser chooser…', async id => {
      const observed = await selection;
      const inspected = await selectedClient.inspect();
      if (operation.current !== id) return;
      setIdentity(observed); setStatus(inspected.status); setConnected(true);
      setJoined(Boolean(requestedNetwork.current && inspected.status.mode === 'wlan' && inspected.status.connected === requestedNetwork.current && !inspected.status.error));
      setMessage('Reachy answered the connection and encrypted-setup checks. Compare its identity with the robot in front of you.');
    });
  }

  function authenticate(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('pin');
    event.currentTarget.reset();
    run('Verifying the setup PIN…', async id => {
      await client.current.authenticate(value);
      if (operation.current !== id) return;
      pin.current = value; setAuthenticated(true);
      setMessage('PIN accepted. Enter the temporary network Reachy should join.');
    });
  }

  async function observe(id, wanted) {
    const next = await client.current.getWifiStatus();
    if (operation.current !== id) return false;
    setStatus(next);
    const matched = next.mode === 'wlan' && next.connected === wanted && !next.error;
    if (matched) {
      const observed = await client.current.readIdentity();
      if (operation.current !== id) return false;
      setIdentity(observed); setJoined(true);
      setMessage('Reachy reports joining the requested Wi-Fi network. Next, put this computer on that network and check the robot’s browser status page.');
    }
    return matched;
  }

  function connectWifi(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ssid = data.get('ssid'); let password = data.get('password'); let setupPin = pin.current;
    data.delete('password');
    const encode = value => new TextEncoder().encode(value).length;
    if (encode(ssid) > 32 || encode(password) > 63) {
      setError('Network names must fit 32 UTF-8 bytes and this form’s Wi-Fi passwords must fit 8–63 UTF-8 bytes. Shorten the temporary network name or password.');
      return;
    }
    requestedNetwork.current = ssid;
    clearSecrets(); setJoined(false);
    run('Checking complete Bluetooth writes, then sending the encrypted Wi-Fi request…', async id => {
      try { await client.current.connectWifi({ ssid, password, pin: setupPin }); }
      finally { password = ''; setupPin = ''; }
      if (operation.current !== id) return;
      setMessage('Reachy accepted the request. Waiting for its network status; this is not yet proof of a connection.');
      const end = Date.now() + 60000;
      while (Date.now() < end && operation.current === id) {
        if (await observe(id, ssid)) return;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (operation.current === id) setMessage('The requested network was not confirmed within a minute. Read status again; do not assume the request failed or resend it yet.');
    });
  }

  function refresh() {
    run('Reading Reachy’s network status…', async id => {
      const next = await client.current.getWifiStatus();
      const observed = await client.current.readIdentity();
      if (operation.current !== id) return;
      setStatus(next); setIdentity(observed);
      setJoined(Boolean(requestedNetwork.current && next.mode === 'wlan' && next.connected === requestedNetwork.current && !next.error));
      setMessage('Network status updated. “Joined a Wi-Fi network” does not by itself verify internet or remote access.');
    });
  }

  return <div className="first-setup">
    <h3>Set up a new Wireless Mini with Bluetooth</h3>
    <p>This is an experimental first-time setup path. Keep Reachy nearby and powered on. Use a personal Wi-Fi network or phone hotspot with internet; this form cannot configure eduroam’s university sign-in.</p>
    <p className="notice">For this first test, use a temporary network password. Reachy’s built-in protocol encrypts the password, but does not authenticate the Bluetooth key exchange against an active impersonator. The PIN and password are used only in this tab’s memory and are cleared after Wi-Fi submission or disconnection.</p>
    <p className="status" role="status" aria-live="polite">{message}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button type="button" onClick={select} disabled={capability !== 'ready' || busy || connected}>Select Reachy</button><button type="button" onClick={refresh} disabled={!connected || busy}>Read network status</button><button type="button" onClick={disconnect} disabled={!client.current}>Disconnect Bluetooth</button></div>
    {identity && <dl className="setup-identity"><dt>Selected device</dt><dd>{identity.deviceName || 'Unnamed Bluetooth device'}</dd><dt>Reported hardware identity</dt><dd>{identity.hardwareId || 'Not exposed by this firmware'}</dd><dt>Last observed network</dt><dd>{statusText(status)}</dd><dt>Reported address information</dt><dd>{identity.network || 'Not exposed by this firmware'}</dd></dl>}
    <div className="setup-forms">
      <form ref={pinForm} className="connection-form" onSubmit={authenticate}>
        <h3>1. Verify the robot</h3>
        <label htmlFor="setup-pin">Setup PIN — last five characters of the printed serial</label>
        <input id="setup-pin" name="pin" type="password" autoComplete="off" required minLength={5} maxLength={5} disabled={!connected || busy} />
        <button disabled={!connected || busy || authenticated}>Verify PIN</button>
      </form>
      <form ref={wifiForm} className="connection-form" onSubmit={connectWifi}>
        <h3>2. Connect Reachy to Wi-Fi</h3>
        <label htmlFor="setup-ssid">Network name (SSID)</label>
        <input id="setup-ssid" name="ssid" type="text" autoComplete="off" required maxLength={32} disabled={!authenticated || busy} />
        <label htmlFor="setup-password">Temporary Wi-Fi password</label>
        <input id="setup-password" name="password" type="password" autoComplete="off" required minLength={8} maxLength={63} disabled={!authenticated || busy} />
        <button disabled={!authenticated || busy}>Connect to this Wi-Fi network</button>
      </form>
    </div>
    <h3>3. Enable browser control</h3>
    <p>{joined ? 'The requested Wi-Fi network was confirmed over Bluetooth.' : 'Complete the Wi-Fi step first.'} Once Reachy and this computer are on the same network with internet, check the robot’s status page for its installed version. Our motion controller currently supports daemon 1.10.0; do not downgrade a fresh robot to bypass this check.</p>
    {joined && <p><a href="http://reachy-mini.local:8000/api/daemon/status" target="_blank" rel="noopener noreferrer">Open Reachy’s status page</a></p>}
    <p>Then use Reachy’s Hugging Face sign-in. Review the permissions it requests before approving. The robot needs internet for this step. If the local name does not resolve, retain the address information above and return to the setup diagnostics.</p>
    {joined && <p><a href="http://reachy-mini.local:8000/api/hf-auth/oauth/begin" target="_blank" rel="noopener noreferrer">Open Reachy’s Hugging Face sign-in</a></p>}
    <p>After sign-in, return here, create a <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">read token for the same account</a>, and use <a href="#connect">Connect to Reachy</a>. Bluetooth setup does not wake the robot or start its camera or microphone.</p>
    <details><summary>If setup stops</summary><p>A cancelled chooser makes no changes. After a disconnect or timeout, select the same robot and read its status before another Wi-Fi request. A request acknowledgement does not prove network connection. If encrypted provisioning is absent on the shipped firmware, this wizard stops without updating or resetting it. The robot’s documentation page may be blank on its access point because it requires internet-hosted scripts.</p></details>
  </div>;
}
