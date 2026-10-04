import { objectRepository } from '../../../domain/objects'
import { resolveObjectActionIcon } from '../../action-bar/objectActionIcons'
import { clipLineToView } from '../renderSpace'
import { MapTaskIcon } from './MapTaskIcon'
import type { PendingTargetAction, WorldPoint } from '../types'
import type { MapViewBounds } from '../../../domain/spaceMap'

type Props = {
  action: PendingTargetAction
  cursor: WorldPoint
  zoom: number
  renderOrigin: WorldPoint
  renderViewBox: MapViewBounds
  starPoints: Map<string, WorldPoint>
  lastTaskPoints: Map<string, WorldPoint>
  appendTask: boolean
  distanceAnchor?: WorldPoint | null
  markerRadius: number
}

export function TargetingGuide({ action, cursor, zoom, renderOrigin, renderViewBox, starPoints, lastTaskPoints, appendTask, distanceAnchor, markerRadius }: Props) {
  const Icon = resolveObjectActionIcon(action.id)
  const iconSize = 24 / zoom
  const localCursor = { x: cursor.x - renderOrigin.x, y: cursor.y - renderOrigin.y }
  const localAnchor = action.stage === 'distance' && distanceAnchor ? { x: distanceAnchor.x - renderOrigin.x, y: distanceAnchor.y - renderOrigin.y } : null
  const routeEnd = localAnchor && action.id !== 'warp-to' ? localAnchor : localCursor
  const radius = localAnchor ? Math.hypot(localCursor.x - localAnchor.x, localCursor.y - localAnchor.y) : 0
  return <g className="targeting-guide" pointerEvents="none">
    {action.actorIds.map(id => {
      const entity = objectRepository.get(id)
      const origin = starPoints.get(String(entity?.staticData.starId))
      if (!entity?.position || !origin) return null
      const from = appendTask ? lastTaskPoints.get(id) ?? { x: origin.x + entity.position.x, y: origin.y + entity.position.y } : { x: origin.x + entity.position.x, y: origin.y + entity.position.y }
      const line = clipLineToView({ x: from.x - renderOrigin.x, y: from.y - renderOrigin.y }, routeEnd, renderViewBox)
      return line ? <line key={id} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke="#9aa7b2" strokeWidth={1.3 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} opacity="0.8" /> : null
    })}
    {localAnchor && <>
      {action.id === 'orbit' && <circle cx={localAnchor.x} cy={localAnchor.y} r={radius} fill="none" stroke="#aebcc7" strokeWidth={1.2 / zoom} strokeDasharray={`${5 / zoom} ${4 / zoom}`} opacity="0.8" />}
      {(action.id === 'keep-distance' || action.id === 'warp-to') && <line x1={localAnchor.x} y1={localAnchor.y} x2={localCursor.x} y2={localCursor.y} stroke="#aebcc7" strokeWidth={1.3 / zoom} strokeDasharray={`${5 / zoom} ${4 / zoom}`} />}
      <g transform={`translate(${localAnchor.x} ${localAnchor.y})`}>
        <circle r={markerRadius} fill="#18323c" stroke="#d4e4ec" strokeWidth={1.5 / zoom} />
        <MapTaskIcon actionId={action.id} radius={markerRadius} color="#d4e4ec" />
      </g>
    </>}
    {localAnchor && action.id === 'warp-to' ? <g transform={`translate(${localCursor.x} ${localCursor.y})`}>
      <circle r={markerRadius} fill="#18323c" stroke="#ffffff" strokeWidth={1.5 / zoom} />
      <MapTaskIcon actionId={action.id} radius={markerRadius} color="#ffffff" />
    </g> : <circle cx={localCursor.x} cy={localCursor.y} r={3 / zoom} fill="#b5c0c9" />}
    {!localAnchor && <Icon x={routeEnd.x - iconSize / 2} y={routeEnd.y - 38 / zoom} size={iconSize} color="#c1cbd2" strokeWidth={1.8} />}
    {appendTask && <text x={routeEnd.x - (localAnchor ? markerRadius : iconSize / 2) - 7 / zoom} y={routeEnd.y - (localAnchor ? markerRadius * 0.5 : 21 / zoom)} textAnchor="middle" fill="#87efae" fontSize={19 / zoom} fontWeight="700">+</text>}
  </g>
}
