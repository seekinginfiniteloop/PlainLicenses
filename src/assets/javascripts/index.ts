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
import { EMPTY, catchError, filter, firstValueFrom, from, map, merge, mergeMap, of, share, switchMap, tap } from "rxjs"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

import { feedback$ } from "~/feedback"
import { setupTabIconSync$ } from "~/licenses"
import { logger } from "~/log"
import { isHelpingIndex, isHome, isLicense, isOnSite, navigationEvents$, watchLicenseHashChange$, watchTable$, windowEvents } from "~/utils"
import { cacheAsset$, cleanupCache$, deleteOldCache$, getAsset$ } from "./cache"
import { shuffle$ } from "./hero/imageshuffle"
import { subscribeToAnimation$ } from "./heroScroll"

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)


// we have js, so let's get some things out of the way here
document.documentElement.classList.remove("no-js")
document.documentElement.classList.add("js")

let customWindow: CustomWindow = window as unknown as CustomWindow
const { document$ } = customWindow

// Extracts the URLs from a list of elements
const extractUrls = (elements: NodeListOf<Element>, attribute: string): string[] =>
  Array.from(elements)
    .map(el => el.getAttribute(attribute))
    .filter((url): url is string => url !== null)

// Creates a script element and appends it to the head
const createScript = (src: string, async = true, defer = true) => {
  const alreadyLoaded = document.querySelector(`script[src="${src}"]`)
  if (alreadyLoaded) {
    return
  }
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = src
  script.async = async
  script.defer = defer
  document.head.appendChild(script)
}

// Preloads fonts from the stylesheet
const preloadFonts = async () => {
  const fontUrls = extractUrls(document.querySelectorAll("link[rel=stylesheet][href*=fonts]"), 'href')
  for (const url of fontUrls) {
    try {
      const response = getAsset$(url)
      const blob = response ? await (await firstValueFrom(response)).blob() : undefined
      if (blob) {
        const blobUrl = URL.createObjectURL(blob)
        const fontFamily = url.includes('inter') ? 'Inter' :
                           url.includes('sourcecodepro') ? 'Source Code Pro' :
                           url.includes('raleway') ? 'Raleway' : 'Bangers'
        const font = new FontFace(fontFamily, `url(${blobUrl})`)
        await font.load()
        await document.fonts.load(font.family)
        logger.info(`Font loaded from cache: ${url}`)
        URL.revokeObjectURL(blobUrl)
      }
    } catch (error) {
      logger.error(`Error loading font: ${url}`, error)
    }
  }
}

// Preloads static assets from the stylesheet, scripts, and images
const preloadStaticAsset$ = () => {
  const styleUrls = extractUrls(document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]"), 'href')
  const scriptUrls = extractUrls(document.querySelectorAll("script[src*=javascripts]"), 'src')
  const imageUrls = extractUrls(document.querySelectorAll("img[src]"), 'src')

  return merge(
    ...styleUrls.map(url => getAsset$(url)),
    ...scriptUrls.map(url => getAsset$(url)),
    ...imageUrls.map(url => getAsset$(url))
  )
}

// Caches assets from the stylesheet, scripts, and images
const cleanCache$ = cleanupCache$(8000).pipe(
  tap(() => logger.info("Attempting to clean up cache")),
  mergeMap(() =>
    merge(
      cacheAsset$("stylesheets", document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]") as NodeListOf<HTMLElement>),
      cacheAsset$("javascripts", document.querySelectorAll("script[src*=javascripts]") as NodeListOf<HTMLElement>),
      cacheAsset$("fonts", document.querySelectorAll("link[rel=stylesheet][href*=fonts]") as NodeListOf<HTMLElement>),
      cacheAsset$("images", document.querySelectorAll("img[src]") as NodeListOf<HTMLElement>),
    )
  ),
  tap(() => logger.info("Assets cached"))
)

// add analytics to each page (a simple tracking pixel)
const insertAnalytics = () => createScript("https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI", false, true)

const insertButtonScript = () => createScript("https://buttons.github.io/buttons.js", true, true)

const analytic$ = of(insertAnalytics())
const animate$ = document$.pipe(switchMap(() => subscribeToAnimation$()))
const asset$ = preloadStaticAsset$()
const buttonScript$ = of(insertButtonScript())
const color$ = of(document.body.setAttribute("data-md-color-scheme", "slate"))
const deleteCache$ = deleteOldCache$()
const font$ = from(preloadFonts())
const license$ = setupTabIconSync$()
const licenseView$ = watchLicenseHashChange$()
const table$ = watchTable$()
const windowEvents$ = from(windowEvents())


// Define page configurations
const pageConfigs: PageConfig[] = [
  {
    matcher: isHome,
    location: "home",
    observables: [
      shuffle$(),
      animate$,
      color$,
    ]
  },
  {
    matcher: isLicense,
    location: "licenses",
    observables: [license$]
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
      asset$,
      cleanCache$,
      deleteCache$,
      feedback$,
      font$,
      licenseView$,
      table$,
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
