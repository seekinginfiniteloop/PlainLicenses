/*
 * This is the main entrypoint for all JS on PlainLicense
 * It initiates a series of observables that listen for changes in the DOM
 * and then subscribes to them.
 * These subscriptions handle script loading for all pages and for
 * specific pages like the home page, license pages, and helping page.
**/
import * as bundle from "@/bundle"
import { Subscription, merge, of } from "rxjs"
import { distinctUntilChanged, distinctUntilKeyChanged, filter, mergeMap, skipUntil, tap } from "rxjs/operators"
import { feedback$ } from "~/feedback"
import { watchLicense } from "~/licenses"
import { logger } from "~/log"
import { getSubscriptionManager, isHelpingIndex, isHome, isLicense, isOnSite, locationBeacon$, watchLocationChange$, watchTable$, windowEvents } from "~/utils"
import { cacheAssets, cleanupCache, deleteOldCache, getAsset } from "./cache"
import { shuffle$ } from "./hero/imageshuffle"
import { subscribeToAnimations } from "./hero/animation"

const { document$ } = window

const manager = getSubscriptionManager()

const styleAssets = document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]")
const scriptAssets = document.querySelectorAll("script[src*=javascripts]")
const fontAssets = document.querySelectorAll("link[rel=stylesheet][href*=fonts]")
const imageAssets = document.querySelectorAll("img[src]")

document.documentElement.classList.remove("no-js")
document.documentElement.classList.add("js")


/* ------------------------------------------------------------------------ */
/*                      Setup Subscription Observables                      */
/* ------------------------------------------------------------------------ */


/* -------------------------------- Caching ------------------------------- */

// Function to preload fonts using the cache
const preloadFonts = () => {
  const fontUrls = Array.from(fontAssets)
    .map(el => el.getAttribute('href'))
    .filter((url): url is string => url !== null)

  return merge(
    ...fontUrls.map(url =>
      getAsset(url).pipe(
        tap(response => {
          response.blob().then(blob => {
            const blobUrl = URL.createObjectURL(blob)
            const fontFamily = url.includes('inter') ? 'Inter' :
                             url.includes('sourcecodepro') ? 'Source Code Pro' :
                             url.includes('raleway') ? 'Raleway' : 'Bangers'

            const font = new FontFace(fontFamily, `url(${blobUrl})`)

            font.load().then(_loadedFont => {
              document.fonts.load(`url(${blobUrl})`).then(() => {
                logger.info(`Font loaded from cache: ${url}`)
              })
              URL.revokeObjectURL(blobUrl)
              logger.info(`Font loaded from cache: ${url}`)
            }).catch(error => {
              logger.error(`Error loading font: ${fontFamily}`, error)
            })
          })
        })
      )
    )
  )
}

// Function to preload other static assets
const preloadStaticAssets = () => {
  const styleUrls = Array.from(styleAssets)
    .map(el => el.getAttribute('href'))
    .filter((url): url is string => url !== null)

  const scriptUrls = Array.from(scriptAssets)
    .map(el => el.getAttribute('src'))
    .filter((url): url is string => url !== null)

  const imageUrls = Array.from(imageAssets)
    .map(el => el.getAttribute('src'))
    .filter((url): url is string => url !== null)

  return merge(
    ...styleUrls.map(url => getAsset(url)),
    ...scriptUrls.map(url => getAsset(url)),
    ...imageUrls.map(url => getAsset(url))
  )
}


const cleanCache$ = cleanupCache(8000).pipe(
  tap(() => logger.info("Attempting to clean up cache")),
  mergeMap(() =>
    merge(
      cacheAssets("stylesheets", styleAssets as NodeListOf<HTMLElement>),
      cacheAssets("javascripts", scriptAssets as NodeListOf<HTMLElement>),
      cacheAssets("fonts", fontAssets as NodeListOf<HTMLElement>),
      cacheAssets("images", imageAssets as NodeListOf<HTMLElement>),
    )
  ),
  tap(() => logger.info("Assets cached"))
)

const deleteCache$ = deleteOldCache()

/* --------------------------- Page Observables --------------------------- */

const shuffler$ = shuffle$()
const animate$ = document$.pipe(tap(() => subscribeToAnimations()))

const homeBeacon$ = locationBeacon$.pipe(
  filter((url): url is URL => url instanceof URL),
  distinctUntilKeyChanged("pathname"),
  tap(() => logger.info("New page loaded")),
  tap(() => logger.info("Navigated to home page")),
  filter((url: URL) => isHome(url)),
  distinctUntilChanged(),
)

const atHome$ = homeBeacon$.pipe(
  tap(() => {
    logger.info("At home page")
    document.body.setAttribute("data-md-color-scheme", "slate")
    manager.addSubscription(shuffler$.subscribe())
    manager.addSubscription(animate$.subscribe())
  })
)

const license$ = watchLicense()

const atLicense$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  filter((url) => url instanceof URL && isOnSite(url) && isLicense(url)),
  distinctUntilChanged(),
  tap(() => logger.info("At license page"))
)

const atHelping$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  filter((url) => url instanceof URL && isOnSite(url) && isHelpingIndex(url)),
  tap(() => logger.info("At helping page")),
  distinctUntilChanged(),
)

const table$ = watchTable$()

const insertAnalytics = () => {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
}

const newPage$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  tap(() => logger.info("New page loaded"))
)

/**
 * Initializes a page by setting up necessary subscriptions.
 */
function initPage() {
  let initPageSubscriptions: Subscription[] = []
  const analytics$ = watchLocationChange$((url) => isOnSite(url)).pipe(
    distinctUntilKeyChanged("pathname"),
    tap(() => insertAnalytics()))
  const event$ = of(windowEvents())
  logger.info("New page loaded")
  initPageSubscriptions.push(
    preloadFonts().subscribe(),
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

/* ----------------------------- Subscriptions ---------------------------- */

manager.addSubscription(preloadStaticAssets().subscribe())
manager.addSubscription(preloadFonts().subscribe())

manager.addSubscription(atHome$.subscribe(), true)
manager.addSubscription(atHelping$.subscribe(), true)

manager.addSubscription(atLicense$.subscribe(() => {
  manager.addSubscription(license$.subscribe())
}), true)

manager.addSubscription(newPage$.pipe(skipUntil(document$)).subscribe(() => {
  initPage()
}), true)
