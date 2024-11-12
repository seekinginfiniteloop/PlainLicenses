import { Observable, forkJoin, fromEvent, merge } from "rxjs"
import { filter } from "rxjs/operators"
const { location$ } = window

/**
 * Check if an element is visible in the viewport
 * @param el - HTMLElement
 * @returns true if the element is visible
 */
export function isElementVisible(el: Element) {
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

type InteractionHandler<E, R> = (events$: Observable<E>) => Observable<R>

/**
 * Creates an observable from specified event targets and event types.
 * @param ev - The event target or targets to observe.
 * @param handler - An optional interaction handler function to apply to the observable. The handler must receive and return an observable.
 * @returns Observable<R | InteractionEvent> - An observable of the specified event type.
 * @template R - The type of the observable result.
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

  const events$ = merge(click$, touchend$)

  return handler ? handler(events$) : events$
}

/**
 * Set a CSS variable on the document element.
 * @param name - The name of the CSS variable to set.
 * @param value - The value to assign to the CSS variable.
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

/**
 * Merge location and beforeunload events with a URL filter.
 * @param urlFilter - A function that filters URLs.
 * @returns An observable of merged location and beforeunload events.
 */
export const mergedUnsubscription$ = (urlFilter: (url: URL) => boolean) => {
  const location: Observable<URL> = location$.pipe(
    filter(urlFilter))

  const beforeUnload: Observable<Event> = fromEvent(window, "beforeunload")

  return forkJoin([location, beforeUnload])
}

export const page$ = (urlFilter: (url: URL) => boolean) => {
  return location$.pipe(
    filter(urlFilter))
}
