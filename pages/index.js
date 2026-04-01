import { clientConfig } from '@/lib/server/config'
import { createHash } from 'crypto'
import { getTextContent } from 'notion-utils'

import Container from '@/components/Container'
import Post from '@/components/Post'
import { getAllPosts, getPostBlocks } from '@/lib/notion'
import { useConfig } from '@/lib/config'

function getHomeHeaderLinks (blockMap) {
  const collectionId = Object.keys(blockMap.collection)[0]
  const page = Object.values(blockMap.block)
    .find(block => block.value.parent_id === collectionId && block.value.type === 'page')
    ?.value

  if (!page) return []

  const links = []

  function walk (ids = []) {
    ids.forEach(id => {
      const block = blockMap.block[id]?.value
      if (!block) return

      if (['header', 'sub_header', 'sub_sub_header'].includes(block.type)) {
        links.push({
          id: block.id,
          name: getTextContent(block.properties?.title)
        })
      }

      walk(block.content)
    })
  }

  walk(page.content)

  return links
}

export async function getStaticProps () {
  const posts = await getAllPosts({ includePages: true })
  const homePage = posts.find(p => p.slug === 'home')

  if (!homePage) {
    return { notFound: true }
  }

  const blockMap = await getPostBlocks(homePage.id)
  const emailHash = createHash('md5')
    .update(clientConfig.email || '')
    .digest('hex')
    .trim()
    .toLowerCase()

  return {
    props: { post: homePage, blockMap, emailHash },
    revalidate: 1
  }
}

export default function Home ({ post, blockMap, emailHash }) {
  const { title, description } = useConfig()
  const headerLinks = getHomeHeaderLinks(blockMap)

  return (
    <Container
      layout="blog"
      title={title}
      description={description}
      headerLinks={headerLinks}
    >
      <Post
        post={post}
        blockMap={blockMap}
        emailHash={emailHash}
      />
    </Container>
  )
}
