import { config as BLOG } from '@/lib/server/config'

import { idToUuid } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'
import normalizeRecordMap from './normalizeRecordMap'

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
export async function getAllPosts ({ includePages = false }) {
  const rawPageId = process.env.NOTION_PAGE_ID?.replaceAll('-', '')
  if (!rawPageId) {
    console.log('NOTION_PAGE_ID is missing.')
    return []
  }

  const id = idToUuid(rawPageId)

  let response
  try {
    response = normalizeRecordMap(await api.getPage(id))
  } catch (error) {
    console.log(`Failed to fetch Notion page "${id}".`)
    return []
  }

  const collection = Object.values(response.collection)[0]?.value
  const collectionQuery = response.collection_query
  const collectionView = Object.values(response.collection_view)[0]?.value
  const block = response.block
  const schema = collection?.schema

  // Some setups use a page which contains a database instead of the database page id itself.
  // If we cannot resolve a collection/query pair, fail gracefully so static build does not crash.
  if (!collection || !collectionQuery || !block || !schema) {
    console.log(
      `NOTION_PAGE_ID "${id}" is not a database (or a page containing an accessible database).`
    )
    return []
  }

  // Construct Data
  let pageIds = getAllPageIds(collectionQuery)
  let pageBlockMap = block

  // Notion may omit collection_query rows for collection_view_page roots.
  // Fall back to querying the collection view directly so homepage discovery still works.
  if (pageIds.length === 0 && collection && collectionView) {
    try {
      const collectionData = await api.getCollectionData(
        collection.id,
        collectionView.id,
        collectionView,
        { limit: 100 }
      )

      const extraRecordMap = normalizeRecordMap(collectionData?.recordMap)
      pageBlockMap = {
        ...block,
        ...extraRecordMap.block
      }

      pageIds = collectionData?.result?.reducerResults?.collection_group_results?.blockIds || []
    } catch (error) {
      console.log(`Failed to query Notion collection data for "${collection.id}".`)
    }
  }

  const data = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const properties = (await getPageProperties(id, pageBlockMap, schema)) || {}

    // Add fullwidth to properties
    properties.fullWidth = pageBlockMap[id].value?.format?.page_full_width ?? false
    // Convert date (with timezone) to unix milliseconds timestamp
    properties.date = (
      properties.date?.start_date
        ? dayjs.tz(properties.date?.start_date)
        : dayjs(pageBlockMap[id].value?.created_time)
    ).valueOf()

    data.push(properties)
  }

  // remove all the the items doesn't meet requirements
  const posts = filterPublishedPosts({ posts: data, includePages })

  // Sort by date
  if (BLOG.sortByDate) {
    posts.sort((a, b) => b.date - a.date)
  }
  return posts
}
