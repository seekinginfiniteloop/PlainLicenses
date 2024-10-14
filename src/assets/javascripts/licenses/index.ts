/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module This file contains the JavaScript code for the license pages.
 * It handles the following interactions:
 * - Hover effect on tabs and icons
 * - Click event on section headers and 'how-to' to expand/collapse the content
 */
import { Observable, Subscription, fromEventPattern, merge } from "rxjs"
import { filter, map, switchMap } from "rxjs/operators"

import { createInteractionObservable } from "~/utils"
import { logger } from "~/log"

const subscriptions = Array<Subscription>()

const { document$, viewport$ } = window

const hoverTabs = document.querySelectorAll<HTMLAnchorElement>(".md-typeset .tabbed-labels>label>[href]:first-child:hover a")

const triangleWatchElement = document.querySelector(".expanding-section")

const triangleFunction = (event$: Observable<InteractionEvent>): Observable<void> => {
  return event$.pipe(
    map((event: InteractionEvent) => {
      const target = event.target as HTMLElement
      return target.closest(".section-header") as HTMLElement || target.closest(".triangle") as HTMLElement
    }),
    // eslint-disable-next-line no-null/no-null
    filter((target: HTMLElement | null) => target !== null),
    map(() => void 0)
  )
  }

/**
 * Handles the toggle action for the "how to use" license information"
 * It's a simple creature, toggling onClick/touchEnd/key events.
 * @function
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
 * @function
 * @param tab - The anchor element representing the tab.
 * @returns The icon element if found, otherwise null.
 */
const getIconElement = (tab: HTMLAnchorElement) => {
  const url = new URL(tab.getAttribute("href") || "", window.location.href)
  const iconId = `icon-${url.hash.slice(1)}`
  return document.getElementById(iconId)
}

/**
 * Updates the fill color of an SVG icon.
 *
 * @param icon - The icon element to update.
 * @param color - The color to apply to the icon.
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
 * Creates an observable that listens for mouseover and mouseout events.
 * @param eventName - The name of the event to listen for.
 * @returns An observable that emits mouse events.
 */
const createMouseEventObservable = (eventName: string): Observable<MouseEvent> =>
  document$.pipe(switchMap(() =>
    fromEventPattern<MouseEvent>(
      handler => hoverTabs.forEach(tab => tab.addEventListener(eventName, handler as EventListener)),
      handler => hoverTabs.forEach(tab => tab.removeEventListener(eventName, handler as EventListener))
    )
  ))

const mouseOver$ = createMouseEventObservable("mouseover")
const mouseOut$ = createMouseEventObservable("mouseout")

// Handle tab hover effect
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

/**
 * Creates an observable that listens for mouseover and mouseout events on icons.
 * @param eventName - The name of the event to listen for.
 * @returns An observable that emits mouse events.
 */
const createIconMouseEventObservable = (eventName: string): Observable<MouseEvent> =>
  document$.pipe(switchMap(() =>
    fromEventPattern<MouseEvent>(
      handler => icons.forEach(icon => icon.addEventListener(eventName, handler as EventListener)),
      handler => icons.forEach(icon => icon.removeEventListener(eventName, handler as EventListener))
    )
  ))

const iconMouseOver$ = createIconMouseEventObservable("mouseover")
const iconMouseOut$ = createIconMouseEventObservable("mouseout")

// Handle icon hover effect
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

// Handle section header click
const headers = document.querySelectorAll<HTMLElement>(".section-header")
const headerClicks$: Observable<MouseEvent> = fromEventPattern<MouseEvent>(
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.addEventListener("click", handler)),
  (handler: (e: MouseEvent) => void) =>
        headers.forEach(header => header.removeEventListener("click", handler))
)

/**
 * Subscribes to all observables.
 */
export const subscribeToAll = (): void => {
  if (triangleWatchElement) {
  // observable for triangle icon and header text interaction (exoand/collapse) for license 'how to' sections
    const triangleInteraction$ = createInteractionObservable(triangleWatchElement, triangleFunction)

    subscriptions.push(
      triangleInteraction$.subscribe({
        next: () => {
          toggleSection()
        },
        error: err => {
          logger.error("Error in triangleInteraction$ observable:", err)
        }
      })
    )
  }
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
