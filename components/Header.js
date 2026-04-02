import { useCallback, useEffect, useRef } from 'react'

const HEADER_OFFSET = 65
const HOME_LINK_ID = '__home'

const NavBar = ({ links, onNavigate }) => (
  <ul className="flex flex-row flex-wrap justify-center gap-x-6 gap-y-3 md:gap-x-10">
    {links.map(link => (
      <li
        key={link.id}
        suppressHydrationWarning
        className="block text-sm text-black dark:text-gray-50 nav font-mono tracking-tight"
      >
        <a
          href={`#${link.id.replaceAll('-', '')}`}
          onClick={event => onNavigate(event, link.id)}
        >
          {link.name}
        </a>
      </li>
    ))}
  </ul>
)

export default function Header ({ fullWidth, links = [] }) {
  const useSticky = true
  const navRef = useRef(/** @type {HTMLDivElement} */ undefined)
  const sentinelRef = useRef(/** @type {HTMLDivElement} */ undefined)

  const scrollToHeading = useCallback((event, id) => {
    event.preventDefault()

    if (id === HOME_LINK_ID) {
      document.documentElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      return
    }

    const cleanId = id.replaceAll('-', '')
    const target = document.getElementById(cleanId) ||
      document.querySelector(`.notion-block-${cleanId}`)

    if (!target) return

    const top = document.documentElement.scrollTop + target.getBoundingClientRect().top - HEADER_OFFSET
    document.documentElement.scrollTo({
      top,
      behavior: 'smooth'
    })
  }, [])

  const handler = useCallback(([entry]) => {
    if (useSticky && navRef.current) {
      navRef.current?.classList.toggle('sticky-nav-full', !entry.isIntersecting)
    } else {
      navRef.current?.classList.add('remove-sticky')
    }
  }, [useSticky])

  useEffect(() => {
    if (links.length === 0) return

    const sentinelEl = sentinelRef.current
    if (!(sentinelEl instanceof Element)) return

    const observer = new window.IntersectionObserver(handler)
    observer.observe(sentinelEl)

    return () => {
      sentinelEl && observer.unobserve(sentinelEl)
    }
  }, [handler, links.length])

  function handleClickHeader (/** @type {MouseEvent} */ ev) {
    if (navRef.current !== ev.target) return

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (links.length === 0) return null

  return (
    <>
      <div className="observer-element h-4 md:h-12" ref={sentinelRef}></div>
      <div
        className={`sticky-nav group m-auto w-full h-6 flex flex-row justify-center items-center mb-2 md:mb-12 py-8 bg-opacity-60 ${
          !fullWidth ? 'max-w-6xl px-4' : 'px-4 md:px-24'
        }`}
        id="sticky-nav"
        ref={navRef}
        onClick={handleClickHeader}
      >
        <NavBar links={links} onNavigate={scrollToHeading} />
      </div>
    </>
  )
}
