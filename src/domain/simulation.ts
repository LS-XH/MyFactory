import { content, type FactoryNodeState } from './content'

export class SimulationEngine {
  static step(nodes: FactoryNodeState[], speed: 0 | 1 | 2): FactoryNodeState[] {
    if (speed === 0) return nodes
    return nodes.map((node) => {
      const factory = content.factories.find((item) => item.id === node.factoryId)
      if (!factory) return node
      if (factory.id === 'ore-mine') return { ...node, buffer: Math.min(20, node.buffer + 0.015 * speed), progress: (node.progress + 0.007 * speed) % 1, status: 'online' }
      if (factory.id === 'refinery') { const ready = node.buffer >= 2; return { ...node, buffer: ready ? node.buffer - 0.015 * speed : node.buffer, progress: ready ? (node.progress + 0.006 * speed) % 1 : node.progress, status: ready ? 'online' : 'blocked' } }
      if (factory.id === 'storage') return { ...node, buffer: Math.min(240, node.buffer + 0.01 * speed), status: node.buffer > 220 ? 'blocked' : 'online' }
      return node
    })
  }
}
