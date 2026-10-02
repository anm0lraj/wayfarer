import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'

export const notificationTypeSchema = z.enum([
  'trip_countdown', 'checkin_reminder', 'weather_alert', 'next_activity', 'free_time', 'busy_day',
])
export type NotificationType = z.infer<typeof notificationTypeSchema>

export const notificationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  type: notificationTypeSchema,
  tripId: idSchema.optional(),
  title: z.string(),
  body: z.string(),
  deepLink: z.string(),
  /** Identifies the event that produced it, so reminders are delivered once. */
  key: z.string().optional(),
  scheduledFor: isoDateTimeSchema,
  readAt: isoDateTimeSchema.optional(),
})
export type Notification = z.infer<typeof notificationSchema>
