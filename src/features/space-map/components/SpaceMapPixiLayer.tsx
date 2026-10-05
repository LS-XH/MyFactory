import { useLayoutEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Application, Container, FillGradient, Graphics, Sprite, Texture } from 'pixi.js'
import { overviewGlowGradientOffset, SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import { resolveStarTypeVisual } from '../../../config/starTypeVisuals'
import { resolvePlanetTypeColor } from '../../../config/planetTypeVisuals'
import type { MapViewBounds } from '../../../domain/spaceMap'
import { EntityIcon } from '../../../shared/icons/EntityIcon'
import { resolveEntityVisualColor } from '../../../shared/icons/entityVisualRegistry'

export type PixiStar = {
  id: string
  x: number
  y: number
  type?: string
  overviewRadius: number
  coreRadius: number
  overviewOpacity: number
  systemOpacity: number
  selected: boolean
  hovered: boolean
}

export type PixiBody = {
  x: number
  y: number
  radius: number
  depth: number
  planetType?: string
  selected: boolean
  hovered: boolean
}

export type PixiOrbit = { id: string; x: number; y: number; radius: number; depth: number }
export type PixiEntity = { id: string; x: number; y: number; radius: number; rotation: number; kind: 'ship' | 'station'; definitionId?: string; ownerFactionId?: string; selected: boolean; hovered: boolean }

type Scene = {
  view: MapViewBounds
  width: number
  height: number
  zoom: number
  stars: PixiStar[]
  bodies: PixiBody[]
  orbits: PixiOrbit[]
  entities: PixiEntity[]
  systemOpacity: number
}

type SceneColors = { orbit: string; planet: string; moon: string; selected: string; hover: string; entity: string; variables: Map<string, string> }

function readSceneColors(): SceneColors {
  const style = getComputedStyle(document.documentElement)
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    orbit: color('--color-orbit', 'rgba(255,255,255,.32)'),
    planet: color('--color-planet', '#f2a65a'),
    moon: color('--color-moon', '#d8e1e8'),
    selected: color('--color-selected-frame', '#fff'),
    hover: color('--color-hover-frame', 'rgba(255,255,255,.55)'),
    entity: color('--color-entity', '#53d5c4'),
    variables: new Map()
  }
}

function drawCorner(graphics: Graphics, x: number, y: number, half: number, corner: number, color: string, alpha = 1) {
  const left = x - half, right = x + half, top = y - half, bottom = y + half
  graphics.moveTo(left + corner, top).lineTo(left, top).lineTo(left, top + corner)
    .moveTo(right - corner, top).lineTo(right, top).lineTo(right, top + corner)
    .moveTo(left, bottom - corner).lineTo(left, bottom).lineTo(left + corner, bottom)
    .moveTo(right, bottom - corner).lineTo(right, bottom).lineTo(right - corner, bottom)
    .stroke({ color, width: 1.2, alpha })
}

type SceneGraphics = { orbits: Container; stars: Container; bodies: Graphics }
type CachedStar = { base: Graphics; system?: Graphics; frame?: Graphics; key: string; systemKey: string; frameKey: string }
type CachedOrbit = { graphics: Graphics; key: string }
type CachedGradient = { gradient: FillGradient; size: number }
// Pixi tessellates circles from their local radius before transforms are applied.
function starGeometryRadius(screenRadius: number) {
  return screenRadius > 64 ? 64 : screenRadius > 16 ? 32 : screenRadius > 4 ? 16 : 4
}

function updateOrbits(layer: Container, scene: Scene, cache: Map<string, CachedOrbit>, colors: SceneColors) {
  if (scene.view.width <= 0 || scene.width <= 0) return
  if (scene.orbits.length === 0 && cache.size === 0) return
  const scale = scene.width / scene.view.width
  const color = colors.orbit
  const used = new Set<string>()
  layer.alpha = scene.systemOpacity
  for (const orbit of scene.orbits) {
    const radius = orbit.radius * scale
    if (radius <= 0) continue
    const key = `${radius}:${orbit.depth}:${color}`
    let cached = cache.get(orbit.id)
    if (!cached) {
      cached = { graphics: new Graphics(), key: '' }
      cache.set(orbit.id, cached)
      layer.addChild(cached.graphics)
    }
    if (cached.key !== key) {
      cached.graphics.clear()
      const dash = orbit.depth === 0 ? 5 : 2
      const gap = orbit.depth === 0 ? 7 : 4
      const segments = Math.min(4096, Math.max(12, Math.floor(Math.PI * 2 * radius / (dash + gap))))
      for (let index = 0; index < segments; index += 1) {
        const start = index * Math.PI * 2 / segments
        const end = start + dash / (dash + gap) * Math.PI * 2 / segments
        cached.graphics.moveTo(Math.cos(start) * radius, Math.sin(start) * radius).arc(0, 0, radius, start, end)
      }
      cached.graphics.stroke({ color, width: orbit.depth === 0 ? 1.2 : 1 })
      cached.key = key
    }
    cached.graphics.position.set((orbit.x - scene.view.x) * scale, (orbit.y - scene.view.y) * scale)
    used.add(orbit.id)
  }
  for (const [id, cached] of cache) {
    if (used.has(id)) continue
    layer.removeChild(cached.graphics)
    cached.graphics.destroy()
    cache.delete(id)
  }
}

function gradientTextureSize(diameter: number, resolution: number) {
  const pixels = Math.max(256, Math.ceil(diameter * resolution))
  return Math.min(1024, 2 ** Math.ceil(Math.log2(pixels)))
}

function drawScene(layers: SceneGraphics, scene: Scene, gradients: Map<string, CachedGradient>, stars: Map<string, CachedStar>, resolution: number, colors: SceneColors, previous: { stars: PixiStar[]; scale: number; resolution: number; colors: SceneColors } | null) {
  const { view, width, height, zoom } = scene
  if (width <= 0 || height <= 0 || view.width <= 0 || view.height <= 0) return
  const scale = width / view.width
  const toX = (x: number) => (x - view.x) * scale
  const toY = (y: number) => (y - view.y) * scale
  const planetColor = colors.planet
  const moonColor = colors.moon
  const selectedColor = colors.selected
  const hoverColor = colors.hover
  layers.bodies.alpha = scene.systemOpacity
  layers.stars.position.set(-view.x * scale, -view.y * scale)
  if (previous?.stars !== scene.stars || previous.scale !== scale || previous.resolution !== resolution || previous.colors !== colors) {
  const neededGradients = new Map<string, number>()
  for (const star of scene.stars) {
    if (star.overviewOpacity <= 0) continue
    const key = star.type ?? 'default'
    const diameter = star.overviewRadius * SPACE_MAP_VISUAL.overviewGlowRadiusScale * scale * 2
    neededGradients.set(key, Math.max(neededGradients.get(key) ?? 0, gradientTextureSize(diameter, resolution)))
  }
  for (const [key, cached] of gradients) {
    if (neededGradients.get(key) === cached.size) continue
    cached.gradient.destroy()
    gradients.delete(key)
  }
  for (const [key, size] of neededGradients) {
    if (gradients.has(key)) continue
    const visual = resolveStarTypeVisual(key)
    const coreOffset = overviewGlowGradientOffset(SPACE_MAP_VISUAL.overviewCoreRadiusFraction)
    const gradient = new FillGradient({
      type: 'radial', textureSpace: 'local', textureSize: size,
      center: { x: 0.5, y: 0.5 }, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: `${visual.glowColor}00` },
        { offset: coreOffset, color: `${visual.glowColor}00` },
        ...SPACE_MAP_VISUAL.overviewGradient.filter(stop => stop.region === 'glow').map(stop => ({
          offset: overviewGlowGradientOffset(stop.offset),
          color: `${visual.glowColor}${Math.round(stop.opacity * 255).toString(16).padStart(2, '0')}`
        }))
      ]
    })
    gradients.set(key, { gradient, size })
  }
  const usedStars = new Set<string>()
  const orderedStars: Graphics[] = []
  for (const star of scene.stars) {
    let cached = stars.get(star.id)
    if (!cached) {
      const base = new Graphics()
      cached = { base, key: '', systemKey: '', frameKey: '' }
      stars.set(star.id, cached)
      layers.stars.addChild(base)
    }
    cached.base.position.set(star.x * scale, star.y * scale)
    const gradientSize = gradients.get(star.type ?? 'default')?.size ?? 0
    const overviewGeometryRadius = starGeometryRadius(star.overviewRadius * SPACE_MAP_VISUAL.overviewGlowRadiusScale * scale)
    const key = `${star.type}:${gradientSize}:${overviewGeometryRadius}`
    if (cached.key !== key) {
      cached.base.clear()
      cached.key = key
      const visual = resolveStarTypeVisual(star.type)
      if (gradientSize) cached.base.circle(0, 0, overviewGeometryRadius * SPACE_MAP_VISUAL.overviewGlowRadiusScale).fill({ fill: gradients.get(star.type ?? 'default')!.gradient })
      cached.base.circle(0, 0, overviewGeometryRadius * SPACE_MAP_VISUAL.overviewCoreRadiusFraction).fill({ color: visual.coreColor })
    }
    cached.base.scale.set(star.overviewRadius * scale / overviewGeometryRadius)
    cached.base.alpha = star.overviewOpacity
    cached.base.visible = star.overviewOpacity > 0
    if (star.systemOpacity > 0) {
      if (!cached.system) {
        cached.system = new Graphics()
        layers.stars.addChild(cached.system)
      }
      const systemGeometryRadius = starGeometryRadius(star.coreRadius * scale)
      const systemKey = `${star.type ?? 'default'}:${systemGeometryRadius}`
      if (cached.systemKey !== systemKey) {
        cached.system.clear().circle(0, 0, systemGeometryRadius).fill({ color: resolveStarTypeVisual(star.type).coreColor })
        cached.systemKey = systemKey
      }
      cached.system.position.set(star.x * scale, star.y * scale)
      cached.system.scale.set(star.coreRadius * scale / systemGeometryRadius)
      cached.system.alpha = star.systemOpacity
    } else if (cached.system) {
      layers.stars.removeChild(cached.system)
      cached.system.destroy()
      cached.system = undefined
      cached.systemKey = ''
    }
    if (star.selected || star.hovered) {
      if (!cached.frame) {
        cached.frame = new Graphics()
        layers.stars.addChild(cached.frame)
      }
    } else if (cached.frame) {
      layers.stars.removeChild(cached.frame)
      cached.frame.destroy()
      cached.frame = undefined
      cached.frameKey = ''
    }
    const frameKey = `${scale}:${zoom}:${star.overviewRadius}:${star.coreRadius}:${star.overviewOpacity}:${star.systemOpacity}:${star.selected}:${star.hovered}:${selectedColor}:${hoverColor}`
    if (cached.frame && cached.frameKey !== frameKey) {
      cached.frame.position.set(star.x * scale, star.y * scale)
      cached.frame.clear()
      cached.frameKey = frameKey
      if (star.overviewOpacity > 0) drawCorner(cached.frame, 0, 0, star.overviewRadius * scale + SPACE_MAP_VISUAL.overviewCornerPadding * scale / zoom, SPACE_MAP_VISUAL.overviewCornerLength * scale / zoom, star.selected ? selectedColor : hoverColor, star.overviewOpacity)
      if (star.systemOpacity > 0) drawCorner(cached.frame, 0, 0, star.coreRadius * scale + SPACE_MAP_VISUAL.starCornerPadding * scale / zoom, SPACE_MAP_VISUAL.starCornerLength * scale / zoom, star.selected ? selectedColor : hoverColor, star.systemOpacity)
    }
    else if (cached.frame) cached.frame.position.set(star.x * scale, star.y * scale)
    usedStars.add(star.id)
    orderedStars.push(cached.base)
    if (cached.system) orderedStars.push(cached.system)
    if (cached.frame) orderedStars.push(cached.frame)
  }
  for (const [id, cached] of stars) {
    if (usedStars.has(id)) continue
    layers.stars.removeChild(cached.base)
    cached.base.destroy()
    if (cached.system) {
      layers.stars.removeChild(cached.system)
      cached.system.destroy()
    }
    if (cached.frame) {
      layers.stars.removeChild(cached.frame)
      cached.frame.destroy()
    }
    stars.delete(id)
  }
  for (let index = 0; index < orderedStars.length; index += 1) {
    if (layers.stars.children[index] !== orderedStars[index]) layers.stars.setChildIndex(orderedStars[index], index)
  }
  }

  const graphics = layers.bodies
  if (scene.bodies.length === 0 && graphics.context.instructions.length === 0) return
  graphics.clear()
  for (const body of scene.bodies) {
    const x = toX(body.x), y = toY(body.y), radius = body.radius * scale
    graphics.circle(x, y, radius).fill({ color: resolvePlanetTypeColor(body.planetType, body.depth === 0 ? planetColor : moonColor) })
    if (body.selected || body.hovered) drawCorner(graphics, x, y, radius + SPACE_MAP_VISUAL.bodyCornerPadding * scale / zoom, SPACE_MAP_VISUAL.bodyCornerLength * scale / zoom, body.selected ? selectedColor : hoverColor)
  }
}

type CachedIcon = { sprite: Sprite }

const displayResolution = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1))

function iconTextureSize(displaySize: number, resolution: number) {
  const pixels = Math.max(96, Math.ceil(displaySize * resolution))
  return Math.min(2048, 2 ** Math.ceil(Math.log2(pixels)))
}

function updateEntities(layer: Container, scene: Scene, resolution: number, icons: Map<string, CachedIcon>, textures: Map<string, Texture>, pending: Set<string>, onTextureReady: () => void, colors: SceneColors) {
  if (scene.entities.length === 0 && icons.size === 0) return
  const scale = scene.width / scene.view.width
  const used = new Set<string>()
  for (const entity of scene.entities) {
    const size = entity.radius * 2 * scale
    const textureSize = iconTextureSize(size, resolution)
    const visualColor = resolveEntityVisualColor(entity.kind, entity.ownerFactionId, entity.definitionId)
    const variable = /^var\((--[^)]+)\)$/.exec(visualColor)?.[1]
    let color = visualColor
    if (variable) {
      if (!colors.variables.has(variable)) colors.variables.set(variable, getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || colors.entity)
      color = colors.variables.get(variable)!
    }
    const key = `${entity.kind}:${entity.definitionId ?? ''}:${color}:${textureSize}`
    if (!textures.has(key) && !pending.has(key)) {
      pending.add(key)
      const markup = renderToStaticMarkup(<EntityIcon kind={entity.kind} definitionId={entity.definitionId} ownerFactionId={entity.ownerFactionId} size={textureSize} />)
        .replaceAll(visualColor, color).replaceAll('currentColor', color)
      const standaloneSvg = markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      const image = new Image()
      image.onload = () => {
        if (!layer.parent) { pending.delete(key); return }
        textures.set(key, Texture.from(image))
        pending.delete(key)
        onTextureReady()
      }
      image.onerror = () => { console.error(`无法加载轨道对象图标: ${key}`); if (layer.parent) textures.set(key, Texture.EMPTY); pending.delete(key) }
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneSvg)}`
    }
    let icon = icons.get(entity.id)
    if (!icon) {
      const sprite = new Sprite(textures.get(key) ?? Texture.EMPTY)
      sprite.anchor.set(0.5)
      layer.addChild(sprite)
      icon = { sprite }
      icons.set(entity.id, icon)
    }
    const texture = textures.get(key)
    if (texture && icon.sprite.texture !== texture) {
      icon.sprite.texture = texture
    }
    icon.sprite.position.set((entity.x - scene.view.x) * scale, (entity.y - scene.view.y) * scale)
    icon.sprite.width = size
    icon.sprite.height = size
    icon.sprite.rotation = entity.rotation * Math.PI / 180
    used.add(entity.id)
  }
  for (const [id, icon] of icons) {
    if (used.has(id)) continue
    layer.removeChild(icon.sprite)
    icon.sprite.destroy()
    icons.delete(id)
  }
}

function trimTextureCache(textures: Map<string, Texture>, icons: Map<string, CachedIcon>) {
  if (textures.size <= 24) return
  const active = new Set([...icons.values()].map(({ sprite }) => sprite.texture))
  for (const [key, texture] of textures) {
    if (textures.size <= 24) break
    if (active.has(texture)) continue
    textures.delete(key)
    if (texture !== Texture.EMPTY) texture.destroy()
  }
}

export function SpaceMapPixiLayer(scene: Scene) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const graphicsRef = useRef<SceneGraphics | null>(null)
  const starCacheRef = useRef(new Map<string, CachedStar>())
  const orbitCacheRef = useRef(new Map<string, CachedOrbit>())
  const entityLayerRef = useRef<Container | null>(null)
  const iconsRef = useRef(new Map<string, CachedIcon>())
  const texturesRef = useRef(new Map<string, Texture>())
  const pendingTexturesRef = useRef(new Set<string>())
  const sceneRef = useRef(scene)
  const gradientsRef = useRef(new Map<string, CachedGradient>())
  const colorsRef = useRef<SceneColors | null>(null)
  const previousStarsRef = useRef<{ stars: PixiStar[]; scale: number; resolution: number; colors: SceneColors } | null>(null)
  sceneRef.current = scene
  const markReadyTextures = () => {
    if (!hostRef.current) return
    hostRef.current.dataset.readyIcons = String([...texturesRef.current.values()].filter((texture) => texture !== Texture.EMPTY).length)
    hostRef.current.dataset.activeIconPixels = String(Math.max(0, ...[...iconsRef.current.values()].map(({ sprite }) => sprite.texture.width)))
  }
  const refreshEntities = () => {
    const app = appRef.current, layer = entityLayerRef.current
    if (!app || !layer) return
    updateEntities(layer, sceneRef.current, app.renderer.resolution, iconsRef.current, texturesRef.current, pendingTexturesRef.current, refreshEntities, colorsRef.current ??= readSceneColors())
    trimTextureCache(texturesRef.current, iconsRef.current)
    markReadyTextures()
    app.render()
  }

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    let app: Application | null = null
    let cancelled = false
    const start = requestAnimationFrame(() => {
      app = new Application()
      const instance = app
      void instance.init({ width: Math.max(1, sceneRef.current.width), height: Math.max(1, sceneRef.current.height), resolution: displayResolution(), autoDensity: true, backgroundAlpha: 0, antialias: true, autoStart: false, preference: 'webgl' }).then(() => {
      if (cancelled) { instance.destroy(true); return }
      const graphics = { orbits: new Container(), stars: new Container(), bodies: new Graphics() }
      const entityLayer = new Container()
      instance.stage.addChild(graphics.orbits, graphics.stars, graphics.bodies)
      instance.stage.addChild(entityLayer)
      instance.canvas.setAttribute('aria-hidden', 'true')
      host.appendChild(instance.canvas)
      appRef.current = instance
      graphicsRef.current = graphics
      entityLayerRef.current = entityLayer
      const colors = colorsRef.current ??= readSceneColors()
      updateOrbits(graphics.orbits, sceneRef.current, orbitCacheRef.current, colors)
      drawScene(graphics, sceneRef.current, gradientsRef.current, starCacheRef.current, instance.renderer.resolution, colors, previousStarsRef.current)
      previousStarsRef.current = { stars: sceneRef.current.stars, scale: sceneRef.current.width / sceneRef.current.view.width, resolution: instance.renderer.resolution, colors }
      refreshEntities()
    })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(start)
      appRef.current = null
      graphicsRef.current = null
      for (const cached of starCacheRef.current.values()) {
        cached.base.destroy()
        cached.system?.destroy()
        cached.frame?.destroy()
      }
      starCacheRef.current.clear()
      previousStarsRef.current = null
      for (const cached of orbitCacheRef.current.values()) cached.graphics.destroy()
      orbitCacheRef.current.clear()
      entityLayerRef.current = null
      iconsRef.current.clear()
      for (const texture of texturesRef.current.values()) if (texture !== Texture.EMPTY) texture.destroy()
      texturesRef.current.clear()
      pendingTexturesRef.current.clear()
      for (const cached of gradientsRef.current.values()) cached.gradient.destroy()
      gradientsRef.current.clear()
      if (app?.renderer) app.destroy(true)
    }
  }, [])

  useLayoutEffect(() => {
    const refreshTheme = () => {
      colorsRef.current = readSceneColors()
      const app = appRef.current, graphics = graphicsRef.current
      if (!app || !graphics) return
      updateOrbits(graphics.orbits, sceneRef.current, orbitCacheRef.current, colorsRef.current)
      drawScene(graphics, sceneRef.current, gradientsRef.current, starCacheRef.current, app.renderer.resolution, colorsRef.current, previousStarsRef.current)
      previousStarsRef.current = { stars: sceneRef.current.stars, scale: sceneRef.current.width / sceneRef.current.view.width, resolution: app.renderer.resolution, colors: colorsRef.current }
      refreshEntities()
    }
    const observer = new MutationObserver(refreshTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', refreshTheme)
    return () => { observer.disconnect(); media.removeEventListener('change', refreshTheme) }
  }, [])

  useLayoutEffect(() => {
    const app = appRef.current, graphics = graphicsRef.current
    if (!app || !graphics) return
    const width = Math.max(1, scene.width), height = Math.max(1, scene.height)
    const resolution = displayResolution()
    if (app.screen.width !== width || app.screen.height !== height || app.renderer.resolution !== resolution) app.renderer.resize(width, height, resolution)
    const colors = colorsRef.current ??= readSceneColors()
    updateOrbits(graphics.orbits, scene, orbitCacheRef.current, colors)
    drawScene(graphics, scene, gradientsRef.current, starCacheRef.current, app.renderer.resolution, colors, previousStarsRef.current)
    previousStarsRef.current = { stars: scene.stars, scale: scene.width / scene.view.width, resolution: app.renderer.resolution, colors }
    refreshEntities()
  })

  return <div ref={hostRef} className="space-map-pixi-layer" aria-hidden="true" data-ready-icons="0" data-active-icon-pixels="0" />
}
