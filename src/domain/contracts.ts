import type { FactoryDefinition, FactoryEdgeState, FactoryNodeState } from './content'

export type EntityKind = 'ship' | 'station' | 'factory' | 'body'
export type CapabilityId = 'attack' | 'shipyard' | 'logistics' | 'mining' | 'production'

export type EntityDefinition = { id: string; displayName: string; kind: EntityKind; faction?: string; capabilities?: CapabilityId[] }
export type EntityInstance = { id: string; definitionId: string; kind: EntityKind; position?: { x: number; y: number }; installedEquipment: string[] }
export type Capability = { id: CapabilityId; label: string; actions: string[] }

export interface CapabilityProvider { getCapabilities(entity: EntityInstance): Capability[] }
export interface ActionResolver { getActions(context: { scene: 'system' | 'surface'; selected?: EntityInstance; targetId?: string }): string[] }
export interface ContentRepository { getFactory(id: string): FactoryDefinition | undefined; getAllFactories(): FactoryDefinition[] }
export type GameSaveV1 = { version: 1; scene: 'system' | 'surface'; nodes: FactoryNodeState[]; edges: FactoryEdgeState[]; savedAt: string }
