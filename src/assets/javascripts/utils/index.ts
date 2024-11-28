import { getLocation } from "~/browser"
import * as bundle from "~/bundle"
import { BehaviorSubject, Observable, Subscription, forkJoin, fromEvent, merge, of } from "rxjs"
import { debounceTime, distinct, filter, map, shareReplay, skipUntil, tap } from "rxjs/operators"
import Tablesort from "tablesort"
import { logger } from "~/log"

const NAV_EXIT_DELAY = 60000

export const prefersReducedMotion = () => { return window.matchMedia("(prefers-reduced-motion: reduce)").matches }

/**
 * Check if an element is visible in the viewport
 * @param el HTMLElement
 * @returns true if the element is visible
 */
export function isElementVisible(el: Element | null) {

  if (!el) {
    return false
  }

  const rect     = el.getBoundingClientRect()
  const vWidth   = window.innerWidth || document.documentElement.clientWidth
  const vHeight  = window.innerHeight || document.documentElement.clientHeight
  const efp      = function (x: number, y: number) { return document.elementFromPoint(x, y) }

    // Return false if it's not in the viewport
  if (rect.right < 0 || rect.bottom < 0
                || rect.left > vWidth || rect.top > vHeight) {
    return false
  }
    // Return true if any of its four corners are visible
  return (
    el.contains(efp(rect.left,  rect.top))
      ||  el.contains(efp(rect.right, rect.top))
      ||  el.contains(efp(rect.right, rect.bottom))
      ||  el.contains(efp(rect.left,  rect.bottom))
  )
}

type InteractionHandler<E, R> = (_events$: Observable<E>) => Observable<R>

/**
 * Creates an observable from specified event targets and event types.
 * @template R - The type of the observable result.
 * @param ev The event target or targets to observe.
 * @param handler An optional interaction handler function to apply to the observable. The handler must receive and return an observable.
 * @returns Observable&lt;R | InteractionEvent> - An observable of the specified event type.
 */
export function createInteractionObservable<R>(
  ev: EventTarget | EventTarget[],
  handler?: InteractionHandler<Event, R>
): Observable<R | Event> {
  const eventTargets = Array.isArray(ev) ? ev : [ev]
  const validEventTargets = eventTargets.filter(target => target != null)

  const click$ = merge(
    ...validEventTargets.map(target => fromEvent<Event>(target, "click"))
  )

  const touchend$ = merge(
    ...validEventTargets.map(target => fromEvent<Event>(target, "touchend"))
  )

  const events$ = merge(click$, touchend$).pipe(filter(event => event != null))

  return handler ? handler(events$) : events$
}

/**
 * Set a CSS variable on the document element.
 * @param name The name of the CSS variable to set.
 * @param value The value to assign to the CSS variable.
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

export const isHome = (url: URL) => { return (url.pathname === "/" || url.pathname === "/index.html") }

const isLicensePage = (url: URL) => { return ((url.pathname.endsWith("index.html") && url.pathname.split("/").length === 5) || (url.pathname.endsWith("/") && url.pathname.split("/").length === 4)) }

export const isLicense = (url: URL) => { return url.pathname.includes("licenses") && isLicensePage(url) }

const isProd = (url: URL) => { return url.hostname === "plainlicense.org" && url.protocol === "https:" }

const isDev = (url: URL) => { return (url.hostname === "localhost" && url.port === "8000") || (url.hostname === "127.0.0.1" && url.port === "8000") }

export const isOnSite = (url: URL) => { return isProd(url) || isDev(url)
}

// obserable for current location
const locationBehavior$ = new BehaviorSubject<URL>(getLocation())
const isValidEvent = (value: Event | null) => {
  return value !== null && value instanceof (Event)
}

const locationBehavior$ = new BehaviorSubject<URL>(getLocation())

const navigationEvents$ = 'navigation' in window ? 
  fromEvent(window.navigation, 'navigate').pipe(
    filter((event: Event) => event instanceof NavigateEvent),
    map((event: Event) => new URL((event as NavigateEvent).destination.url))
  ) :
  merge(
    fromEvent(window, "popstate"),
    fromEvent(window, 'hashchange'),
    fromEvent(window, "pageswap"),
  ).pipe(
    filter(isValidEvent),
    map(() => getLocation())
  );

export const locationBeacon$ = merge(
  locationBehavior$,
  navigationEvent$
).pipe(
  filter((value) => value !== null),
  distinctUntilChanged(), shareReplay(1)
)



/**
 * Push a new URL to the browser history.
 * @param url current url
 */
export function pushUrl(url: string) {
  history.pushState(null, '', url)
  locationBehavior$.next(new URL(window.location.href))
}

export const watchTables = () => {
  const tables = document.querySelectorAll("article table:not([class])")
  const observables = () => { return tables.length > 0 ? Array.from(tables).map(table => of(table).pipe(map(table => table as HTMLTableElement), tap((table) => new Tablesort(table)))) : [] }
  return merge(...observables())
}

/**
 * Subscribe to all window events.
 * @returns An array of subscriptions for each window event.
 */
export async function windowEvents() {
  const { document$, location$, target$, keyboard$, viewport$, tablet$, screen$, print$, alert$, progress$, component$ } = window
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

const NAV_EXIT_DELAY = 60000;

class SubscriptionManager {
  private subscriptions: Subscription[] = [];
  private siteExit$ = new Subject<void>();
  private pageExit$ = new Subject<void>();

  constructor() {
    this.setupSiteExit();
  }

  private setupSiteExit() {
    locationBeacon$.pipe(
      filter(url => !isOnSite(url)),
      debounceTime(NAV_EXIT_DELAY),
      filter(url => !isOnSite(url))
    ).subscribe(() => {
      this.siteExit$.next();
    });
  }

  public addSubscription(subscription: Subscription, isSiteWide: boolean = false) {
    this.subscriptions.push(subscription);
    if (isSiteWide) {
      this.siteExit$.subscribe(() => subscription.unsubscribe());
    } else {
      this.pageExit$.subscribe(() => subscription.unsubscribe());
    }
  }

  public clearPageSubscriptions() {
    this.pageExit$.next();
    this.subscriptions = this.subscriptions.filter(sub => !sub.closed);
  }

  public clearAllSubscriptions() {
    this.siteExit$.next();
    this.pageExit$.next();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}

// Attach the instance to the window object
// window.subscriptionManager = new SubscriptionManager();

// Example usage:
// window.subscriptionManager.addSubscription(yourSubscription, true);
