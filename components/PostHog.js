import { useEffect } from 'react'
import posthog from 'posthog-js'

const PostHog = ({ posthogKey, posthogHost }) => {
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

  return null
}

export default PostHog
