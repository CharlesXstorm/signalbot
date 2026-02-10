export function getMillisecondsUntilTrigger(triggerTimeStr: string): number {
  // triggerTimeStr is "07:20:00"
//   const [hours, minutes, seconds] = triggerTimeStr.split(':').map(Number);
  
  const now = new Date();
  
  // 1. Create a date object for TODAY in UTC
  // We use UTC-03:00, so we construct the ISO string: YYYY-MM-DDT07:20:00-03:00
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  const isoString = `${year}-${month}-${day}T${triggerTimeStr}-03:00`;
  const triggerDate = new Date(isoString);

  // 2. If the trigger time has already passed today (e.g., it's 23:00 and signal was for 07:00),
  // assume the signal is for tomorrow.
  if (triggerDate.getTime() < now.getTime() - 1000 * 60 * 60) { // 1 hour buffer
     triggerDate.setUTCDate(triggerDate.getUTCDate() + 1);
  }

  return triggerDate.getTime() - Date.now();
}