import { content } from '../../domain/content'
import type { OrbitalEntityDefinition } from './types'

/** Temporary catalog adapter. Runtime instances can later move to the fleet store. */
export const orbitalEntities = content.starSystem.entities as OrbitalEntityDefinition[]

