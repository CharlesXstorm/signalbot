import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import inquirer from "inquirer";
import WebSocket from "ws";
import dotenv from "dotenv";
import { TradeSignal } from "./types";

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH || "";
const session = process.env.TELEGRAM_SESSION_STRING || "";

const stringSession = new StringSession(session); // Fill this once you have a permanent session

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    // --- STEP 1: AUTHENTICATION WITH INQUIRER ---
    await client.start({
        phoneNumber: async () => {
            const { phone } = await inquirer.prompt([{
                type: 'input',
                name: 'phone',
                message: 'Enter your phone number (with country code):'
            }]);
            return phone;
        },
        phoneCode: async () => {
            const { code } = await inquirer.prompt([{
                type: 'input',
                name: 'code',
                message: 'Enter the code you received:'
            }]);
            return code;
        },
        password: async () => {
            const { pw } = await inquirer.prompt([{
                type: 'password',
                name: 'pw',
                message: 'Enter your 2FA password (if enabled):'
            }]);
            return pw;
        },
        onError: (err) => console.error("Telegram Login Error:", err),
    });

    console.log("✅ Successfully logged into Telegram.");
    console.log("Session String (Save this for later):", client.session.save());

    // --- STEP 2: SIGNAL LISTENER ---
    const TARGET_CHAT_ID = "-1002197451859"; // Replace with your group ID

    client.addEventHandler(async (event) => {
        console.log("New message event received:", event);
        const message = event.message.message;
        const channelId = event.message.peerId?.toString();
        console.log("Received message:", message, "from","channel ID", channelId);

        if (channelId?.includes(TARGET_CHAT_ID)) {
            console.log(`📩 Signal Received: ${message}`);
            // const signal = parseSignal(message);
            // if (signal) executeTrade(signal);
        }
    }, new NewMessage({}));
})();

// --- STEP 3: PARSING LOGIC ---
function parseSignal(text: string): TradeSignal | null {
    const upperText = text.toUpperCase();
    // Example Regex for: "EURUSD CALL 5M"
    const pairMatch = upperText.match(/([A-Z]{6})/);
    if (!pairMatch) return null;

    return {
        asset: `${pairMatch[1]}_otc`,
        direction: upperText.includes("CALL") || upperText.includes("BUY") ? "call" : "put",
        duration: 5 // Defaulting to 5m, or extract via regex
    };
}

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