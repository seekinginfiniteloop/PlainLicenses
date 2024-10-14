import { Observable, fromEvent, merge } from "rxjs"
import { filter } from "rxjs/operators"

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

/**
 * Creates an observable from a specified event target and event type.
 * @function
 * @param evt - The event target or targets to observe.
 * @param handler - An optional interaction handler function to apply to the observable. The handler must receive and return an observable.
 * @returns Observable<R | InteractionEvent> - An observable of the specified event type.
 * @template R - The type of the observable result.
 */
export function createInteractionObservable<R>(
  evt: EventTarget | EventTarget[],
  handler?: InteractionHandler<InteractionEvent, R>
): Observable<R | InteractionEvent> {
  const events$ = merge(
    fromEvent<InteractionEvent>(evt, "click"),
    fromEvent<InteractionEvent>(evt, "touchend"),
    fromEvent<InteractionEvent>(evt, "keydown")
  ).pipe(filter(ev => ev !== undefined && (ev instanceof Event)))

  if (handler) {
    return handler(events$)
  } else {
    return events$
  }
}

/**
 * Set a CSS variable on the document element.
 * @function
 * @param name - The name of the CSS variable to set.
 * @param value - The value to assign to the CSS variable.
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}
