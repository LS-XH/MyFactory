import { z } from 'zod'
import resourceTypesJson from '../../assets/legacy/resourceType.json'

const resourceTypeSchema = z.object({
  displayName: z.string().min(1),
  itemType: z.array(z.string()),
  itemState: z.array(z.string()),
  item: z.array(z.string()),
  probability: z.number().finite().nonnegative()
})

export type ResourceTypeDefinition = z.infer<typeof resourceTypeSchema>
export const resourceTypes: Record<string, ResourceTypeDefinition> = z.record(resourceTypeSchema).parse(resourceTypesJson)

export function getResourceTypeName(typeId: string) {
  return resourceTypes[typeId]?.displayName ?? typeId
}
