/**
 * Manages the initialization and subscription of various observables for
 * PlainLicense.
 *
 * This module sets up observables that listen for changes in the DOM,
 * handles asset preloading, and manages subscriptions for different pages
 *  such as the home page, license pages, and helping pages. It ensures that resources
 * are cleaned up
 * appropriately when navigating between pages to prevent memory leaks and improve performance.
 */

import * as bundle from "@/bundle"
import { Subscription, firstValueFrom, merge, of } from "rxjs"
import { distinctUntilKeyChanged, filter, mergeMap, skipUntil, switchMap, tap } from "rxjs/operators"
import { feedback$ } from "~/feedback"
import { watchLicense } from "~/licenses"
import { logger } from "~/log"
import { SubscriptionManager, isHelpingIndex, isHome, isLicense, isOnSite, locationBeacon$, watchLocationChange$, watchTable$, windowEvents } from "~/utils"
import { cacheAssets, cleanupCache, deleteOldCache, getAsset } from "./cache"
import { shuffle$ } from "./hero/imageshuffle"
import { subscribeToAnimations } from "./hero/animation"

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$ } = customWindow
const manager = new SubscriptionManager()
customWindow.subscriptionManager = manager

document.documentElement.classList.remove("no-js")
document.documentElement.classList.add("js")

/**
 * Extracts URLs from a NodeList of elements based on a specified attribute.
 * @param elements The elements to extract URLs from.
 * @param attribute The attribute to retrieve the URL from.
 * @returns An array of URLs extracted from the specified attribute.
 */
const extractUrls = (elements: NodeListOf<Element>, attribute: string): string[] =>
  Array.from(elements)
    .map(el => el.getAttribute(attribute))
    .filter((url): url is string => url !== null)

/**
 * Preloads fonts by fetching them and adding them to the document.
 * @returns A promise that resolves when all fonts have been preloaded.
 */
const preloadFonts = async () => {
  const fontUrls = extractUrls(document.querySelectorAll("link[rel=stylesheet][href*=fonts]"), 'href')
  for (const url of fontUrls) {
    try {
      const response = getAsset(url)
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

/**
 * Preloads static assets such as stylesheets, scripts, and images.
 * @returns An observable that completes when all static assets have been preloaded.
 */
const preloadStaticAssets = () => {
  const styleUrls = extractUrls(document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]"), 'href')
  const scriptUrls = extractUrls(document.querySelectorAll("script[src*=javascripts]"), 'src')
  const imageUrls = extractUrls(document.querySelectorAll("img[src]"), 'src')

  return merge(
    ...styleUrls.map(url => getAsset(url)),
    ...scriptUrls.map(url => getAsset(url)),
    ...imageUrls.map(url => getAsset(url))
  )
}

/**
 * Cleans up the cache after a specified delay and caches new assets.
 * @returns {Observable<void>} An observable that completes when the cache cleanup and asset caching are done.
 */
const cleanCache$ = cleanupCache(8000).pipe(
  tap(() => logger.info("Attempting to clean up cache")),
  mergeMap(() =>
    merge(
      cacheAssets("stylesheets", document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]") as NodeListOf<HTMLElement>),
      cacheAssets("javascripts", document.querySelectorAll("script[src*=javascripts]") as NodeListOf<HTMLElement>),
      cacheAssets("fonts", document.querySelectorAll("link[rel=stylesheet][href*=fonts]") as NodeListOf<HTMLElement>),
      cacheAssets("images", document.querySelectorAll("img[src]") as NodeListOf<HTMLElement>),
    )
  ),
  tap(() => logger.info("Assets cached"))
)

/**
 * Deletes old cache entries.
 * @returns {Observable<void>} An observable that completes when the old cache entries have been deleted.
 */
const deleteCache$ = deleteOldCache()

/**
 * Initializes the shuffler observable for hero images.
 * @returns {Observable<void>} The observable for shuffling images.
 */
const shuffler$ = shuffle$()
const animate$ = document$.pipe(switchMap(() => of(subscribeToAnimations())))

/**
 * Observes changes to the home page URL.
 * @returns {Observable<URL>} An observable that emits the new home page URL when navigated.
 */
const homeBeacon$ = locationBeacon$.pipe(
  filter((url): url is URL => url instanceof URL),
  distinctUntilKeyChanged("pathname"),
  tap(() => logger.info("New page loaded")),
  tap(() => logger.info("Navigated to home page")),
  filter((url: URL) => isHome(url)),
)

/**
 * Observes when the user is at the home page.
 * @returns {Observable<void>} An observable that triggers actions when at the home page.
 */
const atHome$ = homeBeacon$.pipe(
  tap(() => {
    logger.info("At home page")
    document.body.setAttribute("data-md-color-scheme", "slate")
    manager.addSubscription(shuffler$.subscribe())
    manager.addSubscription(animate$.subscribe())
  })
)

/**
 * Observes license-related changes.
 * @returns {Observable<void>} An observable that emits license-related events.
 */
const license$ = watchLicense()

/**
 * Observes when the user is at the license page.
 * @returns {Observable<void>} An observable that triggers actions when at the license page.
 */
const atLicense$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  filter((url) => url instanceof URL && isOnSite(url) && isLicense(url)),
  tap(() => logger.info("At license page"))
)

/**
 * Observes when the user is at the helping page.
 * @returns {Observable<void>} An observable that triggers actions when at the helping page.
 */
const atHelping$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  filter((url) => url instanceof URL && isOnSite(url) && isHelpingIndex(url)),
  tap(() => logger.info("At helping page")),
)

/**
 * Observes changes to the table.
 * @returns {Observable<void>} An observable that emits table-related events.
 */
const table$ = watchTable$()

/**
 * Inserts analytics script into the document.
 */
const insertAnalytics = () => {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
}

/**
 * Observes new page loads.
 * @returns {Observable<void>} An observable that emits when a new page is loaded.
 */
const newPage$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  tap(() => logger.info("New page loaded"))
)

/**
 * Initializes a new page by setting up necessary subscriptions and preloading assets.
 */
function initPage() {
  let initPageSubscriptions: Subscription[] = []
  const analytics$ = watchLocationChange$((url) => isOnSite(url)).pipe(
    distinctUntilKeyChanged("pathname"),
    tap(() => insertAnalytics()))
  const event$ = of(windowEvents())
  logger.info("New page loaded")

  initPageSubscriptions.push(
    of(preloadFonts().then(() => {}).catch(() => {})
    ).subscribe(),
    preloadStaticAssets().subscribe(),
    of(bundle).subscribe(),
    event$.subscribe(),
    analytics$.subscribe(),
    table$.subscribe(),
    feedback$.subscribe(),
    cleanCache$.subscribe(),
    deleteCache$.subscribe()
  )
  initPageSubscriptions.forEach(sub => manager.addSubscription(sub))
  logger.info("Subscribed to new page subscriptions")
}

// Add subscriptions for various page states
manager.addSubscription(atHome$.subscribe(), true)
manager.addSubscription(atHelping$.subscribe(), true)

manager.addSubscription(atLicense$.subscribe(() => {
  manager.addSubscription(license$.subscribe())
}), true)

manager.addSubscription(newPage$.pipe(skipUntil(document$)).subscribe(() => {
  initPage()
}), true)
