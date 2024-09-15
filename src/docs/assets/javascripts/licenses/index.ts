import { Observable, OperatorFunction, Subscription, fromEvent, fromEventPattern, merge } from "rxjs"
import { filter, map, switchMap } from "rxjs/operators"

const subscriptions = new Subscription()

const hoverTabs = document.querySelectorAll<HTMLAnchorElement>(".md-typeset .tabbed-labels>label>[href]:first-child:hover a")

/**
 * Creates an observable that merges various user interaction events.
 *
 * This function generates an observable that listens for 'click', 'touchend', and
 * 'keydown' events on the document. It allows for optional operators to be applied
 * to the observable chain, enabling customization of the event handling behavior.
 * If no operators are provided, it returns the merged events observable directly.
 *
 * @template T - The type of events emitted by the observable, defaulting to Event.
 * @param operators - An array of RxJS operator functions
 *          to be applied to the merged events observable.
 * @returns An observable that emits user interaction events, potentially
 *          transformed by the provided operators.
 */

type InteractionEvent = MouseEvent | TouchEvent | KeyboardEvent

/**
 * Creates an observable that merges mouse click, touch end, and keydown events.
 * It accepts an array of operator functions to apply to the observable chain.
 * This function allows us to listen for any type of selection-related event.
 * @template T - The type of events emitted by the observable, constrained to InteractionEvent.
 * @param  operators - An array of operator functions to apply to the observable, transforming the emitted events.
 * @returns An observable that emits interaction events, potentially transformed by the provided operators.
 */
function createInteractionObservable<T extends InteractionEvent>(
  ...operators: OperatorFunction<T, T>[]
): Observable<T> {
  const mergedEvents$: Observable<InteractionEvent> = document$.pipe(
    switchMap(doc =>
      merge(
        fromEvent<InteractionEvent>(doc, "click"),
        fromEvent<InteractionEvent>(doc, "touchend"),
        fromEvent<InteractionEvent>(doc, "keydown")
      )
    )
  )

  if (operators.length === 0) {
    return mergedEvents$ as Observable<T>
  } else {
    return operators.reduce((prev$: Observable<T>, op: OperatorFunction<T, T>): Observable<T> => {
      return prev$.pipe(op)
    }, mergedEvents$ as Observable<T>)
  }
}
// observable for triangle icon and header text interaction (exoand/collapse) for license 'how to' sections
const triangleInteraction$: Observable<InteractionEvent> = createInteractionObservable(
  filter((event: InteractionEvent): boolean => {
    const target = (event).target as HTMLElement | undefined
    return (
      target?.closest(".triangle") !== undefined ||
      target?.closest(".header-text") !== undefined
    )
  })
)

/**
 * Handles the toggle action for the "how to use" license information"
 * It's a simple creature, and uses the usual on
 *
 * @returns This function does not return a value.
 */
const toggleSection = async (): Promise<void> => {
    const content = document.querySelector<HTMLElement>(".section-content")
    const triangle = document.querySelector<HTMLElement>(".triangle")
    if (content && triangle) {
      const isExpanded = content.style.maxHeight !== ""
      content.style.maxHeight = isExpanded ? "" : `${content.scrollHeight}px`
      triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)"
    }
}

subscriptions.add(triangleInteraction$.subscribe(() => toggleSection().then().catch(e => { throw e })))

/** -------- license tab highlight behavior --------
 *  maps license hoverTabs to icons for color-coded hover
 * */

/**
 * Gets the icon element associated with a given anchor element.
 *
 * @param target - The anchor element from which to extract the icon ID.
 * @returns The icon element associated with the anchor, or null if not found.
 */
const getIconElement = (target: HTMLAnchorElement) => {
    const url = new URL(target.getAttribute("href") || "", window.location.href)
    const iconId = `icon-${  url.hash.slice(1)}`
    return document.getElementById(iconId)
}

/**
 * Updates the fill color of the SVG path within a given icon element.
 *
 * @param icon - The icon element containing the SVG whose path fill color will be updated.
 * @param color - The color to apply to the SVG path fill.
 */
const updateSvgFill = (icon: HTMLElement | null, color: string): void => {
    if (icon) {
      const svgPath = icon.querySelector<SVGPathElement>("svg path")
      if (svgPath) {
        svgPath.style.fill = color
      }
    }
}

/**
 * Creates an observable that listens for a specified mouse event on tab elements.
 * It emits the event when triggered, allowing for further processing.
 * This function enables the color-coded hover effect on license tabs.
 *
 * @param eventName - The name of the mouse event to listen for (e.g., 'click', 'mouseover').
 * @returns An observable that emits the specified mouse events from the tab elements.
 */
const createMouseEventObservable = (eventName: string): Observable<Event> => document$.pipe(() =>
    fromEventPattern(
        handler => hoverTabs.forEach(tab => tab.addEventListener(eventName, handler)),
        handler => hoverTabs.forEach(tab => tab.removeEventListener(eventName, handler))
    ))

const mouseOver$ = createMouseEventObservable("mouseover") as Observable<MouseEvent>
const mouseOut$ = createMouseEventObservable("mouseout") as Observable<MouseEvent>

subscriptions.add(
  mouseOver$.pipe(
    map((event: MouseEvent) => event.target as HTMLAnchorElement),
    map(getIconElement)
  ).subscribe(icon => updateSvgFill(icon, "var(--emerald)"))
)

subscriptions.add(
  mouseOut$.pipe(
    map((event: MouseEvent) => event.target as HTMLAnchorElement),
    map(getIconElement)
  ).subscribe(icon => updateSvgFill(icon, "var(--md-accent-bg-color)"))
)

const headers = document.querySelectorAll<HTMLElement>(".section-header")
const headerClicks$: Observable<MouseEvent> = fromEventPattern<MouseEvent>(
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.addEventListener("click", handler)),
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.removeEventListener("click", handler))
)

headerClicks$.pipe(
  map((event: MouseEvent) => event.currentTarget as HTMLElement)
).subscribe(toggleSection)

subscriptions.add(
  viewport$.pipe(map(view => (
        { height: view.size.height }
  )), filter(view => view.height > 0)
  ).subscribe(() => {
        headers.forEach(header => {
            const content = header.nextElementSibling as HTMLElement
            if (content && content.style.maxHeight) {
              content.style.maxHeight = `${content.scrollHeight}px`
            }
        })
    })
)

document.addEventListener("beforeUnload", () => {
    subscriptions.unsubscribe()
})
