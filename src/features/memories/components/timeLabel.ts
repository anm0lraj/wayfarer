export const timeLabel = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
