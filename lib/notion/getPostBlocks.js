import api from '@/lib/server/notion-api'
import normalizeRecordMap from './normalizeRecordMap'

const BLOCK_MAP_CACHE_TTL_MS = 60 * 1000
const blockMapCache = new Map()
const inFlightBlockMapRequests = new Map()

export async function getPostBlocks (id) {
  const cached = blockMapCache.get(id)
  if (cached && Date.now() - cached.timestamp < BLOCK_MAP_CACHE_TTL_MS) {
    return structuredClone(cached.recordMap)
  }

  const inFlightRequest = inFlightBlockMapRequests.get(id)
  if (inFlightRequest) {
    return structuredClone(await inFlightRequest)
  }

  const request = (async () => {
    const pageBlock = await api.getPage(id)
    const recordMap = normalizeRecordMap(pageBlock)

    async function fetchMissingBlocks () {
      while (true) {
        const missingBlockIds = Object.values(recordMap.block || {})
          .flatMap(block => block?.value?.content || [])
          .filter(blockId => !recordMap.block?.[blockId])

        if (missingBlockIds.length === 0) break

        const uniqueMissingBlockIds = [...new Set(missingBlockIds)]
        let extraBlocks
        try {
          extraBlocks = await api.getBlocks(uniqueMissingBlockIds)
        } catch (error) {
          console.log(`Failed to fetch missing blocks for "${id}".`)
          return false
        }

        const normalizedExtraBlocks = normalizeRecordMap(extraBlocks?.recordMap)

        recordMap.block = {
          ...recordMap.block,
          ...normalizedExtraBlocks.block
        }
      }

      return true
    }

    const collectionBlocks = Object.values(recordMap.block || {})
      .map(block => block?.value)
      .filter(block => ['collection_view', 'collection_view_page'].includes(block?.type))

    for (const block of collectionBlocks) {
      const collectionId = block?.collection_id || block?.format?.collection_pointer?.id
      const viewIds = block?.view_ids || []

      for (const viewId of viewIds) {
        const collectionView = recordMap.collection_view?.[viewId]?.value
        if (!collectionId || !collectionView) continue

        try {
          const collectionData = await api.getCollectionData(
            collectionId,
            viewId,
            collectionView,
            { limit: 100 }
          )

          const extraRecordMap = normalizeRecordMap(collectionData?.recordMap)

          recordMap.block = {
            ...recordMap.block,
            ...extraRecordMap.block
          }
          recordMap.collection = {
            ...recordMap.collection,
            ...extraRecordMap.collection
          }
          recordMap.collection_view = {
            ...recordMap.collection_view,
            ...extraRecordMap.collection_view
          }
          recordMap.notion_user = {
            ...recordMap.notion_user,
            ...extraRecordMap.notion_user
          }
          recordMap.collection_query = {
            ...recordMap.collection_query,
            [collectionId]: {
              ...(recordMap.collection_query?.[collectionId] || {}),
              [viewId]: collectionData?.result?.reducerResults
            }
          }
        } catch (error) {
          console.log(`Failed to fetch collection data for "${collectionId}".`)
        }
      }
    }

    const hasFetchedAllMissingBlocks = await fetchMissingBlocks()

    if (hasFetchedAllMissingBlocks) {
      blockMapCache.set(id, {
        timestamp: Date.now(),
        recordMap
      })
    }

    return recordMap
  })()

  inFlightBlockMapRequests.set(id, request)

  try {
    const recordMap = await request
    return structuredClone(recordMap)
  } finally {
    inFlightBlockMapRequests.delete(id)
  }
}
