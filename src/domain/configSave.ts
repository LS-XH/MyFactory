import { z } from 'zod'
import { DEFAULT_GAME_SETTINGS, GAME_SETTING_LIMITS } from '../config/gameplay'

const finiteRange = (min: number, max: number) => z.number().finite().min(min).max(max)

export const gameSettingsSchema = z.object({
  orbitAnimation: z.boolean(),
  celestialNamesAlwaysVisible: z.boolean(),
  objectNamesAlwaysVisible: z.boolean(),
  orbitFps: finiteRange(GAME_SETTING_LIMITS.orbitFps.min, GAME_SETTING_LIMITS.orbitFps.max).int(),
  inventoryScale: finiteRange(GAME_SETTING_LIMITS.inventoryScale.min, GAME_SETTING_LIMITS.inventoryScale.max),
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
  if (settings.overviewFadeStartZoom >= settings.overviewFadeEndZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['overviewFadeStartZoom'], message: '恒星系遮罩开始消失阈值必须低于完全消失阈值' })
  if (settings.systemFadeStartZoom >= settings.systemFadeEndZoom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['systemFadeStartZoom'], message: '恒星系开始出现阈值必须低于完全出现阈值' })
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
  if (!settings || typeof settings !== 'object' || 'surfaceIconMinZoom' in settings) return configSaveSchema.parse(value)
  const compactMaxZoom = (settings as { surfaceCardCompactMaxZoom?: unknown }).surfaceCardCompactMaxZoom
  return configSaveSchema.parse({ ...value, settings: {
    ...settings,
    surfaceIconMinZoom: typeof compactMaxZoom === 'number'
      ? Math.min(DEFAULT_GAME_SETTINGS.surfaceIconMinZoom, compactMaxZoom)
      : DEFAULT_GAME_SETTINGS.surfaceIconMinZoom
  } })
}

export function createConfigSave(settings: GameSettings): ConfigSaveV1 {
  return { version: 1, settings: gameSettingsSchema.parse(settings) }
}
