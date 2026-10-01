import { UI_COLORS } from '../../config/visualTokens'

export const ORBITAL_BUILD_CATEGORIES = {
  station: { label: '空间站', color: UI_COLORS.station, options: ['平台', '空堡', '铁壁', '星城', '工程复合体', '主权设施'] },
  transport: { label: '交通', color: UI_COLORS.transport, options: ['星门', '轨道加速器', '信标'] }
} as const

