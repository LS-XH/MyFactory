import type { ActionContext, ActionDefinition, ActionHandler, ActionId } from './actionTypes'

/** Extension point for selection, target and capability driven action buttons. */
export class ActionRegistry {
  private readonly definitions = new Map<ActionId, ActionDefinition>()
  private readonly handlers = new Map<ActionId, ActionHandler>()

  register(definition: ActionDefinition, handler?: ActionHandler) {
    this.definitions.set(definition.id, definition)
    if (handler) this.handlers.set(definition.id, handler)
  }

  resolve(context: ActionContext) {
    return [...this.definitions.values()].filter((definition) => definition.isAvailable(context))
  }

  execute(actionId: ActionId, context: ActionContext) {
    return this.handlers.get(actionId)?.(context)
  }
}

export const gameActionRegistry = new ActionRegistry()

