### 飞船

请动态读取  [ship.json](ship.json) 

- Imicus
     - "displayName"：飞船型号，也就是其父Key的中文翻译
     - "shipType"：舰船类型，请从 [shipType.json](shipType.json) 的子类别选择
     - "faction"：其所属的势力，请从 [faction.json](faction.json) 的类别中选择
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

请动态读取  [equipment.json](equipment.json) 

### 装备类别

请动态读取  [equipmentType.json](equipmentType.json) 

### 空间站

请动态读取 [station.json](station.json) 

- Horizon Fortizar
     - "displayName"：空间站型号，也就是其父Key的中文翻译
     - "stationType"：空间站类型，请从 [stationType.json](stationType.json) 的类别选择
     - "faction"：其所属的势力，请从 [faction.json](faction.json) 的类别中选择
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
