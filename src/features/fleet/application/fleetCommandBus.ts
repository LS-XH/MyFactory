import type { FleetCommand } from '../domain/fleetTypes'

export type FleetCommandListener = (command: FleetCommand) => void

/** UI submits intent here; a later RTS simulation system can consume it. */
export class FleetCommandBus {
  private readonly listeners = new Set<FleetCommandListener>()

  subscribe(listener: FleetCommandListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispatch(command: FleetCommand) {
    this.listeners.forEach((listener) => listener(command))
  }
}

export const fleetCommandBus = new FleetCommandBus()

