import { idToUuid } from 'notion-utils'
export default function getAllPageIds (collectionQuery, viewId) {
  const viewGroups = Object.values(collectionQuery || {})
  if (viewGroups.length === 0) return []

  const views = viewGroups[0] || {}
  let pageIds = []
  if (viewId) {
    const vId = idToUuid(viewId)
    const view = views[vId]
    pageIds = view?.blockIds || view?.collection_group_results?.blockIds || []
  } else {
    const pageSet = new Set()
    Object.values(views).forEach(view => {
      view?.blockIds?.forEach(id => pageSet.add(id))
      view?.collection_group_results?.blockIds?.forEach(id => pageSet.add(id))
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
