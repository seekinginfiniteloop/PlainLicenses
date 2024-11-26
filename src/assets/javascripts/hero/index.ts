import "~/hero/animation"
import "~/hero/imageshuffle"
import { Subject, forkJoin } from 'rxjs'
import { delay, filter, map, tap } from 'rxjs/operators'

import { isHome, isOnSite, watchLocationChange } from "~/utils"
import { logger } from "~/log"

const onHeroPage = (url: URL) => isHome(url) && isOnSite(url)
const heroLocationObserver$ = watchLocationChange(onHeroPage).pipe(tap(() => {
  const schemeSelector = document.querySelector('md-header__option') as HTMLFormElement
  if (schemeSelector) {
    schemeSelector.style.display = 'none'
    schemeSelector.style.visibility = 'hidden'
  }
}))

// Create a single subject for theme changes
const themeSubject = new Subject<{ element: Element, scheme: string, media: string }>()

  // Set up mutation observer for attribute changes
export const setupThemeObserver = () => {
    const targets = Array.from(document.querySelectorAll('[data-md-color-scheme][data-md-color-media]'))
    if (!targets.length) {
      logger.error('Theme target elements not found')
      return
    }

    const observers: MutationObserver[] = []

    // Force slate theme
    const enforceTheme = (element: Element) => {
      element.setAttribute('data-md-color-scheme', 'slate')
      element.setAttribute('data-md-color-media', 'dark')
    }

    // Create observer for each target
    targets.forEach(target => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'data-md-color-scheme' ||
            mutation.attributeName === 'data-md-color-media') {
            themeSubject.next({
              element: target,
              scheme: target.getAttribute('data-md-color-scheme') || '',
              media: target.getAttribute('data-md-color-media') || ''
            })
          }
        })
      })

      observer.observe(target, {
        attributes: true,
        attributeFilter: ['data-md-color-scheme', 'data-md-color-media']
      })

      observers.push(observer)
    })

    // Watch for changes and enforce slate theme
    const subscription = forkJoin({
      themeSubject, heroLocationObserver$
    }).pipe(
      map(({ themeSubject }) => ({ element: themeSubject.element, scheme: themeSubject.scheme, media: themeSubject.media })),
      filter(({ scheme, media }) => scheme !== 'slate' || media !== 'dark'),
      tap(({ element }) => {
        enforceTheme(element)
      }
      )).subscribe()

    // Return cleanup function
    const cleanup = () => {
      return () => {
        observers.forEach(observer => observer.disconnect())
        subscription.unsubscribe()
      }
    }
  const noLongerHome = (url: URL) => !isHome(url) && !isOnSite(url)
  watchLocationChange(noLongerHome).pipe(delay(10000), tap(() => cleanup())).subscribe()
}
