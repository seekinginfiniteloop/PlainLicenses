/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module Hero landing page animations and interactions, including:
 * - Easter egg infobox overlay
 * - Hero button interactions and smooth scrolling
 * - Path change handling
 * - Scroll triggered animations
 */
import { gsap } from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import _ScrollTrigger, { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  BehaviorSubject,
  Observable,
  Subscription,
  concat,
  of
} from "rxjs"
import {
  distinctUntilKeyChanged,
  filter,
  map,
  tap,
  withLatestFrom
} from "rxjs/operators"

import { createInteractionObservable } from "~/utils"
import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)
gsap.registerPlugin(ScrollTrigger)

const subscriptions: Subscription[] = []

const easterEgg = document.getElementById("the-egg")

const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const storedLocationState = history.state

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

const hideOverlay = (): void => {
  if (infoBox) {
    infoBox.close()
    infoBox.style.zIndex = "-1"
    infoBoxVisibleSubject.next(false)
  }
}

const showOverlay = (): void => {
  if (infoBox) {
    infoBox.showModal()
    infoBox.style.zIndex = "1000"
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
  target: Element
  wayPoint: Element
  wayPointPause: number
  duration: number
} => {
  const targetData = el.getAttribute("data-anchor-target")
  if (!targetData) {
    throw new Error("Target attribute not found")
  }
  const target = document.querySelector(targetData)
  if (!target) {
    throw new Error(`Target element ${targetData} not found within heroElement`)
  }
  const wayPointData = el.getAttribute("data-scroll-pause-id") || ""
  const wayPoint = document.querySelector(wayPointData) || target
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
  logger.info(`Setting scroll parameters: target: ${target.id}, wayPoint: ${wayPoint.id}, wayPointPause: ${wayPointPause}, duration: ${duration}`)
  const targetElement = target as HTMLElement
  const wayPointElement = wayPoint as HTMLElement
  if (prefersReducedMotion) {
    const anchorTarget = targetElement.offsetTop
    document.body.scrollTo({ top: anchorTarget, behavior: "auto" })
    return of(void 0)
  }

  const tl = gsap.timeline()
  let firstScrollDuration = duration * 0.4
  let secondScrollDuration = duration * 0.6
  const pause = wayPointPause || 0

  if (!targetElement) {
    logger.error(`Target element ${target} not found within document.`)
    return of(void 0)
  }
    const scrollPositions = {
      wayPoint: wayPointElement ? wayPointElement.offsetTop : targetElement.offsetTop,
      target: targetElement.offsetTop
    }
  if (scrollPositions && !(scrollPositions.wayPoint)) {
    scrollPositions.wayPoint = scrollPositions.target
    firstScrollDuration = duration
    secondScrollDuration = 0
  }
  tl.add(gsap.to(document.body, {
    duration: firstScrollDuration,
    scrollTo: { y: scrollPositions.wayPoint, autoKill: false },
    ease: "power3"
  }
  ))
  if (secondScrollDuration > 0) {
    tl.add(gsap.to(document.body, {
      duration: secondScrollDuration,
      scrollTo: { y: scrollPositions.target, autoKill: false },
      ease: "power3"
    }
    ), `+=${pause}`)
  }
  tl.play()

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
        // eslint-disable-next-line no-null/no-null
        return (!infoBox.contains(target) && !easterEgg?.contains(target)) || target?.closest("#egg-box-close") !== null
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
      next: () => { },
      error: err => logger.error("Error in leaving info box:", err),
      complete: () => logger.info("Leave info box observable completed")
    })
  )

  const heroSelectors = Array.from(document.querySelectorAll(".hero-target-selector"))

  // Observable for hero button interactions
  const heroButtonFunc = (event$: Observable<InteractionEvent>): Observable<void> => {
    return event$.pipe(
      filter(ev => {
        const target = ev.target as Element
        return heroSelectors.some(selector => selector.contains(target))
      }),
      tap(ev => {
        ev.preventDefault()
        history.replaceState(storedLocationState, "", "/")
      }),
      tap(ev => {
        logger.info(`Hero button interaction observed on ${ev.target}`)
        if (infoBoxIsVisible()) {
          hideOverlay()
        }
        const target = ev.target as Element
        const targetedElement = heroSelectors.find(selector => selector.contains(target))
        if (targetedElement) {
          smoothScroll$(targetedElement).subscribe({
            next: () => { },
            error: err => logger.error("Error in smooth scroll:", err),
            complete: () => logger.info("Smooth scroll observable completed")
          })
        }
      }),
      map(() => void 0)
    )
  }

  const heroInteraction$ = createInteractionObservable<void>(
    heroSelectors,
    heroButtonFunc
  )

  subscriptions.push(
    heroInteraction$.subscribe({
      next: () => { heroInteraction$.subscribe() },
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
      next: () => { },
      error: err => logger.error("Error in path change:", err),
      complete: () => logger.info("Path observable completed")
    })
  )
if (!prefersReducedMotion) {

  const setupAnimation = (selector: string, properties: gsap.TweenVars) => {
    gsap.set(selector, properties)
  }

  const createTimeline = (selector: string, animations: gsap.TweenVars[], scrollTrigger: ScrollTrigger.Vars) => {
    const timeline = gsap.timeline(scrollTrigger)
    animations.forEach(animation => timeline.add(gsap.to(selector, animation)))
    return timeline
  }

  const createFadeInAnimation = (): Observable<ScrollTrigger>[] => {
    const makeScrollBatch = (selector: string) => {
      const batch: Observable<ScrollTrigger>[] = []
      ScrollTrigger.batch(selector, {
        start: "top bottom",
        end: "top top",
        interval: 0.15,
        batchMax: 2,
        onEnter: (b: Element[]) => {
          gsap.to(b, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: { each: 0.15, grid: "auto" }, overwrite: true })
        },
        onLeave: (b: Element[]) => { gsap.set(b, { opacity: 0, y: -100, overwrite: true }) },
        onEnterBack: (b: Element[]) => { gsap.to(b, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.15, overwrite: true }) },
        onLeaveBack: (b: Element[]) => { gsap.set(b, { opacity: 0, y: 100, overwrite: true }) }
      }).forEach((trigger: ScrollTrigger) => { batch.push(of(trigger)) })
      return batch
    }
  const fadeIns = (): Observable<ScrollTrigger>[] => {
    return [...makeScrollBatch(".fade-in"), ...makeScrollBatch(".fade-in2")
    ]
  }
  setupAnimation(".fade-in", { opacity: 0, y: 100 })
  setupAnimation(".fade-in2", { opacity: 0, y: 100 })
  ScrollTrigger.addEventListener("refreshInit", () => {
    gsap.set(".fade-in", { y: 0, opacity: 1 })
    gsap.set(".fade-in2", { y: 0, opacity: 1 })
  })
  return fadeIns()
  }
  subscriptions.push(concat(...createFadeInAnimation()).subscribe())

  const createCtaAnimation = () => {
    setupAnimation(".cta-ul", { scaleX: 0, transformOrigin: "left", height: "1.8em", width: "0" })
    const ctaTimeline = createTimeline(".cta-ul", [
      { scaleX: 1, transformOrigin: "left", duration: 0.25, height: "1.3em", width: "50%" },
      { scaleX: 1, duration: 0.3, ease: "power2.out", height: "0.8em", width: "100%" }
    ], {
      scrub: 0.2,
      start: "top 5vh",
      trigger: ".hero__parallax",
      onEnter: () => { ctaTimeline.play() },
      scroller: ".hero__parallax"
    })
  }
  subscriptions.push(of(createCtaAnimation).subscribe())

  const createEmphasisAnimation = () => {
    setupAnimation(".special-ul", { scaleX: 0, transformOrigin: "left", height: "1.8em", width: "0" })
    const emphasisTimeline = createTimeline(".special-ul", [
      { scaleX: 1, transformOrigin: "left", duration: 0.25, height: "1.3em", width: "50%" },
      { scaleX: 1, duration: 0.3, ease: "power2.out", height: "0.8em", width: "100%" }
    ],
    {
      scrub: 0.2,
      start: "top 140vh",
      trigger: "#pt2-hero-section-content",
      onEnter: () => { emphasisTimeline.play() },
      scroller: document.body
      }
    )
  }
  subscriptions.push(of(createEmphasisAnimation).subscribe())

  const createSpecialHighlight = () => {
    setupAnimation(".special-highlight", { textShadow: "0 0 0 transparent", x: 0 })
    const specialHighlight = createTimeline(".special-highlight", [
      { textShadow: "0.02em 0.02em 0 var(--turkey-red)", x: 20, duration: 0.25 },
      { textShadow: "0.04em 0.04em 0.06em var(--turkey-red)", x: 50, duration: 0.2, ease: "power2.out" }
    ],
      {
      start: "top 240vh",
      trigger: "#pt3-hero-section-content",
      scroller: document.body,
      onEnter: () => { specialHighlight.play() }
    })
  }
  subscriptions.push(of(createSpecialHighlight).subscribe())
}
  subscriptions.push(location$.pipe(
    filter((location: URL) => location.pathname === "/" || location.pathname === "/index.html"),
    distinctUntilKeyChanged("hash"),
    filter((location: URL) =>
    location.hash === "#" || location.hash === "" || location.hash === "#pt3-hero-section-content"
    ),
  ).subscribe(() => {
  history.replaceState(storedLocationState, "", "/")
}))
}

allSubscriptions()

window.addEventListener("beforeunload", () => {
  subscriptions.forEach(sub => sub.unsubscribe())
})
