import { createContext, useContext } from 'react'
import type { AIService } from './ai/types'
import type { AuthService } from './auth/types'
import type { BookingService } from './bookings/types'
import type { GeolocationService } from './geolocation/geolocation'
import type { MapService } from './maps/types'
import type { NotificationService } from './notifications/types'
import type { StorageService } from './storage/types'
import type { WeatherService } from './weather/types'
import { catalogueFor } from '@/features/ai/catalogue'
import { createAiClient } from './ai/client'
import { aiService } from './ai/mock'
import { env } from '@/config/env'
import { lazyAuthService } from './auth/lazy'
import { authService } from './auth/mock'
import { bookingService } from './bookings/mock'
import { geolocationService } from './geolocation/geolocation'
import { mapService } from './maps/mock'
import { osrmRouting } from './maps/osrm'
import { notificationService } from './notifications/mock'
import { lazyStorageService } from './storage/lazy'
import { FIRESTORE_MEDIA_LIMITS } from './storage/limits'
import { storageService } from './storage/mock'
import { weatherService } from './weather/mock'
import { openMeteoWeather } from './weather/openMeteo'

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
const authAdapter = env.backend === 'firebase' ? lazyAuthService(async () => (await import('./auth/firebase')).firebaseAuthService) : authService

export const defaultServices: Services = {
  ai: env.ai === 'live' ? createAiClient({ getToken: () => authAdapter.idToken(), catalogue: catalogueFor }) : aiService,
  maps: env.routing === 'live' ? { ...mapService, routing: osrmRouting } : mapService,
  bookings: bookingService,
  weather: env.weather === 'live' ? openMeteoWeather : weatherService,
  auth: authAdapter,
  storage: env.backend === 'firebase' ? lazyStorageService(async () => (await import('./storage/firestoreMedia')).firestoreMediaService, FIRESTORE_MEDIA_LIMITS) : storageService, notifications: notificationService, geolocation: geolocationService,
}

export const ServicesContext = createContext<Services>(defaultServices)

export const useServices = () => useContext(ServicesContext)
