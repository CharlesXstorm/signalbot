//getSmartAsset determines whether to use the live or OTC version of an asset based on the signal text and current day
export function getSmartAsset(basePair: string, signalText: string): string {
  const isWeekend = [0, 6].includes(new Date().getDay()); // 0 = Sunday, 6 = Saturday
  const signalMentionsOTC = signalText.toUpperCase().includes("OTC");

  // 1. If the signal specifically says OTC, use it
  if (signalMentionsOTC) {
    return `${basePair}_otc`;
  }

  // 2. If it's a weekend, live markets are closed, so force OTC
  if (isWeekend) {
    return `${basePair}_otc`;
  }

  // 3. During the week, if signal doesn't say OTC, try live asset
  return basePair;
}