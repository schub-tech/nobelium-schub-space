import { createElement as h } from 'react'
import dynamic from 'next/dynamic'
import { NotionRenderer as Renderer } from 'react-notion-x'
import { getTextContent } from 'notion-utils'
import { FONTS_SANS, FONTS_SERIF } from '@/consts'
import { useConfig } from '@/lib/config'
import Toggle from '@/components/notion-blocks/Toggle'

const ALUMNI_COLLECTION_ID = '3354585c-aca1-808a-ba06-000b3bc47165'

function getPlainText (value) {
  if (!Array.isArray(value)) return ''
  return value.map(part => part?.[0] || '').join('').trim()
}

function getPropertyLink (value) {
  if (!Array.isArray(value)) return ''

  for (const part of value) {
    const decorations = part?.[1]
    const link = decorations?.find(decoration => decoration?.[0] === 'a')?.[1]
    if (link) return link
  }

  return ''
}

function getNotionImageUrl (rawUrl, blockId) {
  if (!rawUrl) return ''
  if (/^https?:\/\//.test(rawUrl)) return rawUrl

  return `https://www.notion.so/image/${encodeURIComponent(rawUrl)}?table=block&id=${blockId}&cache=v2`
}

function LinkedInIcon () {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.48 1s2.5 1.12 2.5 2.5zM.5 8h4V24h-4V8zm7.5 0h3.82v2.19h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V24h-4v-8.12c0-1.94-.03-4.43-2.7-4.43-2.7 0-3.11 2.11-3.11 4.29V24h-4V8z"
      />
    </svg>
  )
}

function AlumniCollection ({ block, ctx }) {
  const collectionBlock = block?.value || block
  const collectionId = collectionBlock?.collection_id || collectionBlock?.format?.collection_pointer?.id
  const viewId = collectionBlock?.view_ids?.[0]
  const recordMap = ctx?.recordMap || {}
  const collection = recordMap.collection?.[collectionId]?.value
  const schema = collection?.schema || {}
  const picturePropertyId = Object.entries(schema)
    .find(([, property]) => property?.name === 'Picture')?.[0]
  const linkedinPropertyId = Object.entries(schema)
    .find(([, property]) => property?.name === 'LinkedIn')?.[0]
  const rowIds = recordMap.collection_query?.[collectionId]?.[viewId]?.collection_group_results?.blockIds || []

  const alumni = rowIds
    .map(id => recordMap.block?.[id]?.value)
    .filter(Boolean)
    .map(row => {
      const properties = row.properties || {}
      return {
        id: row.id,
        name: getPlainText(properties.title),
        imageSrc: getNotionImageUrl(getPropertyLink(properties[picturePropertyId]), row.id),
        imageAlt: getPlainText(properties[picturePropertyId]) || getPlainText(properties.title),
        linkedinUrl: getPropertyLink(properties[linkedinPropertyId])
      }
    })
    .filter(entry => entry.name || entry.imageSrc)

  if (alumni.length === 0) return null

  return (
    <div className="home-alumni-grid">
      {alumni.map(alumnus => (
        <article key={alumnus.id} className="home-alumni-card">
          {alumnus.imageSrc && (
            <div className="home-alumni-card-image">
              <img
                src={alumnus.imageSrc}
                alt={alumnus.imageAlt || alumnus.name || 'Schub alumni'}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div className="home-alumni-card-meta">
            <div className="home-alumni-card-name">{alumnus.name}</div>
            {alumnus.linkedinUrl && (
              <a
                className="home-alumni-card-link home-alumni-card-link-icon-only"
                href={alumnus.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${alumnus.name} on LinkedIn`}
              >
                <LinkedInIcon />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

// Lazy-load some heavy components & override the renderers of some block types
const components = {
  /* Lazy-load */

  // Code block
  Code: dynamic(async () => {
    return function CodeSwitch (props) {
      switch (getTextContent(props.block.properties.language)) {
        case 'Mermaid':
          return h(
            dynamic(() => {
              return import('@/components/notion-blocks/Mermaid').then(module => module.default)
            }, { ssr: false }),
            props
          )
        default:
          return h(
            dynamic(() => {
              return import('react-notion-x/build/third-party/code').then(async module => {
                // Additional prismjs syntax
                await Promise.all([
                  import('prismjs/components/prism-markup-templating'),
                  import('prismjs/components/prism-markup'),
                  import('prismjs/components/prism-bash'),
                  import('prismjs/components/prism-c'),
                  import('prismjs/components/prism-cpp'),
                  import('prismjs/components/prism-csharp'),
                  import('prismjs/components/prism-docker'),
                  import('prismjs/components/prism-java'),
                  import('prismjs/components/prism-js-templates'),
                  import('prismjs/components/prism-coffeescript'),
                  import('prismjs/components/prism-diff'),
                  import('prismjs/components/prism-git'),
                  import('prismjs/components/prism-go'),
                  import('prismjs/components/prism-graphql'),
                  import('prismjs/components/prism-handlebars'),
                  import('prismjs/components/prism-less'),
                  import('prismjs/components/prism-makefile'),
                  import('prismjs/components/prism-markdown'),
                  import('prismjs/components/prism-objectivec'),
                  import('prismjs/components/prism-ocaml'),
                  import('prismjs/components/prism-python'),
                  import('prismjs/components/prism-reason'),
                  import('prismjs/components/prism-rust'),
                  import('prismjs/components/prism-sass'),
                  import('prismjs/components/prism-scss'),
                  import('prismjs/components/prism-solidity'),
                  import('prismjs/components/prism-sql'),
                  import('prismjs/components/prism-stylus'),
                  import('prismjs/components/prism-swift'),
                  import('prismjs/components/prism-wasm'),
                  import('prismjs/components/prism-yaml')
                ])
                return module.Code
              })
            }),
            props
          )
      }
    }
  }),
  // Database block
  Collection: dynamic(() => {
    return import('react-notion-x/build/third-party/collection').then(module => {
      const DefaultCollection = module.Collection

      return function CollectionSwitch (props) {
        const block = props.block?.value || props.block
        const collectionId = block?.collection_id || block?.format?.collection_pointer?.id
        if (collectionId === ALUMNI_COLLECTION_ID) {
          return <AlumniCollection {...props} />
        }

        return <DefaultCollection {...props} />
      }
    })
  }),
  // Equation block & inline variant
  Equation: dynamic(() => {
    return import('react-notion-x/build/third-party/equation').then(module => module.Equation)
  }),
  // PDF (Embed block)
  Pdf: dynamic(() => {
    return import('react-notion-x/build/third-party/pdf').then(module => module.Pdf)
  }, { ssr: false }),
  // Tweet block
  Tweet: dynamic(() => {
    return import('react-tweet-embed').then(module => {
      const { default: TweetEmbed } = module
      return function Tweet ({ id }) {
        return <TweetEmbed tweetId={id} options={{ theme: 'dark' }} />
      }
    })
  }),

  /* Overrides */

  toggle_nobelium: ({ block, children }) => (
    <Toggle block={block}>{children}</Toggle>
  ),

}

const mapPageUrl = id => `https://www.notion.so/${id.replace(/-/g, '')}`

/**
 * Notion page renderer
 *
 * A wrapper of react-notion-x/NotionRenderer with predefined `components` and `mapPageUrl`
 *
 * @param props - Anything that react-notion-x/NotionRenderer supports
 */
export default function NotionRenderer (props) {
  const config = useConfig()

  const font = {
    'sans-serif': FONTS_SANS,
    'serif': FONTS_SERIF
  }[config.font]

  // Mark block types to be custom rendered by appending a suffix
  if (props.recordMap) {
    for (const { value: block } of Object.values(props.recordMap.block)) {
      switch (block?.type) {
        case 'toggle':
          block.type += '_nobelium'
          break
      }
    }
  }

  return (
    <>
      <style jsx global>
        {`
        .notion {
          --notion-font: ${font};
        }
        `}
      </style>
      <Renderer
        components={components}
        mapPageUrl={mapPageUrl}
        isImageZoomable={false}
        {...props}
      />
    </>
  )
}
