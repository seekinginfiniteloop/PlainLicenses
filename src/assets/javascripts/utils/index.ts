/**
 * Utility functions for the site; primarily provides observables and classes for managing subscriptions.
 * @module utils
 * @license Plain Unlicense (Public Domain)
 */

import { getLocation, watchElementBoundary } from "~/browser"
import * as bundle from "~/bundle"
import { Observable, debounceTime, distinctUntilKeyChanged, filter, fromEvent, fromEventPattern, map, merge, mergeMap, of, shareReplay, startWith, tap } from "rxjs"
import Tablesort from "tablesort"

export const NAV_EXIT_DELAY = 60000
export const PAGE_CLEANUP_DELAY = 20000

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$, location$ } = customWindow

/**
 * Constructs an observable that watches a media query for changes.
 * @param query The media query to watch.
 * @returns An observable that emits a boolean value indicating whether the media query matches.
 */
export function watchMediaQuery(query: string): Observable<boolean> {
  const media = customWindow.matchMedia(query)
  const listener = customWindow.matchMedia(query).addEventListener || customWindow.matchMedia(query).addListener  // @ts-ignore: "addListener" is deprecated -- kept for compatibility

  return fromEventPattern<boolean>(
    handler => listener("change", () => handler(media.matches)),
    handler => listener("change", () => handler(media.matches))
  ).pipe(
    map(() => media.matches),
    startWith(media.matches)
  )
}

export const prefersReducedMotion = () => customWindow.matchMedia("(prefers-reduced-motion: reduce)").matches

export const prefersReducedMotion$ =
  watchMediaQuery("(prefers-reduced-motion: reduce)").pipe(startWith(prefersReducedMotion()), shareReplay(1))


/**
 * Returns observable that emits when the
 * @param el the element to test
 * @returns boolean true if the element is visible
 */
export function ElementNotVisible$(el: Element | null): Observable<boolean> {
  const elHeight = el?.clientHeight || 0
  return watchElementBoundary(el as HTMLElement, 0 - elHeight).pipe(debounceTime(100), shareReplay(1))
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

// Tests if the event is a valid event (that is not null and is an instance of Event)
const isValidEvent = (value: Event | null) => { return value !== null && value instanceof Event }

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

export const navigationEvents$ = 'navigation' in window ?
  // If the browser supports the navigation event, we use it
  fromEventPattern<NavigateEvent>(
    handler => customWindow.navigation.addEventListener('navigate', handler),
    handler => customWindow.navigation.removeEventListener('navigate', handler)
  ).pipe(
    filter((event) => event !== null && event instanceof NavigateEvent),
    map((event) => { return new URL((event as NavigateEvent).destination.url) }),
    startWith(getLocation()),
    shareReplay(1)
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
    startWith(getLocation()),
    shareReplay(1)
  ),
  location$.pipe(distinctUntilKeyChanged("pathname"), startWith(getLocation()), shareReplay(1))
  )

/**
 * Observes changes to the location pathname.
 * @param predicate A function that determines whether the URL should be emitted.
 * @returns An observable that emits the new URL when the location pathname changes.
 */
export function watchPathnameChange$(predicate: (_url: URL) => boolean) {
  return navigationEvents$.pipe(
    distinctUntilKeyChanged("pathname"),
    filter((url) => predicate(url)),
    startWith(getLocation()),
    shareReplay(1)
  )
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

export const watchLicenseHashChange$ = () => {
  const hashes = ["#reader", "#html", "#markdown", "#plaintext", "#changelog", "#official"]
  const allLinks = Array.from(document.getElementsByTagName("a"))

  const unhashedLicenseLinks = allLinks.filter(link =>
    link.href.includes("licenses") &&
    isLicensePage(new URL(link.href)) &&
    !new URL(link.href).hash
  )
  unhashedLicenseLinks.forEach(link =>
    link.addEventListener("click", () => {
      document$.subscribe(() => {
        const readerElement = document.getElementById("reader") as HTMLInputElement
        if (readerElement) {
          readerElement.checked = true
        }
      })
    }))

  const hashedLinks = allLinks.filter(link =>
    hashes.some(hash => link.href.includes(hash))
  )
  hashedLinks.forEach(link =>
    link.addEventListener("click", e => e.preventDefault())
  )

  const filterHash = (url: URL) => hashes.includes(url.hash)

  const navigationWatcher$ = navigationEvents$.pipe(
    filter(filterHash),
    shareReplay(1)
  )

  const linkWatcher$ = fromEventPattern<Event>(
    handler => hashedLinks.forEach(link => link.addEventListener("click", handler)),
    handler => hashedLinks.forEach(link => link.removeEventListener("click", handler))
  ).pipe(
    map(ev => new URL((ev.target as HTMLAnchorElement).href)),
    filter(filterHash),
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
export class ImageValidationHandler {
  static validateNaturalDimensions(img: HTMLImageElement): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: []
    };

    if (!img || !(img instanceof HTMLImageElement)) {
      result.errors.push('Not a valid HTMLImageElement');
      return result;
    }

    // Check if image is properly loaded with natural dimensions
    if (!Number.isFinite(img.naturalWidth) || !Number.isFinite(img.naturalHeight)) {
      result.errors.push('Natural dimensions are not available - image may not be loaded');
      return result;
    }

    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      result.errors.push('Natural dimensions must be positive numbers');
      return result;
    }

    result.isValid = true;
    return result;
  }

  static validateDOMTestResult(
    dimensions: {
      naturalWidth: number;
      naturalHeight: number;
      boundingRect: DOMRect;
    }
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: []
    };

    // Validate natural dimensions match what we expect
    if (!Number.isFinite(dimensions.naturalWidth) || dimensions.naturalWidth <= 0) {
      result.errors.push('Invalid natural width from DOM test');
    }
    if (!Number.isFinite(dimensions.naturalHeight) || dimensions.naturalHeight <= 0) {
      result.errors.push('Invalid natural height from DOM test');
    }

    // Validate bounding rect dimensions
    if (!dimensions.boundingRect) {
      result.errors.push('Missing bounding rect');
    } else {
      const { width, height } = dimensions.boundingRect;
      if (!Number.isFinite(width) || width <= 0) {
        result.errors.push('Invalid bounding rect width');
      }
      if (!Number.isFinite(height) || height <= 0) {
        result.errors.push('Invalid bounding rect height');
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  static safelyRemoveFromDOM(element: HTMLElement | null) {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      logger.error('Error removing element from DOM:', error);
    }
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

