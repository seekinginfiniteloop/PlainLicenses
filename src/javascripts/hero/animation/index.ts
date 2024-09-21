import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import {
  EMPTY,
  Observable,
  OperatorFunction,
  Subscription,
  fromEvent,
  merge,
  of,
  timer
} from "rxjs"
import {
  debounceTime,
  distinctUntilKeyChanged,
  filter,
  map,
  switchMap,
  tap
} from "rxjs/operators"

import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)

const subscriptions: Subscription[] = []

const easterEgg = document.getElementById("the-egg")
const infoBox = document.getElementById("egg-box") as HTMLDialogElement

const { location$} = window

if (!easterEgg || !infoBox) {
  // We don't have the necessary elements, so we don't need to do anything
} else {
  // We have JavaScript, so we make easterEgg visible
  easterEgg.style.display = "block"
}

// returns true if the info box is visible
const infoBoxIsVisible = () => infoBox?.style.display !== "none"

/**
 * Type representing user interaction events.
 */
type InteractionEvent = MouseEvent | TouchEvent | KeyboardEvent

/**
 * Creates an observable that merges various user interaction events.
 *
 * This function generates an observable that listens for 'click', 'touchend', and
 * 'keydown' events on the document. It allows for optional operators to be applied
 * to the observable chain, enabling customization of the event handling behavior.
 * If no operators are provided, it returns the merged events observable directly.
 *
 * @template T - The type of events emitted by the observable, defaulting to Event.
 * @param  operators - An array of RxJS operator functions
 *          to be applied to the merged events observable.
 * @returns An observable that emits user interaction events, potentially
 *          transformed by the provided operators.
 */
function createInteractionObservable<
  T extends InteractionEvent = InteractionEvent
>(...operators: OperatorFunction<InteractionEvent, T>[]): Observable<T> {
  const mergedEvents$ = merge(
    fromEvent<MouseEvent>(document, "click"),
    fromEvent<TouchEvent>(document, "touchend"),
    fromEvent<KeyboardEvent>(document, "keydown")
  ) as Observable<InteractionEvent>

  if (operators.length === 0) {
    return mergedEvents$ as Observable<T>
  } else {
    return operators.reduce(
      (
        prev$: Observable<InteractionEvent>,
        op: OperatorFunction<InteractionEvent, T>
      ): Observable<T> => {
        return prev$.pipe(op)
      },
      mergedEvents$
    ) as Observable<T>
  }
}

/**
 * Hides the info box overlay and resets its display properties.
 *
 * This function checks if the `infoBox` element exists. If it does, it closes the
 * info box modal, sets its display to 'none', and adjusts its z-index to ensure
 * it is not visible above other elements. This effectively removes the overlay
 * from the user's view.
 *
 */
const hideOverlay = (): void => {
  if (infoBox) {
    infoBox.close()
    infoBox.style.display = "none"
    infoBox.style.zIndex = "-202"
  }
}

/**
 * Displays the info box overlay and sets its visibility properties.
 *
 * This function checks if the `infoBox` element exists. If it does, it shows the
 * info box as a modal, sets its display to 'block', and adjusts its z-index to
 * ensure it appears above other elements on the page. This effectively makes the
 * overlay visible to the user.
 *
 */
const showOverlay = (): void => {
  if (infoBox) {
    infoBox.showModal()
    infoBox.style.display = "block"
    infoBox.style.zIndex = "202"
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Retrieves scrolling target information and associated attributes from a given HTML element.
 *
 * This function extracts the target element's ID from the `data-element-target` attribute and calculates
 * its vertical position relative to the viewport. It also retrieves the duration and pause duration for
 * scrolling from the respective attributes, returning an object containing the target position, duration,
 * pause target attribute, pause duration, and the target attribute.
 *
 * @param el - The HTML element from which to retrieve scrolling target information.
 * @returns An object containing the target position, duration, pause target attribute, pause duration, and the target attribute.
 * An object containing the target position, duration, pause target attribute, pause duration, and the target attribute.
 */
const getScrollTargets = (
  el: HTMLElement
): {
  target: number
  duration: number
  pauseTargetAttr: string | null
  pauseDuration: number
  targetAttr: string | null
} => {
  const targetAttr = el.getAttribute("data-element-target")
  const targetElement = targetAttr
    ? document.getElementById(targetAttr)
    : undefined
  const target = targetElement ? targetElement.getBoundingClientRect().top : 0
  const duration = parseAttribute(el, "data-duration", 5000) / 1000
  const pauseTargetAttr = el.getAttribute("data-scroll-pause-id")
  const pauseDuration =
    parseAttribute(el, "data-scroll-pause-duration", 1500) / 1000

  return { target, duration, pauseTargetAttr, pauseDuration, targetAttr }
}

/**
 * Smoothly scrolls the window to a specified target position over a given duration.
 * Optionally, applies an offset. Also applies autokill to allow for immediate scroll interruption.
 *
 * @param target - The target scroll position, which can be a pixel value or a selector string.
 * @param duration - The duration of the scroll animation in seconds.
 * @param offsetY - The vertical offset to apply to the scroll position.
 */
const scrollTo = (
     target: string | number,
     duration: number,
     offsetY: number = 0
): void => {
  // we check if the user has preferred reduced motion
  if (typeof gsap !== "undefined" && gsap.to) {
       // Use GSAP if available
    gsap.to(window, {
         duration,
         scrollTo: {
           y: target,
           offsetY
         },
         ease: "power3",
         autoKill: true
       })
  } else if ("scrollTo" in window) {
       // Fallback to native or polyfilled scrollTo
    window.scrollTo({
         top: typeof target === "number" ? target : 0,
         behavior: "smooth"
       })
  }
   }

/**
 * Creates an observable that handles smooth scrolling behavior for a specified HTML element.
 *
 * This function retrieves scrolling target information from the provided element and determines
 * whether to perform a pause during the scroll. If a pause target and duration are specified,
 * it first scrolls to the pause target, waits for the specified duration, and then scrolls to
 * the final target. If no pause is specified, it scrolls directly to the target. The function
 * returns an observable that completes when the scrolling actions are finished.
 *
 * @param el - The HTML element from which to retrieve scrolling target information.
 * @returns An observable that completes when the scrolling actions are finished.
 */
const smoothScroll$ = (el: HTMLElement): Observable<void> => {
  const { target, duration, pauseTargetAttr, pauseDuration, targetAttr } =
    getScrollTargets(el)

  if (prefersReducedMotion) {
    // we skip animation and jump to the target

    window.location.hash = targetAttr?.replace("#", "") || ""
    return of(void 0)
  }

  if (pauseTargetAttr && pauseDuration && targetAttr) {
    scrollTo(parseInt(pauseTargetAttr, 10), duration / 2)
    return timer(pauseDuration * 1000).pipe(
      tap(() => scrollTo(parseInt(targetAttr, 10), duration / 2)),
      map(() => void 0)
    )
  } else {
    scrollTo(target, duration)
    return of(void 0)
  }
}

/**
 * Retrieves and parses a numeric attribute value from a given HTML element.
 *
 * This function attempts to get the value of a specified attribute from the provided HTML element.
 * If the attribute exists and is a valid number, it is parsed and returned. If the attribute is not found
 * or is not a valid number, the function returns a specified default value, which defaults to 0.
 *
 * @param el - The HTML element from which to retrieve the attribute value.
 * @param attr - The name of the attribute to retrieve from the element.
 * @param defaultValue - The default value to return if the attribute is not found or is invalid.
 * @returns the parsed numeric value of the attribute or the default value if the attribute is not present or invalid.
 */
const parseAttribute = (
  el: HTMLElement,
  attr: string,
  defaultValue: number = 0
): number => {
  const attrValue = el.getAttribute(attr)
  return attrValue ? parseInt(attrValue, 10) : defaultValue
}

const allSubscriptions = (): void => {

  // Observable that emits when the user interacts with the easter egg element
  const eggInteraction$ = createInteractionObservable<InteractionEvent>(
    filter(
      event =>
        !infoBoxIsVisible() &&
        !!event &&
        (event instanceof MouseEvent ||
          event instanceof TouchEvent ||
          event instanceof KeyboardEvent)
    ),
    filter(event => {
      const target = event.target as HTMLElement | null
      return target?.closest("#the-egg") === target
    }),
    debounceTime(100)
  ).pipe(
    tap(() => showOverlay()),
    // Complete the observable after showing the overlay
    tap(() => {
      logger.info("Easter egg clicked, overlay shown")
    })
  )

  subscriptions.push(
    eggInteraction$.subscribe({
      next: () => { }, // The action is handled in the tap operator
      error: err => logger.error("Error in egg interaction:", err),
      complete: () => logger.info("Egg interaction observable completed")
    })
  )

  // Observable that emits when the user interacts with the info box overlay
  const leaveInfoBoxInteraction$ = createInteractionObservable<InteractionEvent>(
    filter(() => infoBoxIsVisible()),
    filter(event => {
      const target = event.target as HTMLElement | null
      return (
        target?.closest("#egg-box-close") !== undefined ||
        target?.closest("#egg-box") === undefined
      )
    }),
    debounceTime(100)
  ).pipe(
    tap(() => hideOverlay()),
    tap(() => {
      logger.info("Info box closed")
    })
  )

  subscriptions.push(
    leaveInfoBoxInteraction$.subscribe({
      next: () => { }, // The action is handled in the tap operator
      error: err => logger.error("Error in leaving info box:", err),
      complete: () => logger.info("Leave info box observable completed")
    })
  )

  // Observable that emits when the user interacts with the hero primary button or arrow down element

  const heroButtonInteraction$ = createInteractionObservable<InteractionEvent>(
    filter((event: InteractionEvent) => {
      if (event instanceof Event) {
        event.preventDefault()
      }
      const target = event.target as HTMLElement | null
      return (
        target?.closest("#hero-primary-button") !== undefined ||
        target?.closest("#arrowdown") !== undefined
      )
    }),
    debounceTime(100)
  ).pipe(
    switchMap(event => {
      const target = event.target as HTMLElement | null
      if (target) {
        return smoothScroll$(target)
      }
      return EMPTY
    }),
    tap(() => {
      logger.info("Smooth scroll completed")
    })
  )

  subscriptions.push(
    heroButtonInteraction$.subscribe({
      next: () => { }, // The action is handled in the switchMap and tap operators
      error: err => logger.error("Error in hero button interaction:", err),
      complete: () => logger.info("Hero button interaction observable completed")
    })
  )

  const pathObservable$ = location$.pipe(
    distinctUntilKeyChanged("pathname"),
    map(
      (location: { pathname: string }) =>
        location.pathname !== "index.html" && location.pathname !== "/"
    ),
    filter(location => location !== undefined),
    tap(() => hideOverlay()),
    tap(() => {
      logger.info("Path changed, overlay hidden")
    })
  )

  subscriptions.push(
    pathObservable$.subscribe({
      next: () => { }, // The action is handled in the tap operator
      error: err => logger.error("Error in path change:", err),
      complete: () => logger.info("Path observable completed")
    })
  )
  // we clean up the subscriptions when the user leaves the page
  window.addEventListener("beforeunload", () => {
    subscriptions.forEach(sub => sub.unsubscribe())
  })
}

// we create and return an observable for the allSubscriptions function
export const action$ = () => {
  return new Observable<void>(subscriber => {
    allSubscriptions()
    subscriber.next()
    subscriber.complete()
  })
}
