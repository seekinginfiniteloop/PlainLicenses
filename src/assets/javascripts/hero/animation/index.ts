import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import {
  BehaviorSubject,
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
  tap,
  withLatestFrom
} from "rxjs/operators"

import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)
const subscriptions: Subscription[] = []

const easterEgg = document.getElementById("the-egg")

const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const heroElement = document.querySelector(".hero") as HTMLElement
const children: string[] = []
Array.from(heroElement.children).forEach(child => { children.push(child.id) })
logger.info(`Hero element: ${heroElement.id}`)
logger.info(`Hero children: ${children.join(", ")}`)

const { location$ } = window

if (easterEgg && infoBox) {
  easterEgg.style.display = "block"
}

/**
 * Checks if the info box overlay is visible.
 * @function
 * @returns boolean - true if the info box is visible, false otherwise
 */
const infoBoxIsVisible = () => infoBox?.open ?? false
const infoBoxVisibleSubject = new BehaviorSubject<boolean>(infoBoxIsVisible())
const infoBoxVisible$ = infoBoxVisibleSubject.asObservable()

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

const hideOverlay = (): void => {
  if (infoBox) {
    infoBox.close()
    infoBoxVisibleSubject.next(false)
  }
}

const showOverlay = (): void => {
  if (infoBox) {
    infoBox.showModal()
    infoBoxVisibleSubject.next(true)
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
logger.info(`Prefers reduced motion: ${prefersReducedMotion}`)

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
  const wayPointPause = parseFloat(el.getAttribute("data-scroll-pause-duration") || "0")
  const duration = parseFloat(el.getAttribute("data-scroll-duration") || "2")
  return { target, wayPoint, wayPointPause, duration }
}

/**
 * Creates an observable that scrolls to a specified element with a smooth animation.
 * @param el - The element to scroll to.
 * @returns Observable<void> - An observable of void.
 */
const smoothScroll$ = (el: Element): Observable<void> => {
  const { target, wayPoint, wayPointPause, duration } = getScrollTargets(el)
  logger.info(`Setting scroll parameters: target: ${target}, wayPoint: ${wayPoint}, wayPointPause: ${wayPointPause}, duration: ${duration}`)

  if (prefersReducedMotion) {
    const targetElement = heroElement.querySelector(target) as HTMLElement
    if (targetElement) {
      heroElement.scrollTop = targetElement.offsetTop
    }
    return of(void 0)
  }

  const tl = gsap.timeline()
  const firstScrollDuration = duration * (2 / 5)
  const secondScrollDuration = duration * (3 / 5)

  const wayPointElement = heroElement.querySelector(wayPoint) as HTMLElement
  const targetElement = heroElement.querySelector(target) as HTMLElement

  if (!targetElement) {
    logger.error(`Target element ${target} not found within heroElement.`)
    return of(void 0)
  }

  const scrollPositions = {
    wayPoint: wayPointElement ? wayPointElement.offsetTop : targetElement.offsetTop,
    target: targetElement.offsetTop
  }

  tl.to(heroElement, {
    duration: firstScrollDuration,
    scrollTo: { y: scrollPositions.wayPoint, autoKill: false },
    ease: "power3"
  })

  if (wayPointPause > 0) {
    tl.addPause(`+=${wayPointPause}`)
  }

  tl.to(heroElement, {
    duration: secondScrollDuration,
    scrollTo: { y: scrollPositions.target, autoKill: false },
    ease: "power3"
  })

  tl.play()

  logger.info(`Scrolling to ${target} with a total duration of ${duration} seconds`)
  return of(void 0)
}

/** Subscribes to all user interaction observables and handles the corresponding actions. */
const allSubscriptions = (): void => {
  // Observable for easter egg interactions
const eggFunction = (event$: Observable<InteractionEvent>): Observable<void> => {
  return event$.pipe(
    withLatestFrom(infoBoxVisible$),
    filter(([_, isVisible]) => !isVisible), // Proceed only if the info box is not visible
    tap(([ev]) => ev.preventDefault()),
    tap(() => {
      showOverlay()
      logger.info("Easter egg triggered, overlay shown")
    }),
    map(() => void 0)
  )
}

const eggInteraction$ = createInteractionObservable<void>(
  easterEgg as Element,
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
const eggBoxCloseFunc = (
  event$: Observable<InteractionEvent>
): Observable<void> => {
  return event$.pipe(
    withLatestFrom(infoBoxVisible$),
    filter(([_, isVisible]) => isVisible), // Only proceed if the info box is visible
    filter(([ev]) => {
      const target = ev.target as Element | null
      const clickedOutsideInfoBox = !infoBox.contains(target)
      const clickedCloseButton = target?.closest("#egg-box-close") !== undefined
      const clickedEgg = target?.closest("#the-egg") !== undefined
      return (clickedOutsideInfoBox && !clickedEgg) || clickedCloseButton
    }),
    tap(([ev]) => ev.preventDefault()),
    tap(() => {
      hideOverlay()
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
          target?.closest("#hero-primary-button") !== null ||
          // eslint-disable-next-line no-null/no-null
          target?.closest("#arrow-down") !== null
        )
      }),
      tap(ev => { ev.preventDefault() }),
      tap(ev => {
        logger.info(`Hero button interaction observed on ${ev.target}`)
        if (infoBoxIsVisible()) {
          hideOverlay()
        }
        const target = ev.target as Element | null
        if (target?.closest("#arrow-down")) {
          smoothScroll$(arrowDown!).subscribe()
        } else {
          smoothScroll$(primaryButton!).subscribe()
        }
      }),
      map(() => void 0)
    )
  }

const heroInteraction$ = createInteractionObservable<void>(
  [primaryButton!, arrowDown!],
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
