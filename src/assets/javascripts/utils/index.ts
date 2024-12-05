/**
 * Utility functions for the site; primarily provides observables and classes for managing subscriptions.
 * @module utils
 * @license Plain Unlicense (Public Domain)
 */

import { getLocation } from "~/browser"
import * as bundle from "~/bundle"
import { BehaviorSubject, Observable, Subject, Subscription, fromEvent, fromEventPattern, merge, of } from "rxjs"
import { debounceTime, distinctUntilChanged, filter, map, shareReplay, tap } from "rxjs/operators"
import Tablesort from "tablesort"
import { logger } from "~/log"

export const NAV_EXIT_DELAY = 60000
export const PAGE_CLEANUP_DELAY = 20000

let customWindow: CustomWindow = window as unknown as CustomWindow

export const prefersReducedMotion = () => customWindow.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Returns true if the element is visible in the viewport
 * @param el the element to test
 * @returns boolean true if the element is visible
 */
export function isElementVisible(el: Element | null): boolean {
  if (!el) {
    return false
  }

  const rect = el.getBoundingClientRect()
  const vWidth = customWindow.innerWidth || document.documentElement.clientWidth
  const vHeight = customWindow.innerHeight || document.documentElement.clientHeight
  const efp = (x: number, y: number) => document.elementFromPoint(x, y)

  if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
    return false
  }

  return (
    el.contains(efp(rect.left, rect.top)) ||
    el.contains(efp(rect.right, rect.top)) ||
    el.contains(efp(rect.right, rect.bottom)) ||
    el.contains(efp(rect.left, rect.bottom))
  )
}

type InteractionHandler<E, R> = (_events$: Observable<E>) => Observable<R>

/**
 * Creates an observable that emits events from the specified event targets
 * This is a generic constructor for creating interaction observables
 * @param ev the event target or array of event targets
 * @param handler an optional handler function for the observable
 * @returns an observable that emits events, or if a handler is provided, what the handler returns
 */
export function createInteractionObservable<R>(
  ev: EventTarget | EventTarget[],
  handler?: InteractionHandler<Event, R>
): Observable<R | Event> {
  const eventTargets = Array.isArray(ev) ? ev : [ev]
  const validEventTargets = eventTargets.filter(target => target != null)

  const click$ = merge(...validEventTargets.map(target => fromEvent<Event>(target, "click")))
  const touchend$ = merge(...validEventTargets.map(target => fromEvent<Event>(target, "touchend")))

  const events$ = merge(click$, touchend$).pipe(filter(event => event != null))

  return handler ? handler(events$) : events$
}

/**
 * Sets a CSS variable on the document element
 * @param name name of the variable (e.g. data-theme)
 * @param value value to set
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

// tests if the URL is the home page
export const isHome = (url: URL) => { return url.pathname === "/" || url.pathname === "/index.html" }

// tests if the URL is a license page
const isLicensePage = (url: URL) => { return (url.pathname.endsWith("index.html") && url.pathname.split("/").length === 5) || (url.pathname.endsWith("/") && url.pathname.split("/").length === 4) }

/**
 * Tests if the URL is a license page
 * @param url the url to test
 * @returns boolean true if the URL is a license page
 */
export const isLicense = (url: URL) => { return url.pathname.includes("licenses") && isLicensePage(url) }

/**
 * Tests if the URL is the helping index page
 * @param url the url to test
 * @returns boolean true if the URL is the helping index page
 */
export const isHelpingIndex = (url: URL) => { return url.pathname.includes("helping") && (
  (url.pathname.split("/").length === 3 && url.pathname.endsWith("index.html")) ||
    (url.pathname.split("/").length === 2 && url.pathname.endsWith("/")))
}

/**
 * Tests if the site is in a production environment
 * @param url the url to test
 * @returns boolean true if the site is in production
 */
const isProd = (url: URL) => { return url.hostname === "plainlicense.org" && url.protocol === "https:" }

// tests if the site is in a development environment
const isDev = (url: URL) => { return (url.hostname === "localhost" && url.port === "8000") || (url.hostname === "127.0.0.1" && url.port === "8000") }

// tests if the URL is on the site
export const isOnSite = (url: URL) => { return isProd(url) || isDev(url) }

// A behavior subject that emits the current location of the window
export const locationBehavior$ = new BehaviorSubject<URL>(getLocation())

// Tests if the event is a valid event (that is not null and is an instance of Event)
const isValidEvent = (value: Event | null) => { return value !== null && value instanceof Event }

// Gets the URL of the event from a legacy navigation event
const getEventUrl = (ev: Event) => {
  if (ev.type === "popstate" || ev.type === "beforeunload") {
    return getLocation()
  } else if (ev.type === "hashchange") {
    const hashChangeEvent = ev as HashChangeEvent
    return hashChangeEvent.newURL ? new URL(hashChangeEvent.newURL) : getLocation()
  } else if (ev.type === "pageshow") {
    const pageTransitionEvent = ev as PageTransitionEvent
    return pageTransitionEvent.persisted ? getLocation() : new URL(customWindow.location.href)
  }
  return getLocation()
}

const navigationEvents$ = 'navigation' in window ?
  // If the browser supports the navigation event, we use it
  fromEventPattern<NavigateEvent>(
    handler => customWindow.navigation.addEventListener('navigate', handler),
    handler => customWindow.navigation.removeEventListener('navigate', handler)
  ).pipe(
    filter((event) => event !== null && event instanceof NavigateEvent),
    map((event) => { return new URL((event as NavigateEvent).destination.url) }))
  : // otherwise we use the browser's built-in events
  merge(
    fromEvent(customWindow, 'popstate'),
    fromEvent(customWindow, 'hashchange'),
    fromEvent(customWindow, 'pageshow'),
    fromEvent(customWindow, 'beforeunload'),
  ).pipe(
    filter(event => isValidEvent(event as Event)),
    map((event) => { return getEventUrl(event as Event) })
  )
export const locationBeacon$ = merge(locationBehavior$, navigationEvents$).pipe(
  filter((value) => value !== null),
  distinctUntilChanged(),
  shareReplay(1)
)

export const watchLocationChange$ = (urlFilter: (_url: URL) => boolean) => {
  return locationBeacon$.pipe(
    filter(url => url instanceof URL), filter(urlFilter))
}

/**
 * Pushes a new URL to the browser history and updates the location behavior subject.
 * @param url The URL to push.
 */
export function pushUrl(url: string) {
  history.pushState(null, '', url)
  locationBehavior$.next(new URL(customWindow.location.href))
}

/**
 * An an observable for watching table elements and applying Tablesort to them
 * @returns an observable that emits when a table is found
 */
export const watchTable$ = () => {
  const tables = document.querySelectorAll("article table:not([class])")
  const observables = () => tables.length > 0 ? Array.from(tables).map(table => of(table).pipe(map(table => table as HTMLTableElement), tap((table) => new Tablesort(table)))) : []
  return merge(...observables())
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
 * Manages observable subscriptions for site and each visited page.
 * Serves as a central manager for subscriptions that need to be cleaned up when the user navigates away from the site or page.
 */
export class SubscriptionManager {

  private siteWideSubscriptions: Map<Subscription, boolean> = new Map()

  private pageSubscriptions: Map<string, Subscription[]> = new Map()

  private currentPageUrl: string = locationBehavior$.value.pathname

  private siteExit$ = new Subject<void>()

  private pageExit$ = new Subject<void>()

  private cleanupTimeout: number | null = null

  constructor() {
    if (customWindow.subscriptionManager) {
      return customWindow.subscriptionManager
    }
    this.setupSiteExit()
    this.setupPageExit()
  }

  private setupSiteExit() {
    locationBeacon$.pipe(
      filter(url => url instanceof URL && !isOnSite(url)),
      debounceTime(NAV_EXIT_DELAY)
    ).subscribe(() => {
      this.siteExit$.next()
    })
  }

  private setupPageExit() {
    locationBeacon$.pipe(
      debounceTime(1000),
      filter(url => url instanceof URL && isOnSite(url)),
    ).subscribe((url: URL) => {
    const newPath = url.pathname
    if (newPath !== this.currentPageUrl) {
      this.cleanup() // Cancel any pending cleanup
      this.schedulePageCleanup(this.currentPageUrl)
      this.currentPageUrl = newPath
    }
    this.pageExit$.next()
  })
  }

  public addSubscription(subscription: Subscription, isSiteWide: boolean = false) {
    if (isSiteWide) {
      logger.info("Adding site-wide subscription")
      this.siteWideSubscriptions.set(subscription, true)
      this.siteExit$.subscribe(() => subscription.unsubscribe())
    } else {
      logger.info("Adding page-specific subscription")
      const pageSubscriptions = this.pageSubscriptions.get(this.currentPageUrl) || []
      pageSubscriptions.push(subscription)
      this.pageSubscriptions.set(this.currentPageUrl, pageSubscriptions)
    }
  }

  public removeSubscription(subscription: Subscription | Subscription[]) {
    const subs = Array.isArray(subscription) ? subscription : [subscription]

    subs.forEach(sub => {
      // Remove from site-wide subscriptions
      if (this.siteWideSubscriptions.has(sub)) {
        logger.info("Removing site-wide subscription")
        this.siteWideSubscriptions.delete(sub)
        sub.unsubscribe()
      }

      // Remove from page-specific subscriptions
      for (const [page, pageSubs] of this.pageSubscriptions.entries()) {
        const filtered = pageSubs.filter(s => s !== sub)
        if (filtered.length !== pageSubs.length) {
          logger.info("Removing page-specific subscription")
          this.pageSubscriptions.set(page, filtered)
          sub.unsubscribe()
        }
      }
    })
  }

  public schedulePageCleanup(pageUrl: string) {
    this.cleanupTimeout = customWindow.setTimeout(() => {
    this.clearPageSubscriptions(pageUrl)
    this.cleanupTimeout = null
  }, PAGE_CLEANUP_DELAY)
  }

  public cleanup(): void {
    if (this.cleanupTimeout) {
      customWindow.clearTimeout(this.cleanupTimeout)
      this.cleanupTimeout = null
    }
  }

  private clearPageSubscriptions(pageUrl: string) {
    const pageSubscriptions = this.pageSubscriptions.get(pageUrl) || []
    pageSubscriptions.forEach(sub => sub.unsubscribe())
    this.pageSubscriptions.delete(pageUrl)
    logger.info(`Cleared subscriptions for page: ${pageUrl}`)
  }

  public clearAllSubscriptions() {
    // Clear site-wide subscriptions
    for (const sub of this.siteWideSubscriptions.keys()) {
      sub.unsubscribe()
    }
    this.siteWideSubscriptions.clear()

    // Clear all page subscriptions
    for (const [_, subs] of this.pageSubscriptions) {
      subs.forEach(sub => sub.unsubscribe())
    }
    this.pageSubscriptions.clear()

    this.siteExit$.next()
    this.pageExit$.next()
    logger.info("Cleared all subscriptions")
  }
}

export type SubscriptionManagerType = SubscriptionManager

/**
 * Getter function for the SubscriptionManager singleton.
 * We don't need to call the class directly. This function manages the instance.
 * @returns The SubscriptionManager singleton.
 */
export const getSubscriptionManager = () => {
  try {
    if (customWindow.subscriptionManager) {
      return customWindow.subscriptionManager
    } else {
      customWindow.subscriptionManager = new SubscriptionManager()
      return customWindow.subscriptionManager
    }
  } catch {
    throw new Error("SubscriptionManager could not be initialized.")
  }
}
// Example usage:
// const subscriber = getSubscriptionManager();
// subscriber.addSubscription(yourSubscription, true);
