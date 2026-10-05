import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { getSmoothStepPath, Position, type Edge } from '@xyflow/react'
import { Application, Graphics, Text } from 'pixi.js'

export type SurfacePixiHandle = { redraw: () => void }

type Props = {
  canvas: React.RefObject<HTMLDivElement>
  edges: Edge[]
  zoom: () => number
}

type Point = { x: number; y: number }
type Route = { color: string; length: number; points: Point[] }

const displayResolution = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1))

function samplePath(path: string): Pick<Route, 'length' | 'points'> {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  element.setAttribute('d', path)
  const length = element.getTotalLength()
  const points: Point[] = []
  for (let distance = 0; distance < length; distance += 2) {
    const point = element.getPointAtLength(distance)
    points.push({ x: point.x, y: point.y })
  }
  const end = element.getPointAtLength(length)
  points.push({ x: end.x, y: end.y })
  return { length, points }
}

function routePoint(route: Route, distance: number): Point {
  const index = Math.min(Math.floor(distance / 2), route.points.length - 2)
  const fraction = (distance - index * 2) / Math.min(2, route.length - index * 2)
  const start = route.points[index], end = route.points[index + 1]
  return { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction }
}

const portCenter = (node: HTMLElement, handleId: string | null | undefined, host: DOMRect) => {
  const handles = [...node.querySelectorAll<HTMLElement>('.react-flow__handle')]
  const handle = handles.find((item) => item.dataset.handleid === handleId)
  if (!handle || getComputedStyle(handle).visibility === 'hidden') return null
  const bounds = handle.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  return { x: bounds.left + bounds.width / 2 - host.left, y: bounds.top + bounds.height / 2 - host.top }
}

export const SurfacePixiLayer = forwardRef<SurfacePixiHandle, Props>(function SurfacePixiLayer({ canvas, edges, zoom }, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const graphicsRef = useRef<{ lines: Graphics; backgrounds: Graphics } | null>(null)
  const labelRef = useRef(new Map<string, Text>())
  const routesRef = useRef<Route[]>([])
  const animationRef = useRef<number | null>(null)
  const propsRef = useRef({ canvas, edges, zoom })
  const pendingRef = useRef<number | null>(null)
  const lastDrawKeyRef = useRef('')
  propsRef.current = { canvas, edges, zoom }

  const renderLines = (now: number) => {
    const app = appRef.current, lines = graphicsRef.current?.lines
    if (!app || !lines) return
    const scale = propsRef.current.zoom()
    const dash = Math.max(1, 5 * scale), period = dash * 2
    const phase = (now / 500 * period) % period
    lines.clear()
    for (const route of routesRef.current) {
      for (let position = -phase; position < route.length; position += period) {
        const start = Math.max(0, position), end = Math.min(route.length, position + dash)
        if (end <= start) continue
        const first = routePoint(route, start)
        lines.moveTo(first.x, first.y)
        for (let at = start + 2; at < end; at += 2) {
          const point = routePoint(route, at)
          lines.lineTo(point.x, point.y)
        }
        const last = routePoint(route, end)
        lines.lineTo(last.x, last.y)
      }
      lines.stroke({ color: route.color, width: 2 * scale })
    }
    app.render()
  }

  const animate = (now: number) => {
    animationRef.current = null
    renderLines(now)
    if (routesRef.current.length) animationRef.current = requestAnimationFrame(animate)
  }

  const draw = () => {
    const app = appRef.current, graphics = graphicsRef.current
    const surface = propsRef.current.canvas.current
    if (!app || !graphics || !surface) return
    const host = surface.getBoundingClientRect()
    const nodeById = new Map([...surface.querySelectorAll<HTMLElement>('.react-flow__node')].map(node => [node.dataset.id, node]))
    const scale = propsRef.current.zoom()
    const routes = propsRef.current.edges.flatMap((edge) => {
      const source = nodeById.get(edge.source), target = nodeById.get(edge.target)
      if (!source || !target) return []
      const from = portCenter(source, edge.sourceHandle, host)
      const to = portCenter(target, edge.targetHandle, host)
      if (!from || !to) return []
      const color = String(edge.style?.stroke ?? '#59d6c4')
      const [path, labelX, labelY] = getSmoothStepPath({ sourceX: from.x, sourceY: from.y, sourcePosition: Position.Right, targetX: to.x, targetY: to.y, targetPosition: Position.Left, borderRadius: 5 * scale })
      return [{ edge, color, path, labelX, labelY }]
    })
    const resolution = displayResolution()
    const drawKey = `${host.width}:${host.height}:${scale}:${resolution}:${routes.map(({ edge, color, path }) => `${edge.id}:${color}:${path}:${String(edge.label ?? '')}`).join('|')}`
    if (lastDrawKeyRef.current === drawKey) return
    lastDrawKeyRef.current = drawKey
    app.renderer.resize(Math.max(1, host.width), Math.max(1, host.height), resolution)
    graphics.backgrounds.clear()
    routesRef.current = routes.map(({ color, path }) => ({ color, ...samplePath(path) }))
    const used = new Set<string>()
    const labels: Text[] = []
    for (const { edge, labelX, labelY } of routes) {
      if (!edge.label) continue
      let label = labelRef.current.get(edge.id)
      if (!label) {
        label = new Text({ text: String(edge.label), style: { fontFamily: 'DM Mono', fontSize: 10, fill: '#a9bad0' } })
        label.anchor.set(0.5)
        app.stage.addChild(label)
        labelRef.current.set(edge.id, label)
      }
      label.text = String(edge.label)
      label.position.set(labelX, labelY)
      label.scale.set(scale)
      labels.push(label)
      used.add(edge.id)
    }
    for (const label of labels) graphics.backgrounds.rect(label.x - label.width / 2 - 2 * scale, label.y - label.height / 2 - scale, label.width + 4 * scale, label.height + 2 * scale).fill({ color: '#0c131d', alpha: 0.92 })
    for (const [id, label] of labelRef.current) {
      if (used.has(id)) continue
      app.stage.removeChild(label)
      label.destroy()
      labelRef.current.delete(id)
    }
    renderLines(performance.now())
    if (animationRef.current === null && routesRef.current.length) animationRef.current = requestAnimationFrame(animate)
  }

  const redraw = () => {
    if (pendingRef.current !== null) return
    pendingRef.current = requestAnimationFrame(() => { pendingRef.current = null; draw() })
  }
  useImperativeHandle(ref, () => ({ redraw }))

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    let app: Application | null = null
    let cancelled = false
    const start = requestAnimationFrame(() => {
      app = new Application()
      const instance = app
      void instance.init({ width: 1, height: 1, resolution: displayResolution(), autoDensity: true, backgroundAlpha: 0, antialias: true, autoStart: false, preference: 'webgl' }).then(() => {
      if (cancelled) { instance.destroy(true); return }
      const graphics = { lines: new Graphics(), backgrounds: new Graphics() }
      instance.stage.addChild(graphics.lines, graphics.backgrounds)
      instance.canvas.setAttribute('aria-hidden', 'true')
      host.appendChild(instance.canvas)
      appRef.current = instance
      graphicsRef.current = graphics
      redraw()
    })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(start)
      if (pendingRef.current !== null) cancelAnimationFrame(pendingRef.current)
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      pendingRef.current = null
      animationRef.current = null
      lastDrawKeyRef.current = ''
      routesRef.current = []
      appRef.current = null
      graphicsRef.current = null
      labelRef.current.clear()
      if (app?.renderer) app.destroy(true)
    }
  }, [])

  useLayoutEffect(redraw)
  return <div ref={hostRef} className="surface-pixi-layer" aria-hidden="true" />
})
