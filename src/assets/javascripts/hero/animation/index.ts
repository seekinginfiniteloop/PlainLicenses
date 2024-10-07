import { log } from "console"
import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import {
  Observable,
  Subscription,
  fromEvent,
  merge,
  of
} from "rxjs"
import {
  distinctUntilKeyChanged,
  filter,
  map,
  tap
} from "rxjs/operators"

import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)

const subscriptions: Subscription[] = []

const easterEgg = document.getElementById("the-egg")
const infoBox = document.getElementById("egg-box") as HTMLDialogElement

const { location$ } = window

if (easterEgg && infoBox) {
  easterEgg.style.display = "block"
}

/**
 * Checks if the info box overlay is visible.
 * @function
 * @returns boolean - true if the info box is visible, false otherwise
 */
const infoBoxIsVisible = () => infoBox?.style.display !== "none"

/** Type representing user interaction events. */
type InteractionEvent = MouseEvent | TouchEvent | KeyboardEvent

/** Type representing an interaction handler function. */
type InteractionHandler<T, R> = (event: Observable<T>) => Observable<R>

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
  )

  if (handler) {
    return handler(events$)
  } else {
    return events$
  }
}

/** Hides the info box overlay and resets its display properties. */
const hideOverlay = (): void => {
  if (infoBox) {
    infoBox.close()
    infoBox.style.display = "none"
    infoBox.style.zIndex = "-202"
  }
}

/** Displays the info box overlay and sets its visibility properties. */
const showOverlay = (): void => {
  if (infoBox) {
    infoBox.showModal()
    infoBox.style.display = "block"
    infoBox.style.zIndex = "202"
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Gets scroll target values from data attributes on a specified element.
 * @function
 * @param el - The element to retrieve scroll target values from.
 * @returns object - An object containing the target, duration, pause target, pause duration, and target attributes.
 */
const getScrollTargets = (
  el: Element
): {
  target: string
  wayPoint: string
  wayPointPause: number
  duration: number
} => {
  const target = el.getAttribute("data-anchor-target")
  if (!target) {
    throw new Error("Target attribute not found")
  }
  const wayPoint = el.getAttribute("data-scroll-pause-id") || target
  const wayPointPause = (parseInt(el.getAttribute("data-scroll-pause-duration") || "0", 10) / 1000)
  const duration = parseInt(el.getAttribute("data-scroll-duration") || "2", 10) / 1000
  return { target, wayPoint, wayPointPause, duration }
}

const gsapTimeline = (repeatVal: number, delayVal: number): gsap.core.Timeline => {
  return gsap.timeline({ repeat: repeatVal, repeatDelay: delayVal })
}

/**
 * Creates an observable that scrolls to a specified element with a smooth animation.
 * @param el - The element to scroll to.
 * @returns Observable<void> - An observable of void.
 */
const smoothScroll$ = (el: Element): Observable<void> => {
  const { target, wayPoint, wayPointPause, duration } =
    getScrollTargets(el)
  logger.info(`setting scroll parameters: target: ${target}, wayPoint: ${wayPoint}, wayPointPause: ${wayPointPause}, duration: ${duration}`)
  if (prefersReducedMotion) {
    window.location.hash = target.replace("#", "")
    return of(void 0)
  }
  const tl = gsapTimeline(0, 0)
  tl.totalDuration(duration)
  tl.to(window, { scrollTo: { y: wayPoint || target, offsetY: 0 }, ease: "power3" })
  tl.to(window, { scrollTo: { y: target, offsetY: 0 }, ease: "power3" }, `>+${wayPointPause}`)
  logger.info(`Scrolling to ${target} with a duration of ${duration} seconds`)
  tl.play()
  logger.info("Scroll animation started")
  return of(void 0)
}

/** Subscribes to all user interaction observables and handles the corresponding actions. */
const allSubscriptions = (): void => {
  // Observable for easter egg interactions
  const eggFunction = (event$: Observable<InteractionEvent>): Observable<void> => {
    return event$.pipe(
      filter(() => !infoBoxIsVisible()),
      filter(ev => {
        const target = ev.target as Element | null
        // eslint-disable-next-line no-null/no-null
        return target?.closest("#the-egg") !== null
      }),
      tap(() => showOverlay()),
      tap(() => {
        logger.info("Easter egg triggered, overlay shown")
      }),
      map(() => void 0)
    )
  }

  const eggInteraction$ = createInteractionObservable<void>(
    document,
    eggFunction
  )

  subscriptions.push(
    eggInteraction$.subscribe({
      next: () => logger.info("Egg interaction observed"),
      error: err => logger.error("Error in egg interaction:", err),
      complete: () => logger.info("Egg interaction observable completed")
    })
  )

  // Observable for info box interactions (closing the overlay)
  const eggBoxCloseFunc = (event$: Observable<InteractionEvent>): Observable<void> => {
    return event$.pipe(
      filter(() => infoBoxIsVisible()),
      filter(ev => {
        const target = ev.target as Element | null
        return (
          !infoBox.contains(target) ||
          // eslint-disable-next-line no-null/no-null
          target?.closest("#egg-box-close") !== null
        )
      }),
      tap(() => hideOverlay()),
      tap(() => {
        logger.info("Easter egg box closed")
      }),
      map(() => void 0)
    )
  }

  const leaveInfoBoxInteraction$ = createInteractionObservable<void>(
    document,
    eggBoxCloseFunc
  )

  subscriptions.push(
    leaveInfoBoxInteraction$.subscribe({
      next: () => {},
      error: err => logger.error("Error in leaving info box:", err),
      complete: () => logger.info("Leave info box observable completed")
    })
  )

  const primaryButton = document.querySelector(".hero-cta-button")
  const arrowDown = document.querySelector(".hero__scroll-down")

  // Observable for hero button interactions
  const heroButtonFunc = (event$: Observable<InteractionEvent>): Observable<void> => {
    return event$.pipe(
      filter(ev => {
        const target = ev.target as Element | null
        return (
          // eslint-disable-next-line no-null/no-null
          target?.closest(".hero-cta-button") !== null ||
          // eslint-disable-next-line no-null/no-null
          target?.closest(".hero__scroll-down") !== null
        )
      }),
      tap(ev => {
        logger.info(`Hero button interaction observed on ${ev.target}`)
        if (infoBoxIsVisible()) {
          hideOverlay()
        }
        const target = ev.target as Element | null
        if (target?.closest(".hero__scroll-down")) {
          smoothScroll$(arrowDown!).subscribe()
        } else {
          smoothScroll$(primaryButton!).subscribe()
        }
      }),
      map(() => void 0)
    )
  }

  const heroInteraction$ = createInteractionObservable<void>(
    document,
    heroButtonFunc
  )

  subscriptions.push(
    heroInteraction$.subscribe({
      next: () => {},
      error: err => logger.error("Error in hero button interaction:", err),
      complete: () => logger.info("Hero button interaction observable completed")
    })
  )

  // Observable for path changes
  const pathObservable$ = location$.pipe(
    distinctUntilKeyChanged("pathname"),
    filter(
      (location: { pathname: string }) =>
        location.pathname !== "index.html" && location.pathname !== "/"
    ),
    tap(() => hideOverlay()),
    tap(() => {
      logger.info("Path changed, overlay hidden")
    })
  )

  subscriptions.push(
    pathObservable$.subscribe({
      next: () => {},
      error: err => logger.error("Error in path change:", err),
      complete: () => logger.info("Path observable completed")
    })
  )
}

allSubscriptions()

window.addEventListener("beforeunload", () => {
  subscriptions.forEach(sub => sub.unsubscribe())
})
