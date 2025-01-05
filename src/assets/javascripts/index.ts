/**
 * ========================================================================
 * *                          PLAIN LICENSE ENTRYPOINT
 *
 * Entrypoint for Plain License's added script bundle.
 * Supplements Material for MkDocs with site-specific scripts.
 * @module index
 * @license Plain Unlicense (Public Domain)
 *
 * Handles:
 * - Imports Material for MkDocs bundle and ensures global observables stay available
 * - Caching/preloading of static assets
 * - Subscriptions to page-specific observables
 *========================================================================*
 */

import "@/bundle"
import { EMPTY, catchError, filter, from, map, merge, of, share, switchMap, tap } from "rxjs"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

import { feedback } from "~/features/feedback/feedback"
import { TabManager } from "~/features/licenses/tabManager"
import { logger } from "~/utils/log"
import { isHelpingIndex, isHome, isLicense, isOnSite } from "~/utils/conditionChecks"
import { license$, navigationEvents$ } from "./utils/eventHandlers"
import { createScript } from "./utils/helpers"

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)


// we have js, so let's get some things out of the way here
document.documentElement.classList.remove("no-js")
document.documentElement.classList.add("js")

let customWindow: CustomWindow = window as unknown as CustomWindow
const { document$ } = customWindow

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('workers/cache-worker.js')
    .then(() => logger.info('SW registered!'))
    .catch(err => logger.error('SW registration failed:', err));
}



// add analytics to each page (a simple tracking pixel)
const insertAnalytics = () => createScript("https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI", false, true)

const insertButtonScript = () => createScript("https://buttons.github.io/buttons.js", true, true)

const analytic$ = of(insertAnalytics())
const animate$ = document$.pipe(switchMap(() => subscribeToAnimation$()))
const feedback$ = of(feedback())
const buttonScript$ = of(insertButtonScript())
const color$ = of(document.body.setAttribute("data-md-color-scheme", "slate"))
const licenseSub$ = license$.pipe(switchMap(() => of(new TabManager())))
const windowEvents$ = from(windowEvents())

// Define page configurations
const pageConfigs: PageConfig[] = [
  {
    matcher: isHome,
    location: "home",
    observables: [
      animate$,
      color$,
    ]
  },
  {
    matcher: isLicense,
    location: "licenses",
    observables: [licenseSub$]
  },
  {
    matcher: isHelpingIndex,
    location: "helpingIndex",
    observables: [buttonScript$]
  },
  {
    matcher: isOnSite,
    location: "all",
    observables: [
      analytic$,
      feedback$,
      windowEvents$
    ]
  }
]

// Single parent observable to manage page subscriptions
const pageSubscription$ = navigationEvents$.pipe(
  map(url => {
    // Find all matching page configs
    const matchingConfigs = pageConfigs.filter(config => config.matcher(url))
    if (matchingConfigs.length === 0) {
      return null
    }

    matchingConfigs.forEach(config =>
      logger.info(`Navigated to ${config.location}`)
    )
    return matchingConfigs
  }),
  filter((configs): configs is PageConfig[] => configs !== null),
  switchMap(configs => {
    // Merge observables from all matching configs
    const allObservables = configs.flatMap(config =>
      config.observables.map(obs =>
        obs.pipe(tap(() => logger.info(`Running observables for ${config.location}`)),
          catchError(error => {
            logger.error(`Error in ${config.location} observables:`, error)
            return EMPTY
          })
        )
      )
    )
    return merge(...allObservables)
  }),
  share()
)

// Single subscription to handle all page changes
pageSubscription$.subscribe()
