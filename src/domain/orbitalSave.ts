import { z } from 'zod'

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
const healthSchema = z.object({ shieldHp: z.number().nonnegative(), armorHp: z.number().nonnegative(), structureHp: z.number().nonnegative() })
const slotSizeSchema = z.enum(['S', 'M', 'L', 'XL', 'T'])
const slotGroupSchema = z.enum(['turretSlots', 'engineSlots', 'defenseSlots', 'utilitySlots', 'moduleSlots'])
const taskSchema = z.object({ id: z.string().min(1), actionId: z.literal('move'), targetId: z.string().optional(), destination: z.union([pointSchema, z.object({ objectId: z.string().min(1) })]), destinationStarId: z.string().optional() })

export const orbitalEntitySaveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['ship', 'station']),
  definitionId: z.string().min(1),
  name: z.string().min(1),
  starId: z.string().min(1),
  position: pointSchema,
  orbit: z.number().finite(),
  ownerFactionId: z.string().min(1),
  dockingCapacity: z.number().int().nonnegative().optional(),
  communicationDelayMs: z.number().nonnegative().optional(),
  status: z.string().optional(),
  health: healthSchema.optional(),
  damage: z.array(z.object({ equipmentId: z.string(), amount: z.number().nonnegative() })).optional(),
  installedEquipment: z.array(z.object({ group: slotGroupSchema, size: slotSizeSchema, index: z.number().int().nonnegative(), equipmentId: z.string() })).optional(),
  storage: z.object({ slots: z.array(z.object({ slot: z.number().int().nonnegative(), itemId: z.string().min(1), quantity: z.number().int().positive() })) }).optional(),
  tasks: z.array(taskSchema).optional(),
  movement: z.object({ destination: z.union([pointSchema, z.object({ objectId: z.string() })]).optional(), destinationStarId: z.string().optional(), velocity: pointSchema, headingDegrees: z.number().finite() }).optional()
})

export const orbitalSaveSchema = z.object({ schemaVersion: z.literal(1), entities: z.array(orbitalEntitySaveSchema).superRefine((entities, context) => {
  const ids = new Set<string>()
  for (const [index, entity] of entities.entries()) {
    if (ids.has(entity.id)) context.addIssue({ code: 'custom', path: [index, 'id'], message: `重复对象 ID: ${entity.id}` })
    ids.add(entity.id)
  }
}) })

export type OrbitalEntitySave = z.infer<typeof orbitalEntitySaveSchema>
export type OrbitalSave = z.infer<typeof orbitalSaveSchema>
