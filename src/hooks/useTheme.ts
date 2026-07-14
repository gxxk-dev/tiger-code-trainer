import { useEffect } from 'react'
import type { AppSettings } from '../types'

export function useTheme(theme: AppSettings['theme']): void {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const shouldUseDark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', shouldUseDark)
      document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light'
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', shouldUseDark ? '#111310' : '#f7f7f5')
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])
}
