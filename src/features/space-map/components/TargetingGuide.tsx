import { objectRepository } from '../../../domain/objects'
import { resolveObjectActionIcon } from '../../action-bar/objectActionIcons'
import type { PendingTargetAction, WorldPoint } from '../types'

type Props = {
  action: PendingTargetAction
  cursor: WorldPoint
  zoom: number
  starPoints: Map<string, WorldPoint>
  lastTaskPoints: Map<string, WorldPoint>
  appendTask: boolean
}

export function TargetingGuide({ action, cursor, zoom, starPoints, lastTaskPoints, appendTask }: Props) {
  const Icon = resolveObjectActionIcon(action.id)
  const iconSize = 24 / zoom
  return <g className="targeting-guide" pointerEvents="none">
    {action.actorIds.map(id => {
      const entity = objectRepository.get(id)
      const origin = starPoints.get(String(entity?.staticData.starId))
      if (!entity?.position || !origin) return null
      const from = appendTask ? lastTaskPoints.get(id) ?? { x: origin.x + entity.position.x, y: origin.y + entity.position.y } : { x: origin.x + entity.position.x, y: origin.y + entity.position.y }
      return <line key={id} x1={from.x} y1={from.y} x2={cursor.x} y2={cursor.y} stroke="#9aa7b2" strokeWidth={1.3 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} opacity="0.8" />
    })}
    <circle cx={cursor.x} cy={cursor.y} r={3 / zoom} fill="#b5c0c9" />
    <Icon x={cursor.x - iconSize / 2} y={cursor.y - 38 / zoom} size={iconSize} color="#c1cbd2" strokeWidth={1.8} />
    {appendTask && <text x={cursor.x - iconSize / 2 - 7 / zoom} y={cursor.y - 21 / zoom} textAnchor="middle" fill="#87efae" fontSize={19 / zoom} fontWeight="700">+</text>}
  </g>
}
