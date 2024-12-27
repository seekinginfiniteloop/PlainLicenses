/**
 * @module EventHandlers
 * @description Reactive event handling and observation utilities
 *
 * @overview
 * Provides event management and observation capabilities using RxJS,
 * covering navigation, viewport, media queries, visibility, and custom browser interactions.
 *
 * Key Features:
 * - Reactive navigation event streams
 * - Viewport and scroll monitoring
 * - Media query and visibility tracking
 * - Cross-browser event normalization
 * - Custom event handling for specific interactions
 *
 * @dependencies
 * - RxJS
 * - Tablesort
 * - Custom browser utilities
 *
 * @exports
 * -----------------
 * @const navigationEvents$: Observable tracking navigation events
 * @function watchMediaQuery: Function to observe media query states
 * @function watchViewportResize: Function to track viewport changes
 * @function watchLicenseHashChange: Function to manage license link interactions
 * @function watchEasterEgg: Function to observe Easter egg dialog states
 * @function watchTables: Function to observe and apply Tablesort to tables
 * @function isPartiallyInViewport: Function to check if an element is partially in the viewport
 * @const isPageVisible$: Observable tracking page visibility
 * @const prefersReducedMotion$: Observable for reduced motion preference
 * @function setCssVariable: Utility for setting CSS variables
 * @function watchPathnameChange: Function to observe pathname changes
 * @function watchScroll$: Function to track scroll position
 *
 * @see {@link https://rxjs.dev/} RxJS Documentation
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API} Navigation API
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */


import * as bundle from "@/bundle"

import { Observable, debounceTime, defer, distinctUntilChanged, filter, from, fromEvent, fromEventPattern, map, merge, mergeMap, of, share, shareReplay, startWith, switchMap, tap, throttleTime, toArray } from "rxjs"
import Tablesort from "tablesort"

import { isEggBoxOpen, isLicense, isValidEvent } from "./conditionChecks"
import { getLocation, watchViewportAt } from "~/browser"
import { getComponentElement, watchHeader } from "~/components"

import { logger } from "~/log"

const LICENSE_HASHES = ["#reader", "#html", "#markdown", "#plaintext", "#changelog", "#official"]
export const NAV_EXIT_DELAY = 60000
export const PAGE_CLEANUP_DELAY = 20000

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$, location$, viewport$ } = customWindow

export const preventDefault = (ev: Event) => { ev.preventDefault(); return ev }

/**
 * Watches a media query and emits a boolean indicating if it matches.
 * Applies debouncing to limit recalculations during rapid changes.
 * Uses either the `matchMedia` API or the deprecated `addListener` method
 * as a fallback for older browsers.
 *
 * @param query The media query string.
 * @returns An observable emitting the match status.
 */
export const watchMediaQuery = (query: string): Observable<boolean> => {
  const mql = customWindow.matchMedia(query)
  const listener = mql.addEventListener || customWindow.matchMedia(query).addListener  // @ts-ignore: "addListener" is deprecated -- kept for compatibility
  const remover = mql.removeEventListener || customWindow.matchMedia(query).removeListener  // @ts-ignore: "removeListener" is deprecated -- kept for compatibility
   return merge(fromEventPattern<boolean>(
     handler => listener("change", () => handler(mql.matches)),
     handler => remover("change", () => handler(mql.matches))
   ),
   of(mql.matches).pipe(startWith(mql.matches))
   ).pipe(
     debounceTime(150),
     distinctUntilChanged(),
     shareReplay(1),
   )
}

/**
 * Emits a boolean indicating if the page is visible.
 * Applies debouncing to manage rapid visibility changes.
 * @returns An observable emitting the visibility status.
 */
export const isPageVisible$ = fromEvent(document, "visibilitychange")
  .pipe(map(() => !document.hidden || document.visibilityState === "visible"), debounceTime(200), distinctUntilChanged(), startWith(document.visibilityState === "visible"), shareReplay(1))

export const prefersReducedMotion$ = watchMediaQuery("(prefers-reduced-motion: reduce)").pipe(share())

/**
 * Watches window resize events and emits the latest viewport size.
 * Applies debouncing to prevent excessive updates.
 * @returns An observable emitting the current viewport dimensions.
 */
export const watchViewportResize = (): Observable<{ width: number, height: number }> => {
  return fromEvent(customWindow, "resize").pipe(
    debounceTime(200),
    map(() => ({
      width: customWindow.innerWidth,
      height: customWindow.innerHeight
    })),
    distinctUntilChanged((prev, curr) => prev.width === curr.width && prev.height === curr.height),
    startWith({
      width: customWindow.innerWidth,
      height: customWindow.innerHeight
    })
  )
}

/**
 * Watches scroll events and emits the current scroll position.
 * Applies throttling to limit the frequency of emissions.
 * @returns An observable emitting the current scroll position.
 */
export const watchScroll$ = (): Observable<{ scrollX: number, scrollY: number }> => {
  return fromEvent(customWindow, "scroll").pipe(
    throttleTime(100), // Adjust throttle time as needed
    map(() => ({
      scrollX: customWindow.scrollX,
      scrollY: customWindow.scrollY
    })),
    startWith({
      scrollX: customWindow.scrollX,
      scrollY: customWindow.scrollY
    })
  )
}

const header$ = watchHeader(getComponentElement("header"), { viewport$ })

/**
 * Emits a boolean indicating if an element is partially in the viewport.
 * @param el The element to observe.
 * @returns An observable emitting the visibility status.
 */
export function isPartiallyInViewport(el: HTMLElement): Observable<boolean> {
  return watchViewportAt(el, { viewport$, header$ }).pipe(
    map(({ offset: { y }, size: { height } }) => {
      const elementHeight = el.offsetHeight
      return y < height && (y + elementHeight) > 0
    }),
    distinctUntilChanged(),
    shareReplay(1)
  )
}

/**
 * Sets a CSS variable on the document element
 * @param name name of the variable (e.g. data-theme)
 * @param value value to set
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}


// maps the URL from a legacy event
const mapLocation = (ev: Event) => {
  const eventMap = {
    beforeunload: (ev.target && (ev.target instanceof HTMLAnchorElement)) ? new URL((ev.target as HTMLAnchorElement).href) : getLocation(),
    popstate: (ev as PopStateEvent).state ? new URL((ev as PopStateEvent).state.url) : getLocation(),
    hashchange: (ev as HashChangeEvent).newURL ? new URL((ev as HashChangeEvent).newURL) : getLocation(),
    pageshow: (ev as PageTransitionEvent).persisted ? getLocation() : new URL(customWindow.location.href)
  }
  return eventMap[ev.type as keyof typeof eventMap] || getLocation()
}

export const navigationEvents$ = 'navigation' in customWindow ?
  // If the browser supports the navigation event, we use it

  fromEventPattern<NavigateEvent>(
    handler => customWindow.navigation.addEventListener('navigate', handler),
    handler => customWindow.navigation.removeEventListener('navigate', handler)
  ).pipe(
    filter((event) => event !== null && event instanceof NavigateEvent),
    map((event) => { return new URL((event as NavigateEvent).destination.url) }),
    startWith(getLocation()),
    shareReplay(1),
    share()
  )
  : // otherwise we use the browser's built-in events
  merge(merge(
    fromEvent(customWindow, 'popstate'),
    fromEvent(customWindow, 'hashchange'),
    fromEvent(customWindow, 'pageshow'),
    fromEvent(customWindow, 'beforeunload'),
  ).pipe(
    filter(event => isValidEvent(event as Event)),
    map((event) => { return mapLocation(event as Event) }),
  ),
  location$.pipe(
    distinctUntilChanged(),
  )
  ).pipe(
    startWith(getLocation()),
    shareReplay(1),
    share())

/**
 * Observes changes to the location pathname.
 * @param predicate A function that determines whether the URL should be emitted.
 * @returns An observable that emits the new URL when the location pathname changes.
 */
export function watchPathnameChange(predicate: (_url: URL) => boolean) {
  return navigationEvents$.pipe(
    distinctUntilChanged((prev, curr) => prev.pathname === curr.pathname),
    filter((url) => predicate(url)),
    startWith(getLocation()),
    shareReplay(1),
    share()
  )
}

/**
 * An an observable for watching table elements and applying Tablesort to them
 * @returns an observable that emits when a table is found or null if no tables are found
 */
export const watchTables = () => {
  const tables = document.querySelectorAll("article table:not([class])")
  const observables = () => tables.length > 0 ? from(tables).pipe(toArray(), mergeMap(table => table), filter(table => table instanceof HTMLTableElement), tap((table) => new Tablesort(table))) : from([])
  return navigationEvents$.pipe(switchMap(observables), share())
}

/**
 * A function that checks for presence of missing observables on the global customWindow object. If any are missing, it reloads the material mkdocs entrypoint.
 */
export async function windowEvents() {
  const { document$, location$, target$, keyboard$, viewport$, tablet$, screen$, print$, alert$, progress$, component$ } = customWindow
  const observables = { document$, location$, target$, keyboard$, viewport$, tablet$, screen$, print$, alert$, progress$, component$ }
  let observablesMissing = false
  for (const key in observables) {
    if (!(globalThis as any)[key]) {
      observablesMissing = true
    }
  }
  if (observablesMissing) {
    bundle // reload material entrypoint
  }
}

const isLicenseLink = (link: HTMLAnchorElement) =>
  link.href.includes("licenses") &&
  isLicense(new URL(link.href)) &&
  !new URL(link.href).hash

const isHashedLink = (link: HTMLAnchorElement) =>
  LICENSE_HASHES.some(hash => link.href.includes(hash))

/**
 * Uses the navigationEvents$ observable to watch for license hash changes and
 * navigate to the appropriate license section. The license hashes are really
 * just the IDs of the license sections.
 *
 * @returns {Observable} An observable stream handling license link navigation events
 */
export const watchLicenseHashChange = () => {
  const allLinks = Array.from(document.getElementsByTagName("a"))

  const unhashedLicenseLinks = allLinks.filter(isLicenseLink)
  const hashedLinks = allLinks.filter(isHashedLink)

  unhashedLicenseLinks.forEach(link =>
    link.addEventListener("click", () => {
      document$.subscribe(() => {
        const readerElement = document.getElementById("reader") as HTMLInputElement
        if (readerElement) {
          readerElement.checked = true
        }
      })
    })
  )

  hashedLinks.forEach(link =>
    link.addEventListener("click", preventDefault)
  )

  const navigationWatcher$ = navigationEvents$.pipe(
    filter(url => LICENSE_HASHES.includes(url.hash)),
    shareReplay(1)
  )

  const linkWatcher$ = fromEventPattern<Event>(
    handler => hashedLinks.forEach(link => link.addEventListener("click", handler)),
    handler => hashedLinks.forEach(link => link.removeEventListener("click", handler))
  ).pipe(
    map(ev => new URL((ev.target as HTMLAnchorElement).href)),
    filter(url => LICENSE_HASHES.includes(url.hash)),
    shareReplay(1)
  )

  const handleHashChange = (url: URL) => {
    if (getLocation().pathname !== url.pathname) {
      customWindow.location.href = url.href.replace(url.hash, "")
    }

    const inputElement = document.getElementById(url.hash.slice(1))
    if (inputElement instanceof HTMLInputElement) {
      inputElement.checked = true
      inputElement.dispatchEvent(new Event("change"))
      inputElement.parentElement?.querySelector(".tabbed-content")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return merge(navigationWatcher$, linkWatcher$).pipe(
    mergeMap(url => of(handleHashChange(url)))
  )
}

/**
 * Watches for the Easter egg dialog to open, close, or be cancelled
 * @returns An observable that emits when the Easter egg dialog is opened, closed, or cancelled
 */
export const watchEasterEgg = () => {
  const eggInfoBox = document.getElementById("egg-box") as HTMLDialogElement

  return merge(
    fromEvent(eggInfoBox, "close"),
    fromEvent(eggInfoBox, "cancel"),
    fromEvent(eggInfoBox, "show")
  ).pipe(filter(isValidEvent), map(() => isEggBoxOpen()), distinctUntilChanged(), startWith(isEggBoxOpen()), shareReplay(1), share())
}


// ! TODO: This is a placeholder for the cache worker
async function initCacheWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/image-sw.js', {
          scope: '/assets/images/' // Limit SW to just image requests
        })

        // Wait for the SW to be ready
      await navigator.serviceWorker.ready
      this.serviceWorkerReady.next(true)

        // Optional: listen for SW messages
      navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'IMAGE_CACHED') {
            // Handle newly cached image
            logger.info(`Image cached by SW: ${event.data.url}`)
          }
        })
    } catch (error) {
      logger.error('ServiceWorker registration failed:', error)
    }
  }
}

export const cacheWorker$ = defer(() => initCacheWorker()).pipe(shareReplay(1))
