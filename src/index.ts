import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import inquirer from "inquirer";
import WebSocket from "ws";
import dotenv from "dotenv";
import {
  getMillisecondsUntilTrigger,
  initPocketOption,
  parseSignal,
} from "./helpers";

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH || "";
const session = process.env.TELEGRAM_SESSION_STRING || "";

const stringSession = new StringSession(session); // Fill this once you have a permanent session

//initialize PO WebSocket connection on bot startup
initPocketOption();

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  // --- STEP 1: AUTHENTICATION WITH INQUIRER ---
  await client.start({
    phoneNumber: async () => {
      const { phone } = await inquirer.prompt([
        {
          type: "input",
          name: "phone",
          message: "Enter your phone number (with country code):",
        },
      ]);
      return phone;
    },
    phoneCode: async () => {
      const { code } = await inquirer.prompt([
        {
          type: "input",
          name: "code",
          message: "Enter the code you received:",
        },
      ]);
      return code;
    },
    password: async () => {
      const { pw } = await inquirer.prompt([
        {
          type: "password",
          name: "pw",
          message: "Enter your 2FA password (if enabled):",
        },
      ]);
      return pw;
    },
    onError: (err) => console.error("Telegram Login Error:", err),
  });

  console.log("✅ Successfully logged into Telegram.");
  console.log("Session String (Save this for later):", client.session.save());

  // This 'wakes up' the listener for channels you are in.
  console.log("Fetching channels to initialize listener...");
  await client.getDialogs({ limit: 200 });

  //   //initialize PO WebSocket connection
  //   initPocketOption();

  // --- STEP 2: SIGNAL LISTENER ---

  const TARGET_CHAT_ID = -1002197451859;

  let lastMessageId: number | null = null;

  async function pollSignals() {
    try {
      const signals = await client.getMessages(TARGET_CHAT_ID, { limit: 1 });

      if (signals.length > 0) {
        const signal = signals[0];

        if (lastMessageId === null) {
          lastMessageId = signal.id;
        } else if (signal.id > lastMessageId) {
          lastMessageId = signal.id;
          console.log("🆕 NEW SIGNAL DETECTED:", signal.message);

          // Execute Trade Immediately
          const parsedSignal = parseSignal(signal.message);

          if (parsedSignal && parsedSignal.triggerTime) {
            const msToWait = getMillisecondsUntilTrigger(
              parsedSignal.triggerTime,
            );

            if (msToWait < 0) {
              console.log("⚠️ Signal time already passed. Skipping.");
            } else {
              console.log(
                `📡 Signal Received. Execution in ${(msToWait / 1000).toFixed(1)}s`,
              );

              // Schedule the trade
              setTimeout(() => {
                console.log("signal executed!!", parsedSignal);
                // executeTrade(parsedSignal);
              }, msToWait);
            }
          }
        }
      }
    } catch (err: any) {
      // If you hit a FloodWait, this catches it
      if (err.errorMessage?.includes("FLOOD_WAIT")) {
        const seconds = err.seconds || 30;
        console.warn(`⚠️ Rate limited. Sleeping for ${seconds}s`);
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      } else {
        console.error("Polling error:", err);
      }
    } finally {
      // Schedule the next check after 1 second
      setTimeout(pollSignals, 1200);
    }
  }

  // Start polling
  pollSignals();
})();

// --- STEP 4: POCKET OPTION EXECUTION ---
// function executeTrade(signal: TradeSignal) {
//     // Note: Replace with the actual PO WebSocket endpoint
//     const ws = new WebSocket('wss://api-eu.po.market/socket.io/?EIO=3&transport=websocket');

//     ws.on('open', () => {
//         // Auth with your SSID (Session Cookie)
//         ws.send(`42["auth",{"session":"${process.env.PO_SSID}"}]`);

//         const payload = [
//             "open_order",
//             {
//                 "asset": signal.asset,
//                 "amount": 10,
//                 "action": signal.direction,
//                 "time": signal.duration * 60
//             }
//         ];

//         ws.send(`42${JSON.stringify(payload)}`);
//         console.log(`🚀 Trade Placed: ${signal.asset} | ${signal.direction}`);
//     });

//     ws.on('error', (err) => console.error("Socket Error:", err));
// }
