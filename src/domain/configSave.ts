import { z } from 'zod'
import { DEFAULT_GAME_SETTINGS, GAME_SETTING_LIMITS } from '../config/gameplay'
import { isCameraKeyCode } from '../config/cameraControls'
import { SPACE_MAP_ZOOM, zoomLevelAfter, zoomLevelBefore } from '../config/spaceMapVisuals'

const finiteRange = (min: number, max: number) => z.number().finite().min(min).max(max)

export const gameSettingsSchema = z.object({
  orbitAnimation: z.boolean(),
  reduceMotion: z.boolean().default(DEFAULT_GAME_SETTINGS.reduceMotion),
  celestialNamesAlwaysVisible: z.boolean(),
  objectNamesAlwaysVisible: z.boolean(),
  orbitFps: finiteRange(GAME_SETTING_LIMITS.orbitFps.min, GAME_SETTING_LIMITS.orbitFps.max).int(),
  cameraKeyUp: z.string().refine(isCameraKeyCode).default(DEFAULT_GAME_SETTINGS.cameraKeyUp),
  cameraKeyLeft: z.string().refine(isCameraKeyCode).default(DEFAULT_GAME_SETTINGS.cameraKeyLeft),
  cameraKeyDown: z.string().refine(isCameraKeyCode).default(DEFAULT_GAME_SETTINGS.cameraKeyDown),
  cameraKeyRight: z.string().refine(isCameraKeyCode).default(DEFAULT_GAME_SETTINGS.cameraKeyRight),
  cameraMoveSpeed: finiteRange(GAME_SETTING_LIMITS.cameraMoveSpeed.min, GAME_SETTING_LIMITS.cameraMoveSpeed.max).default(DEFAULT_GAME_SETTINGS.cameraMoveSpeed),
  cameraBoostSpeed: finiteRange(GAME_SETTING_LIMITS.cameraBoostSpeed.min, GAME_SETTING_LIMITS.cameraBoostSpeed.max).default(DEFAULT_GAME_SETTINGS.cameraBoostSpeed),
  inventoryScale: finiteRange(GAME_SETTING_LIMITS.inventoryScale.min, GAME_SETTING_LIMITS.inventoryScale.max),
  movementArrivalToleranceAu: finiteRange(GAME_SETTING_LIMITS.movementArrivalToleranceAu.min, GAME_SETTING_LIMITS.movementArrivalToleranceAu.max).default(DEFAULT_GAME_SETTINGS.movementArrivalToleranceAu),
  kmToAu: finiteRange(GAME_SETTING_LIMITS.kmToAu.min, GAME_SETTING_LIMITS.kmToAu.max).default(DEFAULT_GAME_SETTINGS.kmToAu),
  starMapGridSpacingAu: finiteRange(GAME_SETTING_LIMITS.starMapGridSpacingAu.min, GAME_SETTING_LIMITS.starMapGridSpacingAu.max).default(DEFAULT_GAME_SETTINGS.starMapGridSpacingAu),
  starMapGridFadeStartZoom: finiteRange(GAME_SETTING_LIMITS.starMapGridFadeZoom.min, GAME_SETTING_LIMITS.starMapGridFadeZoom.max).default(DEFAULT_GAME_SETTINGS.starMapGridFadeStartZoom),
  starMapGridFadeEndZoom: finiteRange(GAME_SETTING_LIMITS.starMapGridFadeZoom.min, GAME_SETTING_LIMITS.starMapGridFadeZoom.max).default(DEFAULT_GAME_SETTINGS.starMapGridFadeEndZoom),
  objectFocusZoom: z.number().refine((zoom) => SPACE_MAP_ZOOM.levels.includes(zoom), '对象双击聚焦倍率必须为星图缩放档位').default(DEFAULT_GAME_SETTINGS.objectFocusZoom),
  starDisplayRadius: finiteRange(GAME_SETTING_LIMITS.displayRadius.min, GAME_SETTING_LIMITS.displayRadius.max),
  planetDisplayRadius: finiteRange(GAME_SETTING_LIMITS.displayRadius.min, GAME_SETTING_LIMITS.displayRadius.max),
  moonDisplayRadius: finiteRange(GAME_SETTING_LIMITS.displayRadius.min, GAME_SETTING_LIMITS.displayRadius.max),
  orbitalEntityDisplayRadius: finiteRange(GAME_SETTING_LIMITS.displayRadius.min, GAME_SETTING_LIMITS.displayRadius.max),
  overviewMarkerMinZoom: finiteRange(GAME_SETTING_LIMITS.overviewMarkerMinZoom.min, GAME_SETTING_LIMITS.overviewMarkerMinZoom.max),
  overviewFadeStartZoom: finiteRange(GAME_SETTING_LIMITS.starLayerTransitionZoom.min, GAME_SETTING_LIMITS.starLayerTransitionZoom.max).default(DEFAULT_GAME_SETTINGS.overviewFadeStartZoom),
  overviewFadeEndZoom: finiteRange(GAME_SETTING_LIMITS.starLayerTransitionZoom.min, GAME_SETTING_LIMITS.starLayerTransitionZoom.max).default(DEFAULT_GAME_SETTINGS.overviewFadeEndZoom),
  systemFadeStartZoom: finiteRange(GAME_SETTING_LIMITS.starLayerTransitionZoom.min, GAME_SETTING_LIMITS.starLayerTransitionZoom.max).default(DEFAULT_GAME_SETTINGS.systemFadeStartZoom),
  systemFadeEndZoom: finiteRange(GAME_SETTING_LIMITS.starLayerTransitionZoom.min, GAME_SETTING_LIMITS.starLayerTransitionZoom.max).default(DEFAULT_GAME_SETTINGS.systemFadeEndZoom),
  objectIconMinZoom: finiteRange(GAME_SETTING_LIMITS.objectIconZoom.min, GAME_SETTING_LIMITS.objectIconZoom.max),
  objectIconMaxZoom: finiteRange(GAME_SETTING_LIMITS.objectIconZoom.min, GAME_SETTING_LIMITS.objectIconZoom.max),
  surfaceCardCompactMaxZoom: finiteRange(GAME_SETTING_LIMITS.surfaceCardZoom.min, GAME_SETTING_LIMITS.surfaceCardZoom.max),
  surfaceCardDetailMinZoom: finiteRange(GAME_SETTING_LIMITS.surfaceCardZoom.min, GAME_SETTING_LIMITS.surfaceCardZoom.max),
  surfaceIconMinZoom: finiteRange(GAME_SETTING_LIMITS.surfaceCardZoom.min, GAME_SETTING_LIMITS.surfaceCardZoom.max).default(DEFAULT_GAME_SETTINGS.surfaceIconMinZoom),
  starAuLengthFactor: finiteRange(GAME_SETTING_LIMITS.auLengthFactor.min, GAME_SETTING_LIMITS.auLengthFactor.max),
  planetAuLengthFactor: finiteRange(GAME_SETTING_LIMITS.auLengthFactor.min, GAME_SETTING_LIMITS.auLengthFactor.max),
  moonAuLengthFactor: finiteRange(GAME_SETTING_LIMITS.auLengthFactor.min, GAME_SETTING_LIMITS.auLengthFactor.max)
}).superRefine((settings, context) => {
  const cameraKeys = [settings.cameraKeyUp, settings.cameraKeyLeft, settings.cameraKeyDown, settings.cameraKeyRight]
  if (new Set(cameraKeys).size !== cameraKeys.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['cameraKeyUp'], message: '视角移动快捷键不能重复' })
  if (settings.cameraBoostSpeed < settings.cameraMoveSpeed) context.addIssue({ code: z.ZodIssueCode.custom, path: ['cameraBoostSpeed'], message: '加速移动速度不能低于普通移动速度' })
  if (settings.overviewFadeStartZoom >= settings.overviewFadeEndZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['overviewFadeStartZoom'], message: '恒星系遮罩开始消失阈值必须低于完全消失阈值' })
  if (settings.systemFadeStartZoom >= settings.systemFadeEndZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['systemFadeStartZoom'], message: '恒星系开始出现阈值必须低于完全出现阈值' })
  if (settings.starMapGridFadeStartZoom >= settings.starMapGridFadeEndZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['starMapGridFadeStartZoom'], message: '圆点网格开始出现阈值必须低于完全出现阈值' })
  if (settings.objectIconMinZoom > settings.objectIconMaxZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['objectIconMinZoom'], message: '对象图标缩小阈值不能高于放大阈值' })
  if (settings.surfaceCardCompactMaxZoom + GAME_SETTING_LIMITS.surfaceCardZoom.gap > settings.surfaceCardDetailMinZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['surfaceCardCompactMaxZoom'], message: '设备卡片精简阈值必须低于详情阈值' })
  if (settings.surfaceIconMinZoom > settings.surfaceCardCompactMaxZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['surfaceIconMinZoom'], message: '地表图标缩小阈值不能高于图标切换阈值' })
})

export type GameSettings = z.infer<typeof gameSettingsSchema>
export const defaultGameSettings: GameSettings = DEFAULT_GAME_SETTINGS
export const gameSettingKeys = Object.keys(DEFAULT_GAME_SETTINGS) as (keyof GameSettings)[]

export const configSaveSchema = z.object({
  version: z.literal(1),
  settings: gameSettingsSchema
})

export type ConfigSaveV1 = z.infer<typeof configSaveSchema>

export function parseConfigSave(value: unknown): ConfigSaveV1 {
  if (!value || typeof value !== 'object') return configSaveSchema.parse(value)
  const settings = (value as { settings?: unknown }).settings
  if (!settings || typeof settings !== 'object') return configSaveSchema.parse(value)
  const legacy = settings as Record<string, unknown>
  const migrated: Record<string, unknown> = { ...legacy }
  if (!('surfaceIconMinZoom' in legacy)) {
    const compactMaxZoom = legacy.surfaceCardCompactMaxZoom
    migrated.surfaceIconMinZoom = typeof compactMaxZoom === 'number'
      ? Math.min(DEFAULT_GAME_SETTINGS.surfaceIconMinZoom, compactMaxZoom)
      : DEFAULT_GAME_SETTINGS.surfaceIconMinZoom
  }
  if (!('starMapGridFadeStartZoom' in legacy) && !('starMapGridFadeEndZoom' in legacy) && typeof legacy.starMapGridAppearZoom === 'number') {
    const endZoom = Math.max(GAME_SETTING_LIMITS.starMapGridFadeZoom.min, Math.min(GAME_SETTING_LIMITS.starMapGridFadeZoom.max, legacy.starMapGridAppearZoom))
    migrated.starMapGridFadeStartZoom = endZoom > GAME_SETTING_LIMITS.starMapGridFadeZoom.min ? zoomLevelBefore(endZoom) : endZoom
    migrated.starMapGridFadeEndZoom = endZoom > GAME_SETTING_LIMITS.starMapGridFadeZoom.min ? endZoom : zoomLevelAfter(endZoom)
  }
  return configSaveSchema.parse({ ...value, settings: migrated })
}

export function createConfigSave(settings: GameSettings): ConfigSaveV1 {
  return { version: 1, settings: gameSettingsSchema.parse(settings) }
}
