import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN } = process.env

const client = new NotionAPI({ authToken: NOTION_ACCESS_TOKEN })

// Notion's edge currently rejects the default got user agent used by
// notion-client 6.x, even for public pages.
const gotOptions = {
  headers: {
    'user-agent': 'Mozilla/5.0 (compatible; SchubSpace/1.0; +https://www.schub.space)'
  }
}

function withCompatibleUserAgent (options = {}) {
  return {
    ...gotOptions,
    ...options,
    headers: {
      ...gotOptions.headers,
      ...options.headers
    }
  }
}

const api = {
  getPage: (id, options = {}) => client.getPage(id, {
    ...options,
    gotOptions: withCompatibleUserAgent(options.gotOptions)
  }),
  getCollectionData: (collectionId, viewId, collectionView, options = {}) =>
    client.getCollectionData(collectionId, viewId, collectionView, {
      ...options,
      gotOptions: withCompatibleUserAgent(options.gotOptions)
    }),
  getUsers: (requests, options = {}) =>
    client.getUsers(requests, withCompatibleUserAgent(options)),
  getBlocks: (ids, options = {}) =>
    client.getBlocks(ids, withCompatibleUserAgent(options)),
  getSignedFileUrls: (requests, options = {}) =>
    client.getSignedFileUrls(requests, withCompatibleUserAgent(options))
}

export default api
