import { getLocation } from "~/browser";
import * as bundle from "~/bundle";
import { BehaviorSubject, Observable, Subscription, fromEvent, merge, Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, filter, map, shareReplay } from "rxjs/operators";
import Tablesort from "tablesort";
import { logger } from "~/log";

const NAV_EXIT_DELAY = 60000;

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function isElementVisible(el: Element | null): boolean {
  if (!el) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  const vWidth = window.innerWidth || document.documentElement.clientWidth;
  const vHeight = window.innerHeight || document.documentElement.clientHeight;
  const efp = (x: number, y: number) => document.elementFromPoint(x, y);

  if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
    return false;
  }

  return (
    el.contains(efp(rect.left, rect.top)) ||
    el.contains(efp(rect.right, rect.top)) ||
    el.contains(efp(rect.right, rect.bottom)) ||
    el.contains(efp(rect.left, rect.bottom))
  );
}

type InteractionHandler<E, R> = (_events$: Observable<E>) => Observable<R>;

export function createInteractionObservable<R>(
  ev: EventTarget | EventTarget[],
  handler?: InteractionHandler<Event, R>
): Observable<R | Event> {
  const eventTargets = Array.isArray(ev) ? ev : [ev];
  const validEventTargets = eventTargets.filter(target => target != null);

  const click$ = merge(...validEventTargets.map(target => fromEvent<Event>(target, "click")));
  const touchend$ = merge(...validEventTargets.map(target => fromEvent<Event>(target, "touchend")));

  const events$ = merge(click$, touchend$).pipe(filter(event => event != null));

  return handler ? handler(events$) : events$;
}

export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

export const isHome = (url: URL) => url.pathname === "/" || url.pathname === "/index.html";

const isLicensePage = (url: URL) => (url.pathname.endsWith("index.html") && url.pathname.split("/").length === 5) || (url.pathname.endsWith("/") && url.pathname.split("/").length === 4);

export const isLicense = (url: URL) => url.pathname.includes("licenses") && isLicensePage(url);

const isProd = (url: URL) => url.hostname === "plainlicense.org" && url.protocol === "https:";
const isDev = (url: URL) => (url.hostname === "localhost" && url.port === "8000") || (url.hostname === "127.0.0.1" && url.port === "8000");

export const isOnSite = (url: URL) => isProd(url) || isDev(url);

const locationBehavior$ = new BehaviorSubject<URL>(getLocation());

const isValidEvent = (value: Event | null) => value !== null && value instanceof Event;

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

export const locationBeacon$ = merge(locationBehavior$, navigationEvents$).pipe(
  filter((value) => value !== null),
  distinctUntilChanged(),
  shareReplay(1)
);

export function pushUrl(url: string) {
  history.pushState(null, '', url);
  locationBehavior$.next(new URL(window.location.href));
}

export const watchTables = () => {
  const tables = document.querySelectorAll("article table:not([class])");
  const observables = () => tables.length > 0 ? Array.from(tables).map(table => of(table).pipe(map(table => table as HTMLTableElement), tap((table) => new Tablesort(table)))) : [];
  return merge(...observables());
}

export async function windowEvents() {
  const { document$, location$, target$, keyboard$, viewport$, tablet$, screen$, print$, alert$, progress$, component$ } = window;
  const observables = { document$, location$, target$, keyboard$, viewport$, tablet$, screen$, print$, alert$, progress$, component$ };
  let observablesMissing = false;
  for (const key in observables) {
    if (!(globalThis as any)[key]) {
      observablesMissing = true;
    }
  }
  if (observablesMissing) {
    bundle // reload material entrypoint
  }
}

class SubscriptionManager {
  private subscriptions: Subscription[] = [];
  private siteExit$ = new Subject<void>();
  private pageExit$ = new Subject<void>();

  constructor() {
    this.setupSiteExit();
    this.setupPageExit();
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

  private setupPageExit() {
    locationBeacon$.pipe(
      debounceTime(10),
      filter(url => isOnSite(url)),
    ).subscribe(() => {
      this.pageExit$.next();
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

// Example usage:
// we add subscriptionManager to window in the main entrypoint
// window.subscriptionManager.addSubscription(yourSubscription, true);