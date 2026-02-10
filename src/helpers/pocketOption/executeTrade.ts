import WebSocket from 'ws';
import { TradeSignal } from "@/types";

let poSocket: WebSocket | null = null;
let isAuthorized = false;

export function initPocketOption() {
  poSocket = new WebSocket('wss://api-eu.po.market/socket.io/?EIO=3&transport=websocket');

  poSocket.on('open', () => {
    // Auth with your SSID (Session Cookie)
    poSocket?.send(`42["auth",{"session":"${process.env.PO_SSID}","isDemo":1}]`);
  });

  poSocket.on('message', (data:any) => {
    const msg = data.toString();
    if (msg.includes('success_auth')) {
      isAuthorized = true;
      console.log("✅ Pocket Option Ready");
    }
    // Respond to Engine.io ping/pong to keep connection alive
    if (msg === '2') poSocket?.send('3');
  });

  poSocket.on('close', () => {
    console.log("❌ PO Connection lost. Retrying...");
    isAuthorized = false;
    setTimeout(initPocketOption, 2000);
  });
}


export function executeTrade(signal: TradeSignal) {
  if (!isAuthorized) return console.error("🚫 PO not authorized!");

  const payload = ["open_order", {
    "asset": signal.asset,
    "amount": 10, // Adjust stake here
    "action": signal.direction,
    "time": signal.duration * 60
  }];

  poSocket?.send(`42${JSON.stringify(payload)}`);
  console.log(`🚀 TRADE EXECUTED: ${signal.asset} | ${signal.direction} @ ${signal.triggerTime}`);
}