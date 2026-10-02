import { createContext, useContext } from 'react'
import type { AIService } from './ai/types'
import type { AuthService } from './auth/types'
import type { BookingService } from './bookings/types'
import type { GeolocationService } from './geolocation/geolocation'
import type { MapService } from './maps/types'
import type { NotificationService } from './notifications/types'
import type { StorageService } from './storage/types'
import type { WeatherService } from './weather/types'
import { aiService } from './ai/mock'
import { env } from '@/config/env'
import { lazyAuthService } from './auth/lazy'
import { authService } from './auth/mock'
import { bookingService } from './bookings/mock'
import { geolocationService } from './geolocation/geolocation'
import { mapService } from './maps/mock'
import { notificationService } from './notifications/mock'
import { storageService } from './storage/mock'
import { weatherService } from './weather/mock'

export interface Services {
  ai: AIService
  maps: MapService
  bookings: BookingService
  weather: WeatherService
  auth: AuthService
  storage: StorageService
  notifications: NotificationService
  geolocation: GeolocationService
}

/** Default wiring. To use a real vendor, replace the adapter here — screens only see the interfaces. */
export const defaultServices: Services = {
  ai: aiService, maps: mapService, bookings: bookingService, weather: weatherService,
  auth: env.backend === 'firebase' ? lazyAuthService(async () => (await import('./auth/firebase')).firebaseAuthService) : authService,
  storage: storageService, notifications: notificationService, geolocation: geolocationService,
}

export const ServicesContext = createContext<Services>(defaultServices)

export const useServices = () => useContext(ServicesContext)
