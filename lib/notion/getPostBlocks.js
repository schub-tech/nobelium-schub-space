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

    async function signCollectionFilePropertyUrls () {
      const requests = []

      Object.values(recordMap.block || {}).forEach(block => {
        const value = block?.value
        if (value?.type !== 'page' || value?.parent_table !== 'collection') return

        const schema = recordMap.collection?.[value.parent_id]?.value?.schema || {}
        const filePropertyIds = Object.entries(schema)
          .filter(([, property]) => property?.type === 'file')
          .map(([propertyId]) => propertyId)

        filePropertyIds.forEach(propertyId => {
          const property = value.properties?.[propertyId]
          if (!Array.isArray(property)) return

          property.forEach(part => {
            const url = part?.[1]?.find(decoration => decoration?.[0] === 'a')?.[1]
            if (!url) return

            requests.push({
              key: `${value.id}:${url}`,
              permissionRecord: { table: 'block', id: value.id },
              url
            })
          })
        })
      })

      if (requests.length === 0) return

      try {
        const { signedUrls = [] } = await api.getSignedFileUrls(
          requests.map(({ permissionRecord, url }) => ({ permissionRecord, url }))
        )

        recordMap.signed_urls = recordMap.signed_urls || {}
        signedUrls.forEach((signedUrl, index) => {
          const request = requests[index]
          if (!signedUrl || !request) return

          recordMap.signed_urls[request.key] = signedUrl
          recordMap.signed_urls[request.url] = signedUrl
        })
      } catch (error) {
        console.log(`Failed to sign collection file URLs for "${id}".`)
      }
    }

    const hasFetchedInitialMissingBlocks = await fetchMissingBlocks()

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

    const hasFetchedAllMissingBlocks = hasFetchedInitialMissingBlocks && await fetchMissingBlocks()

    if (hasFetchedAllMissingBlocks) {
      await signCollectionFilePropertyUrls()

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
