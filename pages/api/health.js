import { getAllPosts } from '@/lib/notion'

const REQUIRED_SLUGS = ['home', 'privacy', 'imprint']

export default async function handler (req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ status: 'method_not_allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  try {
    const posts = await getAllPosts({ includePages: true, throwOnFailure: true })
    const availableSlugs = new Set(posts.map(post => post.slug))
    const missingSlugs = REQUIRED_SLUGS.filter(slug => !availableSlugs.has(slug))

    if (missingSlugs.length > 0) {
      console.error('Required Notion pages are missing.', { missingSlugs })
      return res.status(503).json({ status: 'unhealthy', missingSlugs })
    }

    return res.status(200).json({ status: 'ok' })
  } catch (error) {
    console.error('Notion health check failed.', error)
    return res.status(503).json({ status: 'unhealthy' })
  }
}
