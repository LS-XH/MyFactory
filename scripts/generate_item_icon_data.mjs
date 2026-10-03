import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'))
const kindIcons = await readJson('src/shared/icons/itemIconManifest.json')
const itemIcons = await readJson('src/shared/icons/itemIconOverrides.json')
const equipmentTypes = await readJson('assets/legacy/equipmentType.json')
const iconIds = new Set([...Object.values(kindIcons), ...Object.values(itemIcons)])

for (const parent of Object.values(equipmentTypes)) {
  for (const subtype of Object.values(parent.subEquipmentType ?? {})) {
    if (subtype.icon) iconIds.add(subtype.icon)
  }
}

const collections = new Map()
const bundledIcons = {}
for (const iconId of [...iconIds].sort()) {
  const [prefix, name, extra] = iconId.split(':')
  if (!prefix || !name || extra || !/^[a-z0-9-]+$/.test(prefix) || !/^[a-z0-9-]+$/.test(name)) throw new Error(`无效的 Iconify 图标 ID：${iconId}`)
  if (!collections.has(prefix)) {
    const collection = await readJson(`node_modules/@iconify-json/${prefix}/icons.json`).catch(() => { throw new Error(`缺少图标数据包 @iconify-json/${prefix}`) })
    collections.set(prefix, collection)
  }
  const collection = collections.get(prefix)
  const icon = collection.icons[name]
  if (!icon) throw new Error(`Iconify 图集中不存在图标：${iconId}`)
  bundledIcons[iconId] = { width: collection.width, height: collection.height, ...icon }
}

const outputPath = join(root, 'src/shared/icons/itemIconData.json')
const output = `${JSON.stringify(bundledIcons, null, 2)}\n`
const previous = await readFile(outputPath, 'utf8').catch(() => '')
if (output !== previous) await writeFile(outputPath, output, 'utf8')
console.log(`已注册 ${iconIds.size} 个物品 Iconify 图标`)
