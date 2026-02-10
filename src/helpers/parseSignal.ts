import { TradeSignal } from "@/types";
import { getSmartAsset } from "./getSmartAsset";

export function parseSignal(text: string): TradeSignal | null {
  const rawText = text.trim();
  const upperText = rawText.toUpperCase();

  if (!upperText.includes("ANNA TRADER")) return null;

  try {
    // This matches: EURJPY, EURJPY-OTC, EURJPY_OTC
    const pairMatch = upperText.match(/\b(?!TRADER)([A-Z]{6})([-_]OTC)?\b/);
    // const pairMatch = upperText.match(/([A-Z]{6})([-_]OTC)?/);
    if (!pairMatch) return null;
    // We take the first group (the 6 letters) and force the Pocket Option suffix
    const basePair = pairMatch[1];
    const assetName = getSmartAsset(basePair, upperText); // Smartly determine live vs OTC

    // 2. Timeframe (M1, M5, etc.)
    const tfMatch = upperText.match(/M(\d+)/);
    const duration = tfMatch ? parseInt(tfMatch[1]) : 1;

    // 3. Trigger Time (HH:mm:ss)
    const timeMatch = rawText.match(/(\d{2}:\d{2}:\d{2})/);
    const triggerTime = timeMatch ? timeMatch[0] : null;

    // 4. Direction
    const direction =
      upperText.includes("BUY") || upperText.includes("CALL") ? "call" : "put";

    return {
      asset: assetName,
      direction: direction,
      duration: duration,
      triggerTime: triggerTime,
    };
  } catch (err) {
    console.error("Parsing failed:", err);
    return null;
  }
}