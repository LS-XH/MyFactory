# 共享图标

界面统一使用 `ItemGlyph`，只需传物品 ID；组件会读取物品定义、取色并按类别绘制符号或本地 Iconify 图标。`item.json` 不保存 `symbol`、`chemicalFormula` 或 `color`，这些显示规则集中在本目录。

`ItemInteractionProvider` 在应用壳层统一处理物品选中与配方跳转。已有界面中的 `ItemGlyph` 默认接入：单击打开右侧物品详情，双击打开该物品的配方视图；纯装饰用途可传 `interactive={false}`。
在物品栏等需要格子同时响应单击的容器中，传 `stopPropagation={false}`，保留格子原有的选中操作。

```tsx
<ItemGlyph itemId="Fe" variant="inventory" />
<ItemGlyph itemId="Fe" variant="chip" />
```

- `ItemGlyph.tsx`、`itemGlyph.css`：化学纯净物按 `itemState` 显示符号，其他物品显示图标，支持 `inline`、`inventory`、`chip`、`codex` 四种尺寸。化学式直接采用物品键，数字用 `<sub>` 显示；未单独设计外观的新物态使用通用化学式样式。
- `itemVisualRegistry.ts`：为化学纯净物和矿物登记独立颜色，并提供通用后备色；新增物品时可在这里登记浅色调。
- `itemIconManifest.json`：材料、产品和装备的默认 Iconify 图标 ID。
- `itemIconOverrides.json`：按物品 ID 登记矿物等需要专用图标的物品；未登记物品沿用类别默认图标。
- `itemIconRegistry.ts`：优先读取物品专用图标，再读取装备子类别图标，提供统一的图标解析入口。
- `itemIconData.json`：构建前由 `scripts/generate_item_icon_data.mjs` 生成的本地图标数据。

新增类别或物态先写入 `assets/legacy/itemType.json` 或 `itemState.json`，物品定义再以 `itemType`、`itemState` 引用。化学纯净物使用物品键作为化学式，长化学式会在物品栏色块内自动缩小；矿物可在 `itemIconOverrides.json` 和 `itemVisualRegistry.ts` 中分别登记图标与颜色；其他材料和产品沿用类别默认图标；装备通过 `equipmentType.json` 中的最终子类别选择图标。图标的尺寸、背景和光效不要写入物品栏或其他页面的样式文件。

物品栏中普通物品图标占据格子主体；纯净物符号使用较小的色块。固态是浅色实心矩形加深色化学式，液态是浅色空心矩形加发光文字，气态只有发光文字而无背景或边框。发光位于色块外围和文字，不添加中心光斑。物品名称由格子的悬停提示显示，数量叠在右下角，装备尺寸叠在左下角；格子缩放由物品栏组件控制。

纯净物色块外围光效由 `box-shadow` 控制，液态和气态的文字光效由独立的 `text-shadow` 控制；调整前者不会关闭文字发光。

装备图标的最终映射以 `assets/legacy/equipmentType.json` 的 `subEquipmentType.*.icon` 为准；新增装备子类时应更新该 JSON 并重新生成本地 Iconify 数据，无须在物品栏、装配视图或其他页面添加专属分支。

## 地表设备图标

`FactoryGlyph` 是设备图标的统一入口，参数 `factoryId` 使用 `assets/legacy/factory.json` 的设备 ID。`factoryIconManifest.json` 登记设备到图标的映射；`factoryLucideExtras.ts` 保存当前 Lucide React 版本尚未内置的 `solar-panel` 和 `robot-arm` 原版路径；`factoryIconData.json` 保存两个本地 Iconify 图标。地表卡片、建造栏、总览和详情页均复用这个组件。未登记的旧 Demo 设备沿用原来的类别图标，类别按钮仍由 `iconRegistry.ts` 管理。

图标来源：Lucide（[ISC](https://lucide.dev/license)）；Pinhead Map Icons，Quincy Morgan（[CC0](https://creativecommons.org/publicdomain/zero/1.0/)）；CoreUI Free，creativeLabs Łukasz Holeczek（[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）。本地数据只提取了所需图形，未修改路径。

## 飞船、空间站和天体图标

`EntityIcon.tsx` 是总览列表、星图和右侧详情共同使用的实体入口。飞船先用型号 ID 从 `assets/legacy/ship.json` 解析 `shipType`，再由 `shipTypeIconRegistry.tsx` 按 `shipType.json` 的两级分类选择图标；真正的手绘 SVG `path` 集中在 `shipTypeIconArtwork.ts`，不是散写在三个界面里。每种舰型使用居中的 `24×24` 轮廓，船体以同色描边和半透明填充表示，不绘制内部装饰线。新增舰型时同时补路径并运行注册覆盖测试；未配置时临时使用后备轮廓，不应长期让不同舰型共用后备图形。

`entityVisualRegistry.ts` 统一解析类别色和所属势力色。玩家所属飞船/空间站使用 `styles/tokens.css` 的 `--color-player-owned-object`（亮草绿 `#5cf05a`）；是否属于玩家取实例 `ownerFactionId`，与型号的生产商字段无关。空间站当前使用共享的 Radio 造型；未来可在同一入口按空间站型号扩展专属图形。总览恒星使用 `GalaxyIcon.ts`，星图中的恒星仍是由 `starTypeVisuals.ts` 决定颜色的发光圆点/中心天体，两者表达方式不同。

星图的悬停和选中四角框由 `features/space-map/components/CornerFrame.tsx` 绘制，不改变舰型图标颜色；飞船朝向由星图图层旋转整个图标和方框。实体 SVG 后面不放额外透明矩形点击区，避免图标之外的大范围误选。图标显示半径受设置中的对象图标缩小/放大阈值约束，换算位于 `features/space-map/orbitalEntityScale.ts`。
