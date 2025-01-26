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
 * @see {@link https://rxjs.dev/} RxJS Documentation
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API} Navigation API
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */


import * as bundle from "@/bundle"

import { Observable, combineLatest, debounceTime, distinctUntilChanged, filter, from, fromEvent, fromEventPattern, map, merge, mergeMap, of, share, shareReplay, skip, startWith, switchMap, take, takeUntil, tap, throttleTime, toArray } from "rxjs"
import Tablesort from "tablesort"

import { isLicenseHash, isValidEvent } from "./conditionChecks"
import { getLocation, watchViewportAt } from "~/browser"
import { getComponentElement, watchHeader } from "~/components"



export const NAV_EXIT_DELAY = 60000
export const PAGE_CLEANUP_DELAY = 20000

let customWindow: CustomWindow = window as unknown as CustomWindow

const { location$, viewport$ } = customWindow

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
  // @ts-ignore: "addListener" is deprecated -- kept for compatibility
  const listener = mql.addEventListener || customWindow.matchMedia(query).addListener
  // @ts-ignore: "removeListener" is deprecated -- kept for compatibility
  const remover = mql.removeEventListener || customWindow.matchMedia(query).removeListener
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

/**
 * Handles license hash changes; receives input from watchLicenseHash
 * At this point, watchLicenseHash has determined that the hash is a valid license hash
 */
const handleLicenseHash = (url: URL) => {
  if (url.pathname !== new URL(customWindow.location.href).pathname) {
    const newUrl = new URL(customWindow.location.href)
    newUrl.hash = ''
    customWindow.history.replaceState({}, '', newUrl.toString())
    customWindow.location.href = newUrl.toString()
  }
  const hash = url.hash.slice(1)
  const input = document.getElementById(hash)
  if (input) {
    (input as HTMLInputElement).checked = true
    input.dispatchEvent(new Event("change"))
  }
}

/**
 * Adds a hash change listener to the window to prevent default behavior on license hash changes
 */
function addLicenseHashListener() {
  customWindow.addEventListener("hashchange", (ev) => {
    const url = new URL(customWindow.location.href)
    if (isLicenseHash(url)) {
      preventDefault(ev)
    }
  })
}

export function watchLicenseHash() {
  // combine the initial navigation value (the URL on subscription)
  // with subsequent navigation events
  // will only emit once there has been a navigation event after subscription
  return combineLatest([navigationEvents$.pipe(
    take(1),
    tap(() => addLicenseHashListener())),
  navigationEvents$.pipe(
    // skip the first value, as we've already handled it
    skip(1),
    // only emit while the pathname remains the same (i.e., we're watching the same page for hash changes)
    takeUntil(
      navigationEvents$.pipe(
        distinctUntilChanged(
          (prev, curr) => prev.pathname === curr.pathname))),
  )
  ]
  ).pipe(
    filter(
      ([first, second]) => first.pathname === second.pathname),
    map(([_, second]) => second),
    filter((url) => isLicenseHash(url)),
    tap(handleLicenseHash),
  )
}
