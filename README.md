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
- `assets/legacy/`：原始静态资源与结构说明；`assets/legacy-copy/` 保留原副本数据。
- `src/domain/content.ts`：JSON 校验、内容索引和默认生产布局。
- `src/domain/contracts.ts`：实体、能力、操作和存档接口。
- `src/domain/simulation.ts`：与 React 无关的生产模拟引擎。
- `src/state/gameStore.ts`：场景、选择、生产网络和本地持久化状态。
- `src/App.tsx`：控制台壳层、恒星系 SVG 视图和 React Flow 生产画布。
- `src/styles.css`：深色工业控制台视觉系统。

添加新设备、物品或配方时优先修改 JSON 内容，不需要改动面板组件；设备能力和操作栏可继续通过领域层扩展。
