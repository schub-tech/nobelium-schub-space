import { useEffect } from 'react'
import posthog from 'posthog-js'

function getNextIntakeBatchLink (target) {
  if (!(target instanceof Element)) return null

  const link = target.closest('a[href*="app.dover.com/apply"], a[href*="typeform.com"]')
  if (!link) return null

  const callout = link.closest('.notion-callout')
  const calloutText = callout?.textContent?.replace(/\s+/g, ' ').trim() || ''
  if (!calloutText.toLowerCase().includes('next intake')) return null

  return link
}

const PostHog = ({ posthogKey, posthogHost, isNotFoundPage }) => {
  useEffect(() => {
    if (!posthogKey || !posthogHost || posthog.__loaded) return

    posthog.init(posthogKey, {
      api_host: posthogHost,
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-01-30',
      persistence: 'localStorage+cookie',
      autocapture: true,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_dead_clicks: true,
      capture_heatmaps: true,
      enable_heatmaps: true,
      capture_performance: {
        network_timing: true,
        web_vitals: true,
        web_vitals_attribution: true
      },
      enable_recording_console_log: true,
      person_profiles: 'always'
    })
  }, [posthogKey, posthogHost])

  useEffect(() => {
    if (!isNotFoundPage || !posthog.__loaded) return

    posthog.capture('404_viewed', {
      path: window.location.pathname,
      query: window.location.search
    })
  }, [isNotFoundPage])

  useEffect(() => {
    const handleClick = event => {
      const link = getNextIntakeBatchLink(event.target)
      if (!link) return

      posthog.capture('next_intake_batch_link_clicked', {
        href: link.href,
        link_text: link.textContent?.replace(/\s+/g, ' ').trim() || '',
        intake_text: link.closest('.notion-callout')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        notion_block_id: link.closest('[data-id]')?.getAttribute('data-id') || '',
        page_path: window.location.pathname,
        page_url: window.location.href,
        page_title: document.title,
        target: link.target || '',
        outbound: link.hostname !== window.location.hostname,
        source: 'home_intake_callout'
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}

export default PostHog
