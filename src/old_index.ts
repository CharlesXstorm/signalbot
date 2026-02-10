import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { getPeerId } from "telegram/Utils";
import inquirer from "inquirer";
import WebSocket from "ws";
import dotenv from "dotenv";
import { TradeSignal } from "./types";

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH || "";
const session = process.env.TELEGRAM_SESSION_STRING || "";

const stringSession = new StringSession(session); // Fill this once you have a permanent session

async function syncTargetChannel(client: TelegramClient, targetId: string) {
    try {
        const entity = await client.getEntity(targetId);
        console.log(`✅ Entity Synced: ${(entity as any).title || 'Private Channel'}`);
    } catch (e) {
        console.error("❌ Failed to sync channel. Verify the ID is correct and the account is a member.");
    }
}

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

    // This 'wakes up' the listener for channels you are in.
    console.log("Fetching channels to initialize listener...");
    await client.getDialogs({});
    // const dialogs = await client.getDialogs({ limit: 200 });

    // --- STEP 2: SIGNAL LISTENER ---
    // const TARGET_CHAT_ID = "-1002197451859"; // Replace with your group ID
    ////////////////////
    // await syncTargetChannel(client, TARGET_CHAT_ID);

    const TARGET_CHAT_ID = -1002197451859;

    let lastMessageId: number | null = null;

    setInterval(async () => {
    try {
        const msgs = await client.getMessages(2197451859, { limit: 1 });

        if (!msgs.length) return;

        const msg = msgs[0];

        // first run: just initialize
        if (lastMessageId === null) {
        lastMessageId = msg.id;
        return;
        }

        // only act on NEW messages
        if (msg.id > lastMessageId) {
        lastMessageId = msg.id;
        console.log("🆕 NEW SIGNAL:", msg.message);
        }
    } catch (err) {
        console.error("Polling error:", err);
    }
    }, 1200);



    // client.addEventHandler(async (event) => {
    //     // console.log("New message event received:", event);
    //     const signal = event.message;
    //     const message = signal.message;
    //     // // getPeerId converts the internal peer object to the "-100..." format
    //     const chatId = getPeerId(signal.peerId);
    //     console.log("Received message:", message, "from","chat ID", chatId);

    //     if (chatId === TARGET_CHAT_ID) {
    //         console.log(`📩 Signal Received: ${message}`);
    //         // const signal = parseSignal(message);
    //         // if (signal) executeTrade(signal);
    //     }
    // });

    // }, new NewMessage({incoming: true}));
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
        duration: 5, // Defaulting to 5m, or extract via regex
        triggerTime: null // Placeholder for future time-based signals
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