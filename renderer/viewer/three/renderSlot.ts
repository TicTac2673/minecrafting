import { getRenamedData } from 'flying-squid/dist/blockRenames'
import { BlockModel } from 'mc-assets'
import { versionToNumber } from 'mc-assets/dist/utils'
import type { ResourcesManagerCommon } from '../../../src/resourcesManager'

export type ResolvedItemModelRender = {
  modelName: string,
  originalItemName?: string
}

export const renderSlot = (model: ResolvedItemModelRender, resourcesManager: ResourcesManagerCommon, debugIsQuickbar = false, fullBlockModelSupport = false): {
  texture: string,
  blockData?: Record<string, { slice, path }> & { resolvedModel: BlockModel },
  scale?: number,
  slice?: number[],
  modelName?: string,
} | undefined => {
  let itemModelName = model.modelName
  const isItem = loadedData.itemsByName[itemModelName]

  // #region normalize item name
  if (versionToNumber(bot.version) < versionToNumber('1.13')) itemModelName = getRenamedData(isItem ? 'items' : 'blocks', itemModelName, bot.version, '1.13.1') as string
  // #endregion


  let itemTexture

  if (!fullBlockModelSupport) {
    const atlas = resourcesManager.currentResources?.guiAtlas?.json
    // todo atlas holds all rendered blocks, not all possibly rendered item/block models, need to request this on demand instead (this is how vanilla works)
    const tryGetAtlasTexture = (name?: string) => name && atlas?.textures[name.replace('minecraft:', '').replace('block/', '').replace('blocks/', '').replace('item/', '').replace('items/', '').replace('_inventory', '')]
    const item = tryGetAtlasTexture(itemModelName) ?? tryGetAtlasTexture(model.originalItemName)
    if (item) {
      const x = item.u * atlas.width
      const y = item.v * atlas.height
      return {
        texture: 'gui',
        slice: [x, y, atlas.tileSize, atlas.tileSize],
        scale: 0.25,
      }
    }
  }

  const blockToTopTexture = (r) => r.top ?? r

  try {
    if (!appViewer.resourcesManager.currentResources?.itemsRenderer) throw new Error('Items renderer is not available')
    itemTexture =
        appViewer.resourcesManager.currentResources.itemsRenderer.getItemTexture(itemModelName, {}, false, fullBlockModelSupport)
        ?? (model.originalItemName ? appViewer.resourcesManager.currentResources.itemsRenderer.getItemTexture(model.originalItemName, {}, false, fullBlockModelSupport) : undefined)
        ?? appViewer.resourcesManager.currentResources.itemsRenderer.getItemTexture('item/missing_texture')!
  } catch (err) {
    // get resourcepack from resource manager
    reportError?.(`Failed to render item ${itemModelName} (original: ${model.originalItemName}) on ${bot.version} (resourcepack: TODO!): ${err.stack}`)
    itemTexture = blockToTopTexture(appViewer.resourcesManager.currentResources!.itemsRenderer.getItemTexture('errored')!)
  }

  itemTexture ??= blockToTopTexture(appViewer.resourcesManager.currentResources!.itemsRenderer.getItemTexture('unknown')!)


  if ('type' in itemTexture) {
    // is item
    return {
      texture: itemTexture.type,
      slice: itemTexture.slice,
      modelName: itemModelName
    }
  } else {
    // is block
    return {
      texture: 'blocks',
      blockData: itemTexture,
      modelName: itemModelName
    }
  }
}
