# HELIX // 工业宇宙控制台

React + TypeScript 的工业宇宙 RTS UI Demo。当前版本包含连续星图、地表生产网络、物品图鉴和配方关系、配置驱动内容、实时生产状态，以及文件和浏览器本地存档。详细交互与当前实现范围见 [Planning.md](Planning.md)，模块职责见 [项目结构.md](项目结构.md)，静态数据字段见 [Json静态资源结构说明.md](assets/legacy/Json静态资源结构说明.md)。

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm test
npm run test:e2e
```

星图生成器的全部参数按恒星系、行星轨道、天体半径和地表资源等类别保存在 [`scripts/space_map_config.json`](scripts/space_map_config.json)。编辑配置后运行 `python scripts/generate_space_map.py`；如需使用另一份配置，可传入 `--config 路径`。配置中的相对路径以项目根目录为基准。生成器会写入配置中 `files.output` 指定的文件。

## 文档入口

- [Planning.md](Planning.md)：玩法、界面、对象命令和当前交互规则。
- [属性对象.md](属性对象.md)：对象能力的设计、已实现行为与预留功能。
- [项目结构.md](项目结构.md)：静态资源、运行时实例、状态和 UI 模块的文件职责。
- [Json静态资源结构说明.md](assets/legacy/Json静态资源结构说明.md)：型号、物品、装备类别与轨道实例存档格式。
- [共享图标说明](src/shared/icons/README.md)：物品图标、颜色、化学式和交互复用入口。

## 代码结构

- `assets/catalog.json`：旧 Demo 示例设备、物品和配方；地表的详细静态数据以 `assets/legacy/` 中的 `spaceMap.json`、`factory.json`、`item.json`、`formula.json` 等文件为准。
- `save/orbital-objects.json`：宇宙视图飞船、空间站的实例存档；启动时读取，移动、受击、装备和物品栏变化后自动写回。
- `save/config.json`：设置面板的版本化配置；启动时优先读取，修改设置后自动写回。它是当前已保存值，不等于配置文件缺失时的全部代码回退默认值。
- 星图设置中可分别调整恒星系遮罩的开始/完全消失倍率，以及内部星系的开始/完全出现倍率；默认两组均为 100%→200%，旧配置缺少这四项时自动采用默认值。
- `assets/legacy/`：当前使用的静态资源与结构说明。
- `src/domain/content.ts`：JSON 校验、内容索引和默认生产布局。
- `src/domain/contracts.ts`：实体、能力、操作和存档接口。
- `src/domain/objects.ts`：运行时对象仓库、模块化能力（装备/移动/受击/攻击/舰载机）与对象可用操作。
- `src/domain/objects.ts` 中的 `TaskQueueCapability` 与 `src/state/gameStore.ts`：前往任务的持久队列、执行、重排、删除和目标修改。
- `src/domain/items.ts`、`src/domain/storage.ts`：从 `item.json` 读取物品定义，并从 `itemType.json`、`itemState.json` 读取类别和物态名称；储存能力按体积限制，支持堆叠和原子转移。
- `src/domain/equipment.ts`：核对装备物品与装备定义，从 `equipmentType.json` 的子类别推导所属槽位组。
- `src/shared/icons/ItemGlyph.tsx`、`itemGlyph.css`：统一绘制化学纯净物符号及其他物品的 Iconify 图标；物品栏、配方等界面用 `variant` 选择尺寸。
- `src/shared/icons/ItemInteraction.tsx`：共享物品图标的单击选中/详情和双击配方跳转。
- `src/shared/icons/itemIconManifest.json`、`itemIconRegistry.ts`、`itemVisualRegistry.ts`：集中配置类别图标、装备子类别图标解析和物品显示色。物品 JSON 只保存物品数据。
- `src/features/inventory/`：单对象与双对象物品栏视图，支持拖动换格、合并堆叠和转移。
- `src/features/fitting/`：对象装配视图，左侧显示物品栏，右侧显示全部装备槽位。
- `src/features/item-codex/`：SVG 物品图鉴、分类与搜索、合成/用途/上游配方，以及右侧物品静态详情。
- `src/features/surface/`：React Flow 地表画布、资源点、三级缩放卡片、拖放建造、整数网格、动态配方端口和视口裁剪。
- `src/domain/orbitalSave.ts`：轨道对象存档格式校验；`src/state/orbitalFileSave.ts`：自动加载和写回。
- `src/domain/configSave.ts`：设置文件格式与范围校验；`src/state/jsonFileSave.ts` 和 `scripts/jsonSaveRoute.mjs`：设置与轨道对象共用的文件读写接口。
- 星图和地表对象均绑定运行时对象 ID；Ctrl 多选、Shift 框选、多选共有能力操作，以及星图右键命令使用同一全局选择状态。
- `src/domain/surfaceContent.ts`、`surfaceSimulation.ts`：地表静态定义、整数 km 网格、资源 t 与单件 kg 换算、开采、物流和配方生产；`simulation.ts` 保留旧 Demo 示例模拟。
- `src/state/gameStore.ts`：场景、选择、生产网络和本地持久化状态。
- `src/App.tsx`：控制台壳层、场景组合和共享物品交互；具体星图和地表视图分别在各自的功能目录。
- `src/styles.css`：深色工业控制台视觉系统。

添加新设备、物品或配方时优先修改 JSON 内容，不需要改动面板组件；设备能力和操作栏可继续通过领域层扩展。

地表操作：从底部建造栏把设备拖到画布上的整数网格位置；已建设备按格拖动，左侧列表双击聚焦，单击空白处取消选择。滚轮按 `×2/÷2` 有级缩放，低倍率图标保持设定的最小屏幕大小；设备、资源和链路仅在视野内挂载显示。卡片代码回退值在 `≤50%` 为纯图标、`>50%` 且 `<200%` 为放大图标与竖向进度条、`≥200%` 为完整详情；三个阈值均可在地表设置页调整，其中图标最小缩小阈值的代码回退值为 `25%`，当前工作区的 `save/config.json` 已设为 `50%`。当前地表节点、所选配方、库存、链路与资源剩余量保存在浏览器本地存档 `my-factory-rts-demo`；设置另存于 `save/config.json`。

宇宙和地表视图都可左键拖动空白处平移、用滚轮缩放；右键保留上下文菜单。W/A/S/D 分别移动视角，按住 Shift 加速；四个键位及普通/加速移动速度可在“设置 → 快捷键”中调整，并写入 `save/config.json`。星图 Shift+左键框选和地表设备左键拖动不受影响。

飞船和空间站实例在 `save/orbital-objects.json` 的 `entities` 数组中配置，`definitionId` 对应 `assets/legacy/ship.json` 或 `assets/legacy/station.json` 的型号键。存档中的 `ownerFactionId` 是实例所属势力，决定玩家能否下令、装配和改名；型号 JSON 中的 `faction` 是生产商。存档只记录实例身份、位置、状态及能力的可变数据；型号名称与舰型等展示文字由型号 JSON 和 `shipType.json`、`stationType.json` 生成。两个文件读写接口由 Vite 在 `npm run dev` 与 `npm run preview` 时提供；单独部署静态 `dist` 时需要提供同路径的服务端接口。

玩家对象在右侧详情栏可点击名称修改，回车保存。飞船和空间站的图标按型号/舰型从共享图标注册表解析；飞船转向时图标与四角选中框一起围绕对象中心旋转。实例在连续世界坐标中参与模拟，进入最近恒星系的范围时更新 `starId` 和局部位置；当前相机只决定是否绘制，不决定对象是否继续运动。

点击对象的“打开物品栏”，或选中一个对象后通过“转移物品”选择另一个有物品栏的玩家对象，可在物品栏视图中拖动整组物品。格子不限数量，同种物品可堆叠，容量由型号 JSON 的 `storage.itemstorage` 决定。库存写入实例存档；装备必须先在库存中，装配时消耗一件。物品图标占格子主体，名称在悬停提示中显示，数量位于右下角，装备尺寸位于左下角。系统设置中的“物品栏缩放倍率”可在 50%–100% 间调整物品格子及格内图标、文字的尺寸，以显示更多格子；物品栏标题、容量信息和页面布局保持原大小，设置会保存在 `save/config.json` 中。

每个物品栏面板提供“一键排序”：相同物品 ID 的堆叠会合并，再依照 `assets/legacy/item.json` 中的出现顺序，从第一个格子起紧密排列。整理后的库存会自动写入实例存档。

下方操作栏的“装配装备”会打开对象装配视图。左侧选择或拖动库存装备，右侧点击匹配类别和尺寸的槽位进行安装或更换；已安装装备可卸回物品栏。更换和卸下会检查储存体积，并将结果写入对象实例存档。

物品与装备图标使用 Iconify。`npm run dev` 和 `npm run build` 会从图标数据包生成仅含已注册图标的本地数据，运行时无需请求 Iconify API。炮塔图标来自 [Game Icons](https://game-icons.net/)（[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)）。

`item.json` 通过 `itemType` 和可选的 `itemState` 引用 `itemType.json`、`itemState.json`，保存每件物品的体积与重量，不保存 `symbol`、`chemicalFormula` 或颜色。类别筛选和物态名称从对应 JSON 生成；物态 ID 匹配不区分大小写。纯净物直接用物品键绘制带下标的化学式；其他物品由共享图标注册表选择图标，矿物可按物品 ID 覆盖，装备图标由 `equipmentType.json` 的最终子类别决定。纯净物使用浅色调：固态实心色块，液态空心色块，气态仅显示文字；新物态使用通用化学式外观，显示规则集中在 `src/shared/icons/`。

## 对象命令与任务

选中对象后，底栏按所选对象的共有能力显示命令；右键自身执行即时操作，先选中对象再右键目标或空地可下达目标命令。底栏需要第二目标的按钮会保持高亮，并绘制从对象到光标的灰线和命令图标；“前往”可选择对象或空地，Esc 或再次点击同一按钮可取消。

“前往”和“跃迁到”是持续任务：普通下令替换队列；**按住 Shift 点击已打开右键菜单中的任务项**，或底栏待选目标期间**按住 Shift 点击最终目标**，会追加到队尾。底栏追加预览显示 `+`，引导线从队尾任务目标连接光标。右侧“任务队列”页可上移、下移、删除或拖放排序。星图中的队首目标是天蓝色，点击的目标变绿色；正在执行的跃迁目标显示为白色。点击指示器会打开对应任务队列，点击空白处取消焦点；玩家对象的普通移动指示器可拖动以修改目的地。任务随实例自动保存。

飞船移动使用存档中的位置、速度、朝向和当前角速度：按型号的 `turnAcceleration` 加速转向，受 `turnSpeed` 限制并在目标角度前制动；随后沿朝向加速航行，并按制动距离减速。跃迁与前往共用这套运动和到达判定，只将线速度、线加速度上限换为型号的 `warpSpeed`、`warpAcceleration`。星图设置中的“前往任务到达容差”默认为 `0.05 AU`，按恒星单位长度轨道系数换算为世界距离：进入目标范围便完成任务，不再为微小偏差反复转向；无后续任务时继续按运动模型制动。停止命令会逐步制动线速度和角速度。距离和线速度使用星图游戏世界单位，不模拟引力或轨道力学。

飞船和空间站的存档使用 `starId` 加恒星系局部坐标；模拟会换算为连续世界坐标，跨过最近恒星系的分界后自动更新归属且保持画面位置连续。飞船即使不在当前视口或当前细节恒星系中，仍持续按目标帧率更新；SVG 只绘制落入视口的对象。

星图渲染在深空使用全局坐标，进入恒星系细节后仅将绘制坐标临时转换为以当前恒星为原点的局部值；高倍率名称另用屏幕坐标绘制，跨星系任务线先裁剪到视口。模拟、命令和存档的数据结构保持不变。

设置中的目标帧率同时控制星体动画与飞船移动画面的更新节奏。实际刷新率以浏览器和显示器可提供的帧率为上限，飞船位移按实际经过的时间计算。

向星体下达“前往”命令时，飞船会以当时画面中的星体中心作为固定目的地。行星和卫星使用完整层级 ID（例如 `Solar/Earth03/Moon01`）区分同名卫星。模拟将各恒星系局部目标转换为连续世界坐标，允许直接跨恒星系航行。“跃迁到”可选对象或空地：选定目标后再点击一次指定终点相对目标的距离和方向；对象目标会随目标移动重算终点，空地目标固定。偏移以 km 存档，任务指示器显示在实际终点。
