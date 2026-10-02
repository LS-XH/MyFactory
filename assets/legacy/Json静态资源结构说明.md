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
          - "turnSpeed"：角速度，单位为度
          - "warpSpeed": 跃迁速度
     - "storage"：仓储属性
          - "itemstorage"：可储存的物品体积上限，单位为立方米

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

请动态读取  [equipment.json](equipment.json) ，key为

- "displayName"：装备名称，也就是其父Key的中文翻译
- 




### 装备类别

请动态读取  [equipmentType.json](equipmentType.json) 

### 空间站

请动态读取 [station.json](station.json) 

- Horizon Fortizar
     - "displayName"：空间站型号，也就是其父Key的中文翻译
     - "stationType"：空间站类型，请从 [stationType.json](stationType.json) 的类别选择
     - "faction"：设计、生产该型号的势力（生产商），请从 [faction.json](faction.json) 的类别中选择；实例所属势力由存档中的 `ownerFactionId` 决定
     - "slots"：空间站槽位，有五种槽位，每个槽位数组的对象数量即为当前种类槽位个数
          - "turretSlots"
          - "engineSlots"
          - "defenseSlots"
          - "utilitySlots"
          - "moduleSlots"
               - "slotSize"：可以为"S"、"M"、"L"、"XL"、"T"
               - "shipAdjustment"：对当前槽位做出调整， [shipAdjustment.json](shipAdjustment.json) 中有支持的调整类型，及其所需参数

### 势力/派系

请动态读取  [faction.json](faction.json) 

### 地面设备

请动态读取  [factory.json](factory.json) 

### 地面设备类型

请动态读取  [factoryType.json](factoryType.json) 

### 地图：星图/地表视图

 [spaceMap.json](spaceMap.json) ，对于内部的对象，key为恒星ID

- "displayName"：显示名称，即为恒星系的中文名
- "starType"：恒星类型，详见 [starType.json](starType.json) 
- "position"：内部有x，y元素，恒星系相对星图中心的直角坐标系位置，单位为ly，即1光年
- "surface"：表面的情况
- "planet"：环绕的行星，是一个列表，对于内部的对象，key为行星ID
     - "planetType"：行星类型，详见 [planetType.json](planetType.json) 
     - "position"：行星天体物理参数
          - "orbitalRadius"：围绕其父星球的轨道半径，单位为Au，即1亿km
          - "orbitalPeriod"：围绕其父星球的公转周期，单位为s
          - "radius"：星球半径，单位为km
     - "surface"：行星表面情况
          - "resource"：行星表面资源
               - "resourceType"：资源类型，详见 [resourceType.json](resourceType.json) 
               - "item"：资源蕴含的纯净物，详见 [item.json](item.json) 
               - "position"：内部有x，y元素，代表相对左下角行星原点的直角坐标系位置，单位km
               - "reserves"：资源储量，单位为t
     - "planet"：行星的卫星，内部的格式同行星一样



