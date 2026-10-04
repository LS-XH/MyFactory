### 飞船

请动态读取  [ship.json](ship.json) 

- Imicus
     - "displayName"：飞船型号，也就是其父Key的中文翻译
     - "shipType"：舰船类型，请从 [shipType.json](shipType.json) 的子类别选择
     - "faction"：设计、生产该型号的势力（生产商），请从 [faction.json](faction.json) 的类别中选择；实例所属势力由存档中的 `ownerFactionId` 决定
     - "slots"：飞船槽位，有五种槽位，每个槽位数组的对象数量即为当前种类槽位个数
          - "turretSlots"
          - "engineSlots"
          - "defenseSlots"
          - "utilitySlots"
          - "moduleSlots"
               - "slotSize"：可以为"S"、"M"、"L"、"XL"、"T"
               - "shipAdjustment"：对当前槽位做出调整， [shipAdjustment.json](shipAdjustment.json) 中有支持的调整类型，及其所需参数
     - "movement"：运动属性
          - "acceleration"：加速度
          - "maxSpeed"：最大速度
          - "turnSpeed"：最大角速度，单位为度/秒
          - "turnAcceleration"：角加速度，单位为度/秒²
          - "warpSpeed": 跃迁速度
     - "storage"：仓储属性
          - "itemstorage"：可储存的物品体积上限，单位为立方米

### 物品与实例物品栏

请动态读取 [item.json](item.json)。每个键是 `itemId`；`displayName` 为名称，`volume`（立方米）和 `weight`（千克）为单件数值。`itemType` 引用 [itemType.json](itemType.json) 的类别 ID，`itemState` 可选，引用 [itemState.json](itemState.json) 的物态 ID；读取物态时不区分键名大小写，因此 `item.json` 的 `solid` 对应物态表的 `Solid`。化学纯净物的键本身就是显示用化学式，无须重复存储化学式。物品颜色不写入静态 JSON 或存档，统一在 `src/shared/icons/itemVisualRegistry.ts` 中按物品 ID 配置。非化学物品按物品类别从 [itemIconManifest.json](../../src/shared/icons/itemIconManifest.json) 选择默认 Iconify 图标；装备子类的图标配置在 `equipmentType.json`。材料可用 `primaryElementId` 指向主要元素物品，以沿用其 UI 显示色；产品可用 `productType` 标记用途。装备物品的 `equipmentType` 必须指向 [equipmentType.json](equipmentType.json) 中的子类别，并在 [equipment.json](equipment.json) 中用同一 `itemId` 定义装备特征。

地表资源储量是 `t`，物品 `weight` 是 `kg/件`。开采时 `floor(剩余储量 t × 1000 / weight)` 为可得到的完整件数；每产出一件从资源剩余储量扣除 `weight / 1000 t`。设备配方、缓存和物品栏数量均按“件”计算。物品图鉴、设备配方、物流端口、物品栏和装配视图通过同一 `ItemGlyph` 图标入口展示物品；单击查看右侧静态详情，双击进入该物品的直接合成、用途与上游配方视图。图鉴按 `itemType.json` 的顺序和名称分类，并支持名称/ID 搜索；详情中的物态名称取自 `itemState.json`。视觉颜色、边缘光效及交互规则由共享图标层维护，不写入 JSON。

`item.json` 不保存 `symbol`、`chemicalFormula` 或 `color`。纯净物图标直接从键名生成带数字下标的化学式；材料、产品、装备的图标集中由 `src/shared/icons` 注册。矿物等具体物品可在 `itemIconOverrides.json` 覆盖类别默认图标，并在 `itemVisualRegistry.ts` 指定贴近物质的浅色。物品栏的数量位于图标右下角，装备尺寸位于左下角，名称只在悬停提示中显示；这属于 UI 表现，不写入物品定义。

飞船和空间站的具体物品保存在 `save/orbital-objects.json` 的 `storage.slots` 中。每个格子记录 `slot`（从 0 起）、`itemId` 和 `quantity`。格子编号没有上限；所有物品的 `volume × quantity` 之和不得超过对应型号 `storage.itemstorage`。

### 舰型

请动态读取 [shipType.json](shipType.json) ，对于内部的对象，key为父舰型

- "displayName"：舰型名称，也就是其父Key的中文翻译

- "shipAdjustment"：舰型属性修正，为当前舰船进行某些数值的增益或减益

### 舰船数值修正

请动态读取 [shipAdjustment.json](shipAdjustment.json) ，对于内部的对象，key为调整类型

- "key"：
     - "equipment"：生效的装备列表，所有的装备详见 [equipment.json](equipment.json) 
     - "equipmentType"：生效的装备类型列表，与同一索引的"equipment"不能同时存在，必须有一方为null，装备类型详见
     - "coefficient"：系数列表，与"equipment"的索引一一对应，类型为float



### 装备

请动态读取 [equipment.json](equipment.json)，键为对应 `item.json` 的 `itemId`。装备的 `equipmentType` 与物品记录一致，均引用装备子类别；`size` 对应 S/M/L/XL/T 槽位尺寸。安装时先根据子类别在 `equipmentType.json` 中找到所属父类别，再决定槽位组。

- "displayName"：装备名称，也就是其父Key的中文翻译
- 




### 装备类别

请动态读取 [equipmentType.json](equipmentType.json)。顶层键（如 `Turret`）是父类别；其 `slotGroup` 指向对象的槽位组。`subEquipmentType` 内的键（如 `LaserTurret`）才是装备实例使用的最终类别；子类别的 `icon` 保存 Iconify 图标 ID。不能直接将父类别键写入 `item.json` 或 `equipment.json` 的 `equipmentType`。新增父类别时在 JSON 中指定 `slotGroup`，无须修改装配代码。

当前炮塔子类别图标（以 JSON 为准）：

| 子类别 | Iconify ID |
| --- | --- |
| 激光炮塔 `LaserTurret` | `game-icons:laser-blast` |
| 导弹炮塔 `MissileTurret` | `game-icons:missile-launcher` |
| 加农炮 `CannonTurret` | `game-icons:pirate-cannon` |
| 疾速炮 `RapidFireTurret` | `game-icons:anti-aircraft-gun` |
| 轨道炮 `RailgunTurret` | `game-icons:turret` |
| 熵能分解者 `EntropicDisintegratorTurret` | `game-icons:tesla-turret` |
| 能量投射器 `EnergyProjectorTurret` | `game-icons:energy-breath` |
| 快子光矛 `TachyonLanceTurret` | `game-icons:energy-sword` |

### 空间站

请动态读取 [station.json](station.json) 

- Horizon Fortizar
     - "displayName"：空间站型号，也就是其父Key的中文翻译
     - "stationType"：空间站类型，请从 [stationType.json](stationType.json) 的类别选择
     - "faction"：设计、生产该型号的势力（生产商），请从 [faction.json](faction.json) 的类别中选择；实例所属势力由存档中的 `ownerFactionId` 决定
     - "storage.itemstorage"：可储存的物品体积上限，单位为立方米
     - "slots"：空间站槽位，有五种槽位，每个槽位数组的对象数量即为当前种类槽位个数
          - "turretSlots"
          - "engineSlots"
          - "defenseSlots"
          - "utilitySlots"
          - "moduleSlots"
               - "slotSize"：可以为"S"、"M"、"L"、"XL"、"T"
               - "shipAdjustment"：对当前槽位做出调整， [shipAdjustment.json](shipAdjustment.json) 中有支持的调整类型，及其所需参数

### 轨道对象实例存档

`save/orbital-objects.json` 不是型号静态资源，而是可变对象实例。顶层为 `schemaVersion: 1` 和 `entities` 数组；每项以 `definitionId` 引用飞船或空间站型号，以 `ownerFactionId` 表示实例实际所属势力（`Player` 为玩家），与型号 `faction` 的生产商含义不同。实例字段包括 `id`、`kind`、`name`、`starId`、恒星系局部 `position`、`orbit`、`status`，以及可选的 `health`、`damage`、`installedEquipment`、`storage.slots`、`tasks` 和飞船 `movement`（速度向量、朝向、当前角速度 `angularVelocityDegrees`）。旧存档缺少当前角速度时按零读取；最大速度、线加速度、最大角速度、角加速度和跃迁速度继续从型号 JSON 读取。`tasks` 是有序列表，当前动作 `move` 可保存目标对象或目标坐标及恒星系 ID。`subtitle`、`overviewMeta`、舰型名称、型号固有参数和图标配置均由静态定义及 UI 规则推导，不写入实例存档。运行时跨恒星系时更新 `starId` 与局部坐标，同时保持连续世界位置不跳变。

### 势力/派系

请动态读取  [faction.json](faction.json) 

### 地面设备

请动态读取 [factory.json](factory.json)。顶层键是设备 ID；当前每条定义包含 `displayName`（名称）和 `factoryType`（对应 `factoryType.json` 顶层键）。设备实例放置位置、当前配方、状态、进度和分物品库存属于运行时数据，不写入静态设备定义。

### 地面设备类型

请动态读取 [factoryType.json](factoryType.json)。顶层键是设备类型 ID，值为显示名称；底部建造栏按类型分组，并通过设备 ID 与共享设备图标注册表关联图标。

### 地图：星图/地表视图

 [spaceMap.json](spaceMap.json) ，对于内部的对象，key为恒星ID

- "displayName"：显示名称，即为恒星系的中文名
- "starType"：恒星类型，详见 [starType.json](starType.json) 
- "position"：内部有x，y元素，恒星系相对星图中心的直角坐标系位置，单位为ly，即1光年
- "surface"：表面的情况
- "planet"：环绕的行星或卫星，以对象键保存，对于内部的对象，key 为天体 ID
     - "planetType"：行星类型，详见 [planetType.json](planetType.json) 
     - "position"：行星天体物理参数
          - "orbitalRadius"：围绕其父星球的轨道半径，单位为Au，即1亿km
          - "orbitalPeriod"：围绕其父星球的公转周期，单位为s
          - "radius"：星球半径，单位为km
     - "surface"：行星表面情况
          - "resource"：行星表面资源列表
               - "resourceType"：资源类型，详见 [resourceType.json](resourceType.json) 
               - "item"：资源蕴含的物品，详见 [item.json](item.json)
               - "position"：内部有x，y元素，代表相对左下角行星原点的直角坐标系位置，单位km
               - "reserves"：资源储量，单位为t

 [resourceType.json](resourceType.json) 以资源类型 ID 为键，每项包含 `displayName`、可用的 `itemType` 和 `itemState` 数组、指定物品 ID 的 `item` 数组，以及数值型 `probability`。地表资源点通过 `resourceType` ID 查找 `displayName`；若 ID 未定义，界面回退显示原 ID。
     - "planet"：行星的卫星，内部的格式同行星一样

地表运行时把 `surface.resource.position` 四舍五入到整数 `(X, Y)` 网格，X 向右、Y 向上，`(0, 0)` 只标原点，不显示坐标轴；每格 `1 km`，渲染时每格为 32 个 React Flow 画布单位且屏幕 Y 反向。资源点 ID 根据恒星 ID、行星/卫星路径和资源数组序号生成，静态资源位置保持不变；开采后的剩余 `t` 单独保存在浏览器本地存档的 `resourceReserves`，不回写 `spaceMap.json`。设备整数坐标及物流网络也保存在同一浏览器存档，键为 `my-factory-rts-demo`。

### 配方

 [formula.json](formula.json) 记载地表合成配方，顶层键是配方 ID

- `displayName`：配方显示名称。
- `input` / `output`：以 `item.json` 的物品 ID 为键的对象；每种物品的 `count` 是大于零的单次循环件数。
- `venue`：可执行配方的 `factory.json` 设备 ID 数组。

右侧设备详情中选择配方后，设备卡片按该配方的输入与输出物品动态生成左右端口；每个端口绑定一个物品，图标由共享 `ItemGlyph` 绘制。配方变化时不再兼容的旧链路会被清理。图鉴还会合并读取 `assets/catalog.json` 的旧示例配方；`formula.json` 及 `catalog.json` 都是静态定义，当前所选配方和设备库存保存在浏览器本地存档。



