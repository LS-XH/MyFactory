import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { getStar } from '../../domain/spaceMap'
import { isPlayerControllable, objectRepository, TaskQueueCapability, type ObjectTask } from '../../domain/objects'
import { useGameStore } from '../../state/gameStore'
import './taskQueue.css'

function taskDescription(task: ObjectTask) {
  const target = task.targetId ? objectRepository.get(task.targetId) : undefined
  const starName = task.destinationStarId ? getStar(task.destinationStarId)?.displayName ?? task.destinationStarId : undefined
  const destination = target ? `${target.displayName}${starName ? ` · ${starName}` : ''}`
    : 'objectId' in task.destination ? task.destination.objectId
      : `${starName ? `${starName} · ` : ''}X ${task.destination.x.toFixed(1)} / Y ${task.destination.y.toFixed(1)}`
  if (task.actionId === 'orbit') return `${destination} · 半径 ${task.distanceKm?.toFixed(1) ?? '—'} km`
  if (task.actionId === 'keep-distance') return `${destination} · 偏移 X ${task.offsetKm?.x.toFixed(1) ?? '—'} / Y ${task.offsetKm?.y.toFixed(1) ?? '—'} km`
  if (task.actionId === 'warp-to') return `${destination} · 距离 ${(task.distanceKm ?? Math.hypot(task.offsetKm?.x ?? 0, task.offsetKm?.y ?? 0)).toFixed(1)} km · 偏移 X ${task.offsetKm?.x.toFixed(1) ?? '0.0'} / Y ${task.offsetKm?.y.toFixed(1) ?? '0.0'} km`
  return destination
}

const taskLabels: Record<ObjectTask['actionId'], string> = { move: '前往', orbit: '环绕', 'keep-distance': '保持距离', face: '朝向', 'warp-to': '跃迁到' }

export function TaskQueuePanel({ objectId, focusedTaskId }: { objectId: string; focusedTaskId?: string }) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const moveTask = useGameStore(state => state.moveObjectTask)
  const removeTask = useGameStore(state => state.removeObjectTask)
  const object = objectRepository.get(objectId)
  const tasks = object?.getCapability<TaskQueueCapability>('taskQueue')?.tasks ?? []
  const editable = isPlayerControllable(object)
  return <div className="task-queue-panel">
    <div className="task-queue-heading"><strong>任务队列</strong><span>{tasks.length} 项</span></div>
    {tasks.length === 0 ? <div className="task-queue-empty">暂无任务。下达移动任务后会显示在这里。</div> : <div className="task-queue-list">
      {tasks.map((task, index) => <div key={task.id} className={`task-queue-row${draggedId === task.id ? ' dragging' : ''}${focusedTaskId === task.id ? ' focused' : ''}`} draggable={editable} onDragStart={(event) => { setDraggedId(task.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', task.id) }} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => { if (editable) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); const id = draggedId ?? event.dataTransfer.getData('text/plain'); if (id) moveTask(objectId, id, index); setDraggedId(null) }}>
        <GripVertical className="task-queue-grip" size={14} aria-hidden="true" />
        <div className="task-queue-text"><span>{index === 0 ? '执行中' : `等待中 · ${index + 1}`}</span><strong>{taskLabels[task.actionId]}</strong><small title={taskDescription(task)}>{taskDescription(task)}</small></div>
        {editable && <div className="task-queue-controls"><button type="button" title="上移任务" aria-label="上移任务" disabled={index === 0} onClick={() => moveTask(objectId, task.id, index - 1)}><ArrowUp size={13} /></button><button type="button" title="下移任务" aria-label="下移任务" disabled={index === tasks.length - 1} onClick={() => moveTask(objectId, task.id, index + 1)}><ArrowDown size={13} /></button><button type="button" title="删除任务" aria-label="删除任务" onClick={() => removeTask(objectId, task.id)}><Trash2 size={13} /></button></div>}
      </div>)}
    </div>}
    <p>拖动任务可改变执行顺序。右键菜单点击任务或底部操作栏选择目标时，按住 Shift 可追加到队尾。</p>
  </div>
}
