"use strict";

// A public, generic proof of Web Bluetooth read/write against the opt-in
// Rusty Quest rendezvous diagnostic. No credential is included in this page.
const UUID = {
  service: "9a7b1001-7d6a-4b7f-9d4a-6f7c0a010001",
  offer: "9a7b1001-7d6a-4b7f-9d4a-6f7c0a010002",
  control: "9a7b1001-7d6a-4b7f-9d4a-6f7c0a010003",
  status: "9a7b1001-7d6a-4b7f-9d4a-6f7c0a010004",
};

const el = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let device;
let offerCharacteristic;
let controlCharacteristic;
let statusCharacteristic;
let offer;
let busy = false;

function addEvent(message) {
  const list = el("events");
  if (list.firstElementChild?.textContent === "No events yet.") list.replaceChildren();
  const item = document.createElement("li");
  item.textContent = message;
  list.append(item);
}

function setConnection(message) { el("connection").textContent = message; }

function showDisconnected() {
  setConnection("Not connected");
  el("link").textContent = "Disconnected";
  el("quest-status").textContent = "—";
  el("exchange").disabled = true;
  offer = undefined;
  offerCharacteristic = undefined;
  controlCharacteristic = undefined;
  statusCharacteristic = undefined;
}

function readJson(dataView) {
  return JSON.parse(decoder.decode(dataView));
}

async function refreshStatus() {
  const status = readJson(await statusCharacteristic.readValue());
  if (status.m !== "rqrv" || status.v !== 1 || !["status", "accept"].includes(status.k)) {
    throw new Error("Unexpected Quest status message");
  }
  el("quest-status").textContent = status.k === "accept" ? "Test exchange accepted" : "Ready for test exchange";
  addEvent(status.k === "accept" ? "Quest accepted the authenticated test exchange." : "Quest status read succeeded.");
  return status;
}

async function connect() {
  if (busy) return;
  busy = true;
  el("connect").disabled = true;
  try {
    if (!navigator.bluetooth) throw new Error("Web Bluetooth is unavailable. Open this HTTPS page directly in Chrome on Android.");
    setConnection("Choose the nearby Quest…");
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [UUID.service] }] });
    device.addEventListener("gattserverdisconnected", () => {
      showDisconnected();
      addEvent("Quest disconnected.");
    }, { once: true });
    el("device").textContent = device.name || "Quest BLE device";
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(UUID.service);
    [offerCharacteristic, controlCharacteristic, statusCharacteristic] = await Promise.all([
      service.getCharacteristic(UUID.offer),
      service.getCharacteristic(UUID.control),
      service.getCharacteristic(UUID.status),
    ]);
    offer = readJson(await offerCharacteristic.readValue());
    if (offer.m !== "rqrv" || offer.v !== 1 || offer.k !== "offer") {
      throw new Error("Unexpected Quest offer message");
    }
    el("link").textContent = "Connected";
    setConnection("Connected");
    addEvent("BLE connection and offer read succeeded.");
    await refreshStatus();
    el("exchange").disabled = !sessionSecret();
    if (!sessionSecret()) addEvent("Read-only mode. A short-lived test credential is needed for the exchange.");
  } catch (error) {
    if (device?.gatt?.connected) device.gatt.disconnect();
    showDisconnected();
    addEvent(`Connection failed: ${error.message}`);
  } finally {
    busy = false;
    el("connect").disabled = false;
  }
}

function sessionSecret() {
  // The fragment is never sent in the HTTP request. Remove it from the URL
  // after this page loads so the credential is not exposed while browsing.
  return window.testSecret;
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signedProposal() {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(8)));
  const proposal = {
    m: "rqrv", v: 1, k: "proposal", sid: offer.sid,
    pid: "chrome-phone-test", e: offer.e, q: 2,
    r: "client", c: 1, ws: "idle", ttl: Math.min(offer.ttl, 30000), n: nonce,
  };
  if (proposal.pid === offer.pid) throw new Error("Test peer identity collided with Quest identity");
  const signingInput = `RQRV1|${proposal.k}|${proposal.sid}|${proposal.pid}|${proposal.e}|${proposal.q}|${proposal.r}|${proposal.c}|${proposal.ws}|-|0|${proposal.ttl}|${proposal.n}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(sessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  proposal.a = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput))).slice(0, 8));
  const bytes = encoder.encode(JSON.stringify(proposal));
  if (bytes.byteLength > 220) throw new Error("Test message exceeds the Quest protocol limit");
  return bytes;
}

async function exchange() {
  if (busy || !offer || !controlCharacteristic || !sessionSecret()) return;
  busy = true;
  el("exchange").disabled = true;
  try {
    const bytes = await signedProposal();
    await controlCharacteristic.writeValueWithResponse(bytes);
    addEvent("Authenticated test exchange sent.");
    const status = await refreshStatus();
    if (status.k !== "accept") throw new Error("Quest did not acknowledge the exchange");
  } catch (error) {
    addEvent(`Exchange failed: ${error.message}`);
  } finally {
    busy = false;
    el("exchange").disabled = !offer || !sessionSecret();
  }
}

const credential = new URLSearchParams(location.hash.slice(1)).get("test_secret");
window.testSecret = credential && credential.length >= 16 && credential.length <= 128 ? credential : undefined;
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
el("connect").addEventListener("click", connect);
el("exchange").addEventListener("click", exchange);
