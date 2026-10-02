import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'

/** A place the user bookmarked from a destination page (spec §14 "Save"). Not part of a trip until added to one. */
export const savedPlaceSchema = z.object({ id: idSchema, userId: idSchema, placeId: idSchema, savedAt: isoDateTimeSchema })
export type SavedPlace = z.infer<typeof savedPlaceSchema>
