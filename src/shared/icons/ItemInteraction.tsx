import { createContext, useContext, type ReactNode } from 'react'

export type ItemInteraction = {
  selectedItemId: string | null
  selectItem: (itemId: string) => void
  openItemRecipes: (itemId: string) => void
}

const ItemInteractionContext = createContext<ItemInteraction | null>(null)

export function ItemInteractionProvider({ value, children }: { value: ItemInteraction; children: ReactNode }) {
  return <ItemInteractionContext.Provider value={value}>{children}</ItemInteractionContext.Provider>
}

export function useItemInteraction() {
  return useContext(ItemInteractionContext)
}
