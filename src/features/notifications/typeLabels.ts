import type { NotificationType } from '@/types'

export const NOTIFICATION_TYPES: Array<{ type: NotificationType; label: string; description: string }> = [
  { type: 'trip_countdown', label: 'Trip countdown', description: 'A week before and the day before you leave.' },
  { type: 'checkin_reminder', label: 'Hotel check-in', description: 'The day before you check in.' },
  { type: 'next_activity', label: 'Next activity', description: 'Half an hour before your next stop, during the trip.' },
  { type: 'weather_alert', label: 'Weather', description: 'When rain or storms are likely on a travel day.' },
  { type: 'free_time', label: 'Free time', description: 'When you have two or more hours with nothing planned.' },
  { type: 'busy_day', label: 'Busy days', description: 'When a day’s plan looks too packed.' },
]
