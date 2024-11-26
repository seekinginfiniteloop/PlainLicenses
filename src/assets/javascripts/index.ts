/*
 * This is the main entrypoint for all JS on PlainLicense
 * It initiates a series of observables that listen for changes in the DOM
 * and then subscribes to them.
 * These subscriptions handle script loading for all pages and for
 * specific pages like the home page, license pages, and helping page.
**/
import * as bundle from "@/bundle"
import { Subscription, merge, of } from "rxjs"
import { distinctUntilKeyChanged, mergeMap, skipUntil, takeWhile, tap } from "rxjs/operators"
import { feedback$ } from "~/feedback"
import { watchLicense } from "~/licenses"
import { logger } from "~/log"
import { isHome, isLicense, isOnSite, locationBeacon$, mergedUnsubscription$, unsubscribeFromAll, watchLocationChange, watchTables, windowEvents } from "~/utils"
import { cacheAssets, cleanupCache, deleteOldCache, getAsset } from "./cache"
import { setupThemeObserver } from "./hero"
import { shuffle$ } from "./hero/imageshuffle"
import { allSubscriptions } from "./hero/animation"

const { document$ } = window

const subscriptions: Subscription[] = []

const styleAssets = document.querySelectorAll("link[rel=stylesheet][href*=stylesheets]")
const scriptAssets = document.querySelectorAll("script[src*=javascripts]")
const fontAssets = document.querySelectorAll("link[rel=stylesheet][href*=fonts]")
const imageAssets = document.querySelectorAll("img[src]")

document.documentElement.classList.remove("no-js")
document.documentElement.classList.add("js")

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

            font.load().then(loadedFont => {
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


const insertAnalytics = () => {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = "https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI"
  document.head.appendChild(script)
}

const shuffler$ = shuffle$()
const animate$ = document$.pipe(tap(() => allSubscriptions()))

const atHome$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  takeWhile((url: URL) => isHome(url)),
  tap(() => {
    logger.info("At home page")
    setupThemeObserver()
    shuffler$.subscribe()
    animate$.subscribe()
  })
)

const license$ = watchLicense()

const atLicense$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  takeWhile((url: URL) => isLicense(url)),
  tap(() => {
    logger.info("At license page")
    license$.subscribe()
  })
)

const isHelpingIndex = (url: URL) => url.pathname.includes("helping") && (
  (url.pathname.split("/").length === 3 && url.pathname.endsWith("index.html")) ||
  (url.pathname.split("/").length === 2 && url.pathname.endsWith("/")))

const atHelping$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  takeWhile((url: URL) => isHelpingIndex(url)),
  tap(() => logger.info("At helping page"))
)

const table$ = watchTables()

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

const analytics$ = watchLocationChange((url) => isOnSite(url)).pipe(
  distinctUntilKeyChanged("pathname"),
  tap(() => insertAnalytics())
)

const newPage$ = locationBeacon$.pipe(
  distinctUntilKeyChanged("pathname"),
  tap(() => logger.info("New page loaded"))
)

const event$ = of(windowEvents())
const deleteCache$ = deleteOldCache()

let pageSubscriptions: Subscription[] = []

/**
 * Initializes a page by setting up necessary subscriptions.
 */
function initPage() {
  logger.info("New page loaded")
  pageSubscriptions.push(
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
  logger.info("Subscribed to new page subscriptions")
}

const onNewPage$ = newPage$.pipe(
  skipUntil(document$),
  tap(() => logger.info("New page detected"))
)

subscriptions.push(onNewPage$.subscribe({
  next: () => {
    unsubscribeFromAll(pageSubscriptions)
    initPage()
  }
}))

subscriptions.push(atHome$.subscribe())
subscriptions.push(atLicense$.subscribe())
subscriptions.push(atHelping$.subscribe())

mergedUnsubscription$(url => !isOnSite(url)).subscribe({
  next: () => {
    unsubscribeFromAll(subscriptions)
    logger.info("Unsubscribed from all subscriptions")
  },
  error: (err: Error) => logger.error("Error in cleanup:", err)
})
