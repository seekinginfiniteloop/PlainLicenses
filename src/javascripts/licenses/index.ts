import { Observable, OperatorFunction, Subscription, fromEvent, fromEventPattern, merge } from "rxjs"
import { filter, map, switchMap } from "rxjs/operators"

import { logger } from "~/log"

const subscriptions = Array<Subscription>()

const { document$, viewport$ } = window

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
 * It's a simple creature, toggling onClick/touchEnd/key events.
 */
const toggleSection = (): void => {
    const content = document.querySelector<HTMLElement>(".section-content")
    const triangle = document.querySelector<HTMLElement>(".triangle")
    if (content && triangle) {
      const isExpanded = content.style.maxHeight !== ""
      content.style.maxHeight = isExpanded ? "" : `${content.scrollHeight}px`
      triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)"
    }
}

/**
 * Retrieves the icon element associated with a given tab.
 *
 * This function constructs an icon ID based on the hash of the URL
 * derived from the tab's href attribute and returns the corresponding
 * HTML element from the document.
 *
 * @param tab - The anchor element representing the tab.
 * @returns The icon element if found, otherwise null.
 */
const getIconElement = (tab: HTMLAnchorElement) => {
  const url = new URL(tab.getAttribute("href") || "", window.location.href)
  const iconId = `icon-${url.hash.slice(1)}`
  return document.getElementById(iconId)
}

const updateSvgFill = (icon: HTMLElement | null, color: string): void => {
  if (icon) {
    const svgPath = icon.querySelector<SVGPathElement>("svg path")
    if (svgPath) {
      svgPath.style.fill = color
    }
  }
}

const createMouseEventObservable = (eventName: string): Observable<MouseEvent> =>
  document$.pipe(switchMap(() =>
    fromEventPattern<MouseEvent>(
      handler => hoverTabs.forEach(tab => tab.addEventListener(eventName, handler as EventListener)),
      handler => hoverTabs.forEach(tab => tab.removeEventListener(eventName, handler as EventListener))
    )
  ))

const mouseOver$ = createMouseEventObservable("mouseover")
const mouseOut$ = createMouseEventObservable("mouseout")

const hoverEffect$ = merge(
  mouseOver$.pipe(map(event => ({ event, isOver: true }))),
  mouseOut$.pipe(map(event => ({ event, isOver: false })))
).pipe(
  map(({ event, isOver }) => {
    const tab = event.target as HTMLAnchorElement
    return {
      tab,
      icon: getIconElement(tab),
      isOver
    }
  })
)

// To handle icon hover, we need to create a separate observable
const icons = Array.from(document.querySelectorAll('[id^="icon-"]'))

const createIconMouseEventObservable = (eventName: string): Observable<MouseEvent> =>
  document$.pipe(switchMap(() =>
    fromEventPattern<MouseEvent>(
      handler => icons.forEach(icon => icon.addEventListener(eventName, handler as EventListener)),
      handler => icons.forEach(icon => icon.removeEventListener(eventName, handler as EventListener))
    )
  ))

const iconMouseOver$ = createIconMouseEventObservable("mouseover")
const iconMouseOut$ = createIconMouseEventObservable("mouseout")

const iconHoverEffect$ = merge(
  iconMouseOver$.pipe(map(event => ({ event, isOver: true }))),
  iconMouseOut$.pipe(map(event => ({ event, isOver: false })))
).pipe(
  map(({ event, isOver }) => {
    const icon = event.target as HTMLElement
    const iconId = icon.id
    const tabId = iconId.replace("icon-", "")
    const tab = document.querySelector(`a[href="#${tabId}"]`) as HTMLAnchorElement
    return { icon, tab, isOver }
  })
)

const headers = document.querySelectorAll<HTMLElement>(".section-header")
const headerClicks$: Observable<MouseEvent> = fromEventPattern<MouseEvent>(
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.addEventListener("click", handler)),
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.removeEventListener("click", handler))
)

export const subscribeToAll = () => {
  subscriptions.push(triangleInteraction$.subscribe({
    next: () => {
      toggleSection()
    },
    error: err => {
      logger.error("Error in triangleInteraction$ observable:", err)
    }
  }))
  subscriptions.push(
    hoverEffect$.subscribe({
      next: ({ tab, icon, isOver }) => {
        const color = isOver ? "var(--emerald)" : "var(--md-accent-bg-color)"
        updateSvgFill(icon, color)
        // You can add additional styling for the tab here if needed
        tab.classList.toggle("hovered", isOver)
      },
      error: err => logger.error("Error in hoverEffect$ observable:", err)
    })
  )
  subscriptions.push(
    iconHoverEffect$.subscribe({
      next: ({ icon, tab, isOver }) => {
        const color = isOver ? "var(--emerald)" : "var(--md-accent-bg-color)"
        updateSvgFill(icon, color)
        tab?.classList.toggle("hovered", isOver)
      },
      error: err => logger.error("Error in iconHoverEffect$ observable:", err)
    })
  )
  subscriptions.push(headerClicks$.pipe(
    map((event: MouseEvent) => event.currentTarget as HTMLElement)
  ).subscribe({ next: () => toggleSection(), error: err => logger.error("Error in headerClicks$ observable:", err) }))

  subscriptions.push(
    viewport$.pipe(map(view => (
        { height: view.size.height }
    )), filter(view => view.height > 0)
    ).subscribe({
        next: () => {
          headers.forEach(header => {
            const content = header.nextElementSibling as HTMLElement
            if (content && content.style.maxHeight) {
              content.style.maxHeight = `${content.scrollHeight}px`
            }
          })
        },
        error: (err: Error) => logger.error("Error in viewport$ observable:", err)
      }))

  document.addEventListener("beforeUnload", () => {
    subscriptions.forEach((sub: Subscription) => sub.unsubscribe())
  })
}
