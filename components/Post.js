import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import Image from 'next/image'
import cn from 'classnames'
import { useConfig } from '@/lib/config'
import useTheme from '@/lib/theme'
import FormattedDate from '@/components/FormattedDate'
import TagItem from '@/components/TagItem'
import NotionRenderer from '@/components/NotionRenderer'
import TableOfContents from '@/components/TableOfContents'

/**
 * A post renderer
 *
 * @param {PostProps} props
 *
 * @typedef {object} PostProps
 * @prop {object}   post       - Post metadata
 * @prop {object}   blockMap   - Post block data
 * @prop {string}   emailHash  - Author email hash (for Gravatar)
 * @prop {boolean} [fullWidth] - Whether in full-width mode
 */
export default function Post (props) {
  const BLOG = useConfig()
  const { post, blockMap, emailHash, fullWidth = false } = props
  const { dark } = useTheme()
  const notionRootRef = useRef(null)
  const isPage = post.type?.[0] === 'Page'

  // About page: group residents into a grid
  useEffect(() => {
    if (post.slug !== 'about') return

    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage || notionPage.querySelector('.about-residents-grid')) return

    const residentsHeading = Array.from(notionPage.querySelectorAll('h3.notion-h2'))
      .find(node => node.textContent?.trim() === 'Residents & Alumni')
    if (!residentsHeading) return

    const grid = document.createElement('div')
    grid.className = 'about-residents-grid'

    let cursor = residentsHeading.nextElementSibling
    while (cursor) {
      const nameNode = cursor
      const imageNode = nameNode.nextElementSibling

      if (
        nameNode?.tagName !== 'H4' ||
        !nameNode.classList.contains('notion-h3') ||
        imageNode?.tagName !== 'FIGURE' ||
        !imageNode.classList.contains('notion-asset-wrapper-image')
      ) {
        break
      }

      const nextCursor = imageNode.nextElementSibling
      const card = document.createElement('div')
      card.className = 'about-resident-card'
      card.appendChild(nameNode)
      card.appendChild(imageNode)
      grid.appendChild(card)
      cursor = nextCursor
    }

    if (grid.children.length > 0) {
      residentsHeading.insertAdjacentElement('afterend', grid)
    }
  }, [post.slug])

  // Home page: group speakers into a grid
  useEffect(() => {
    if (post.slug !== 'home') return

    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage || notionPage.querySelector('.home-speakers-grid')) return

    const speakersHeading = Array.from(notionPage.querySelectorAll('h3.notion-h2'))
      .find(node => node.textContent?.trim() === 'Guest Speakers')
    if (!speakersHeading) return

    const grid = document.createElement('div')
    grid.className = 'home-speakers-grid'

    // Find the intro text after the heading (skip it)
    let cursor = speakersHeading.nextElementSibling
    if (cursor && cursor.classList.contains('notion-text')) {
      cursor = cursor.nextElementSibling
    }

    while (cursor) {
      const nameNode = cursor
      // Speaker cards: H3 (name), then text (title), then image
      if (
        nameNode?.tagName !== 'H4' ||
        !nameNode.classList.contains('notion-h3')
      ) {
        break
      }

      const card = document.createElement('div')
      card.className = 'home-speaker-card'
      let nextCursor = nameNode.nextElementSibling

      card.appendChild(nameNode)

      // Grab the subtitle text if present
      if (nextCursor && nextCursor.classList.contains('notion-text')) {
        const afterText = nextCursor.nextElementSibling
        card.appendChild(nextCursor)
        nextCursor = afterText
      }

      // Grab the image if present
      if (nextCursor && nextCursor.tagName === 'FIGURE' && nextCursor.classList.contains('notion-asset-wrapper-image')) {
        const afterImage = nextCursor.nextElementSibling
        card.appendChild(nextCursor)
        nextCursor = afterImage
      }

      grid.appendChild(card)
      cursor = nextCursor
    }

    if (grid.children.length > 0) {
      speakersHeading.insertAdjacentElement('afterend', grid)
    }
  }, [post.slug])

  // Home page: transform alumni content into a card grid
  useEffect(() => {
    if (post.slug !== 'home') return

    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage) return

    const getPlainText = value => {
      if (!Array.isArray(value)) return ''
      return value.map(part => part?.[0] || '').join('').trim()
    }

    const getPropertyLink = value => {
      if (!Array.isArray(value)) return ''

      for (const part of value) {
        const decorations = part?.[1]
        const link = decorations?.find(decoration => decoration?.[0] === 'a')?.[1]
        if (link) return link
      }

      return ''
    }

    const getNotionImageUrl = (rawUrl, blockId) => {
      if (!rawUrl) return ''
      if (/^https?:\/\//.test(rawUrl)) return rawUrl

      return `https://www.notion.so/image/${encodeURIComponent(rawUrl)}?table=block&id=${blockId}&cache=v2`
    }

    const createLinkedInIcon = () => {
      const svgNS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(svgNS, 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('aria-hidden', 'true')

      const path = document.createElementNS(svgNS, 'path')
      path.setAttribute('fill', 'currentColor')
      path.setAttribute('d', 'M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.48 1s2.5 1.12 2.5 2.5zM.5 8h4V24h-4V8zm7.5 0h3.82v2.19h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V24h-4v-8.12c0-1.94-.03-4.43-2.7-4.43-2.7 0-3.11 2.11-3.11 4.29V24h-4V8z')
      svg.appendChild(path)

      return svg
    }

    const createAlumniCard = ({ name, imageSrc, imageAlt, linkedinUrl, source }) => {
      const card = document.createElement('article')
      card.className = 'home-alumni-card'

      if (imageSrc) {
        const imageWrap = document.createElement('div')
        imageWrap.className = 'home-alumni-card-image'

        const image = document.createElement('img')
        image.src = imageSrc
        image.alt = imageAlt || name || 'Schub alumni'
        image.loading = 'lazy'
        image.decoding = 'async'

        imageWrap.appendChild(image)
        card.appendChild(imageWrap)
      }

      const nameEl = document.createElement('div')
      nameEl.className = 'home-alumni-card-name'
      nameEl.textContent = name
      card.appendChild(nameEl)

      if (linkedinUrl) {
        const link = document.createElement('a')
        const isDatabaseEntry = source === 'database'
        link.className = `home-alumni-card-link${isDatabaseEntry ? ' home-alumni-card-link-icon-only' : ''}`
        link.href = linkedinUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.setAttribute('aria-label', `${name} on LinkedIn`)

        link.appendChild(createLinkedInIcon())
        if (!isDatabaseEntry) {
          const label = document.createElement('span')
          label.textContent = 'LinkedIn'
          link.appendChild(label)
        }
        card.appendChild(link)
      }

      return card
    }

    const buildAlumniGrid = () => {
      if (notionPage.querySelector('.home-alumni-grid')) return true

      const alumniHeading = Array.from(notionPage.querySelectorAll('h3.notion-h2'))
        .find(node => node.textContent?.trim() === 'Our Schub Alumni')
      if (!alumniHeading) return false

      const sectionNodes = []
      let cursor = alumniHeading.nextElementSibling

      while (cursor) {
        if (cursor.matches?.('h1.notion-h1, h2.notion-h1, h3.notion-h2')) {
          break
        }

        sectionNodes.push(cursor)
        cursor = cursor.nextElementSibling
      }

      if (sectionNodes.length === 0) return false

      const alumni = []
      const seen = new Set()

      const pushAlumni = entry => {
        if (!entry?.name && !entry?.imageSrc) return

        const key = `${entry.name || ''}|${entry.linkedinUrl || ''}|${entry.imageSrc || ''}`
        if (seen.has(key)) return

        seen.add(key)
        alumni.push(entry)
      }

      const alumniCollection = Object.values(blockMap.collection || {})
        .find(collection => getPlainText(collection?.value?.name) === 'Schub Alumni')

      if (alumniCollection?.value?.id) {
        const collectionId = alumniCollection.value.id
        const schema = alumniCollection.value.schema || {}
        const picturePropertyId = Object.entries(schema)
          .find(([, property]) => property?.name === 'Picture')?.[0]
        const linkedinPropertyId = Object.entries(schema)
          .find(([, property]) => property?.name === 'LinkedIn')?.[0]

        Object.values(blockMap.block || {}).forEach(block => {
          const value = block?.value
          if (value?.parent_id !== collectionId || value?.type !== 'page') return

          const properties = value.properties || {}
          const imageUrl = getNotionImageUrl(
            getPropertyLink(properties[picturePropertyId]),
            value.id
          )

          pushAlumni({
            name: getPlainText(properties.title),
            imageSrc: imageUrl,
            imageAlt: getPlainText(properties[picturePropertyId]) || getPlainText(properties.title),
            linkedinUrl: getPropertyLink(properties[linkedinPropertyId]),
            source: 'database'
          })
        })
      }

      sectionNodes.forEach(node => {
        if (!node.matches('.notion-text')) return

        const figure = node.nextElementSibling
        if (!figure?.matches('figure.notion-asset-wrapper-image')) return

        const link = node.querySelector('a.notion-link[href*="linkedin.com"]')
        const image = figure.querySelector('img')
        const name = link?.textContent?.trim() || node.textContent?.trim()

        pushAlumni({
          name,
          imageSrc: image?.currentSrc || image?.getAttribute('src'),
          imageAlt: image?.getAttribute('alt'),
          linkedinUrl: link?.href,
          source: 'inline'
        })
      })

      if (alumni.length === 0) return false

      const grid = document.createElement('div')
      grid.className = 'home-alumni-grid'
      alumni.forEach(entry => {
        grid.appendChild(createAlumniCard(entry))
      })

      sectionNodes.forEach(node => node.remove())
      alumniHeading.insertAdjacentElement('afterend', grid)

      return true
    }

    if (buildAlumniGrid()) return

    const observer = new MutationObserver(() => {
      if (buildAlumniGrid()) {
        observer.disconnect()
      }
    })

    observer.observe(notionPage, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [blockMap, post.slug])

  return (
    <article
      className={cn('flex flex-col', fullWidth ? 'md:px-24' : 'items-center')}
      data-post-slug={post.slug}
    >
      {post.slug !== 'home' && post.slug !== 'about' && post.slug !== 'manifesto' && (
        <h1 className={cn(
          'w-full font-bold text-3xl text-black dark:text-white font-mono tracking-tight',
          { 'max-w-2xl px-4': !fullWidth && !isPage },
          { 'max-w-6xl px-4': !fullWidth && isPage }
        )}>
          {post.title}
        </h1>
      )}
      {!isPage && (
        <nav className={cn(
          'w-full flex mt-7 items-start text-gray-500 dark:text-gray-400',
          { 'max-w-2xl px-4': !fullWidth }
        )}>
          <div className="flex mb-4">
            <a href={BLOG.socialLink || '#'} className="flex">
              <Image
                alt={BLOG.author}
                width={24}
                height={24}
                src={`https://gravatar.com/avatar/${emailHash}`}
                className="rounded-full"
              />
              <p className="ml-2 md:block">{BLOG.author}</p>
            </a>
            <span className="block">&nbsp;/&nbsp;</span>
          </div>
          <div className="mr-2 mb-4 md:ml-0">
            <FormattedDate date={post.date} />
          </div>
          {post.tags && (
            <div className="flex flex-nowrap max-w-full overflow-x-auto article-tags">
              {post.tags.map(tag => (
                <TagItem key={tag} tag={tag} />
              ))}
            </div>
          )}
        </nav>
      )}
      <div className={cn(
        'self-stretch -mt-4 flex flex-col items-center',
        !isPage && 'lg:flex-row lg:items-stretch'
      )}>
        {!fullWidth && !isPage && <div className="flex-1 hidden lg:block" />}
        <div
          ref={notionRootRef}
          className={cn({
            'flex-1 pr-4': fullWidth,
            'flex-none w-full max-w-6xl px-4': !fullWidth && isPage,
            'flex-none w-full max-w-2xl px-4': !fullWidth && !isPage
          })}
        >
          <NotionRenderer recordMap={blockMap} fullPage={false} darkMode={dark} />
        </div>
        {!isPage && (
          <div className={cn('order-first lg:order-[unset] w-full lg:w-auto max-w-2xl lg:max-w-[unset] lg:min-w-[160px]', fullWidth ? 'flex-none' : 'flex-1')}>
            {/* `65px` is the height of expanded nav */}
            <TableOfContents blockMap={blockMap} className="pt-3 sticky" style={{ top: '65px' }} />
          </div>
        )}
      </div>
    </article>
  )
}

Post.propTypes = {
  post: PropTypes.object.isRequired,
  blockMap: PropTypes.object.isRequired,
  emailHash: PropTypes.string.isRequired,
  fullWidth: PropTypes.bool
}
