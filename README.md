# HELIX // 工业宇宙控制台

React + TypeScript 的工业宇宙 RTS UI Demo。当前版本包含恒星系视图、地表生产网络、配置驱动内容、实时生产状态和浏览器本地存档。

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

## 代码结构

- `assets/catalog.json`：示例星系、设备、物品、配方与建造分类。
- `save/orbital-objects.json`：宇宙视图飞船、空间站的实例存档；启动时读取，移动、受击和装备变化后自动写回。
- `assets/legacy/`：原始静态资源与结构说明；`assets/legacy-copy/` 保留原副本数据。
- `src/domain/content.ts`：JSON 校验、内容索引和默认生产布局。
- `src/domain/contracts.ts`：实体、能力、操作和存档接口。
- `src/domain/objects.ts`：运行时对象仓库、模块化能力（装备/移动/受击/攻击/舰载机）与对象可用操作。
- `src/domain/orbitalSave.ts`：轨道对象存档格式校验；`src/state/orbitalFileSave.ts`：自动加载和写回。
- 星图和地表对象均绑定运行时对象 ID；Ctrl 多选、Shift 框选、多选共有能力操作，以及星图右键命令使用同一全局选择状态。
- `src/domain/simulation.ts`：与 React 无关的生产模拟引擎。
- `src/state/gameStore.ts`：场景、选择、生产网络和本地持久化状态。
- `src/App.tsx`：控制台壳层、恒星系 SVG 视图和 React Flow 生产画布。
- `src/styles.css`：深色工业控制台视觉系统。

添加新设备、物品或配方时优先修改 JSON 内容，不需要改动面板组件；设备能力和操作栏可继续通过领域层扩展。

飞船和空间站实例在 `save/orbital-objects.json` 的 `entities` 数组中配置，`definitionId` 对应 `assets/legacy/ship.json` 或 `assets/legacy/station.json` 的型号键。存档中的 `ownerFactionId` 是实例所属势力，决定玩家能否下令、装配和改名；型号 JSON 中的 `faction` 是生产商。存档只记录实例身份、位置、状态及能力的可变数据；型号名称与舰型等展示文字由型号 JSON 和 `shipType.json`、`stationType.json` 生成。文件读写接口由 Vite 在 `npm run dev` 与 `npm run preview` 时提供；单独部署静态 `dist` 时需要提供同路径的服务端接口。

飞船移动使用存档中的位置、速度和朝向：先按型号的转向角速度调整朝向，再加速航行，并按制动距离减速；停止命令会逐步制动。距离和速度使用星图游戏世界单位，不模拟引力或轨道力学。

设置中的目标帧率同时控制星体动画与飞船移动画面的更新节奏。实际刷新率以浏览器和显示器可提供的帧率为上限，飞船位移按实际经过的时间计算。

向星体下达“前往”命令时，飞船会以当时画面中的星体中心作为固定目的地。行星和卫星使用完整层级 ID（例如 `Solar/Earth03/Moon01`）区分同名卫星；当前仅支持向同一恒星系内的目标直接航行。
