import { useGameStore } from '../../state/gameStore'

export function sortInventoryWithFeedback(objectId: string, notify: (message: string) => void) {
  const result = useGameStore.getState().sortInventory(objectId)
  notify(result.ok ? result.changed ? '相同物品已合并，并按物品定义顺序排列' : '物品栏已经有序' : result.reason ?? '无法整理物品栏')
}
