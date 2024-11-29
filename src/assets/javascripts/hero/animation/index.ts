/**
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * Hero landing page interactions, including:
 * - Easter egg infobox overlay
 * - Hero button interactions and smooth scrolling
 * - Path change handling
 * - Scroll triggered animations
 * @license Plain Unlicense (Public Domain)
 */
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  BehaviorSubject,
  Observable,
  concat,
  fromEvent,
  of
} from "rxjs"
import {
  catchError,
  filter,
  map,
  tap,
  withLatestFrom
} from "rxjs/operators"

import { createInteractionObservable, getSubscriptionManager, prefersReducedMotion } from "~/utils"
import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)
gsap.registerPlugin(ScrollTrigger)

const manager = getSubscriptionManager()

/* ------------------------------------------------------------------------ */
/*                           Easter Egg Animations                          */
/* ------------------------------------------------------------------------ */

const easterEgg = document.getElementById("the-egg")

const infoBox = document.getElementById("egg-box") as HTMLDialogElement

const FIRST_SCROLL_RATIO = 0.4
const SECOND_SCROLL_RATIO = 0.6

if (easterEgg && infoBox) {
  easterEgg.style.display = "block"
}

/**
 * Checks if the info box overlay is visible.
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

logger.info(`Prefers reduced motion: ${prefersReducedMotion()}`)

/* ------------------------------------------------------------------------ */
/*                            Animation Utilities                           */
/* ------------------------------------------------------------------------ */


/**
 * Gets scroll target values from data attributes on a specified element.
 * @param el The element to retrieve scroll target values from.
 * @returns object - An object containing the target, duration, pause target, pause duration, and target attributes.
 */
const findScrollTargets = (
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

/* Returns the target and waypoint elements for smooth scrolling */
const getScrollTargets = (el: Element): ScrollTargets => {
  return findScrollTargets(el)
}

/**
 * Scrolls to a specified element with a fallback to scrollIntoView.
 * @param el The element to scroll to.
 */
const scrollFallback = (el: Element): void => {
  el.scrollIntoView({ behavior: "auto" })
}

/**
 * Creates an observable that scrolls to a specified element with a smooth animation.
 * @param el The element to scroll to.
 * @returns Observable&lt;boolean> - An observable of void.
 */
const smoothScroll$ = (el: Element): Observable<boolean> => {
  const { target, wayPoint, wayPointPause, duration } = getScrollTargets(el)
  logger.info(`Setting scroll parameters: target: ${target}, wayPoint: ${wayPoint}, wayPointPause: ${wayPointPause}, duration: ${duration}`)

  if (!(target instanceof HTMLElement)) {
    logger.error(`Target element ${target} not found within document.`)
    return of(false)
  }

  if (prefersReducedMotion()) {
    scrollFallback(target)
    return of(true)
  }

  try {
    const html = document.scrollingElement as HTMLElement
    const currentScroll = html.scrollTop
    const scrollPositions = {
      wayPoint: (wayPoint instanceof HTMLElement ? wayPoint.offsetTop : target.offsetTop),
      target: target.offsetTop
    }

    // Create main timeline
    const tl = gsap.timeline({
      paused: true,
      defaults: {
        ease: "power3.inOut",
        overwrite: 'auto',
        fastScrollEnd: true,
      },
      onUpdate: () => {
        // Force ScrollTrigger to check for updates during animation
        ScrollTrigger.update()
      }
    })

    const firstScrollDuration = duration * FIRST_SCROLL_RATIO
    const secondScrollDuration = duration * SECOND_SCROLL_RATIO
    const pause = wayPointPause || 0

    logger.info(`Current scroll: ${currentScroll}, firstScrollDuration: ${firstScrollDuration}, secondScrollDuration: ${secondScrollDuration}, scrollPositions: ${JSON.stringify(scrollPositions)}`)

    // Add scroll animations to timeline
    tl.to(html, {
      duration: firstScrollDuration,
      scrollTo: { y: scrollPositions.wayPoint, autoKill: false },
      immediateRender: false,
      onStart: () => ScrollTrigger.refresh()
    })

    if (secondScrollDuration > 0) {
      tl.to(html, {
        duration: secondScrollDuration,
        scrollTo: { y: scrollPositions.target, autoKill: false },
        immediateRender: false,
        onStart: () => ScrollTrigger.refresh()
      }, `+=${pause}`)
    }

    return new Observable<boolean>(observer => {
      tl.eventCallback('onComplete', () => {
        logger.info('Smooth scroll completed')
        ScrollTrigger.refresh()
        observer.next(true)
        observer.complete()
      })
      tl.play()
    }).pipe(
      catchError((err) => {
        logger.error(`Error in Smooth Scroll: ${JSON.stringify(err)}`)
        scrollFallback(target)
        return of(false)
      })
    )
  } catch (err) {
    logger.error("Error in smooth scroll: ", JSON.stringify(err))
    scrollFallback(target)
    return of(false)
  }
}

/* ------------------------------------------------------------------------ */
/*                        All Animation Subscriptions                       */
/* ------------------------------------------------------------------------ */

export const subscribeToAnimations = (): void => {
  document.body.style.scrollBehavior = "instant"
  document.body.style.overflowY = "scroll"

  // Observable for easter egg interactions
  const eggFunction = (event$: Observable<Event>): Observable<void> => {
    return event$.pipe(
      withLatestFrom(infoBoxVisible$),
      filter(([_, isVisible]) => !isVisible),
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

  manager.addSubscription(
    eggInteraction$.subscribe({
      next: () => logger.info("Egg interaction observed"),
      error: err => logger.error("Error in egg interaction:", err),
      complete: () => logger.info("Egg interaction observable completed")
    })
  )

  // Observable for info box interactions (closing the overlay)
  const eggBoxCloseFunc = (
    event$: Observable<Event>
  ): Observable<void> => {
    return event$.pipe(
      withLatestFrom(infoBoxVisible$),
      filter(([_, isVisible]) => isVisible),
      filter(([ev]) => {
        const target = ev.target as Element | null
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

  manager.addSubscription(
    leaveInfoBoxInteraction$.subscribe({
      next: () => { },
      error: err => logger.error("Error in leaving info box:", err),
      complete: () => logger.info("Leave info box observable completed")
    })
  )

  const heroSelectors = Array.from(document.querySelectorAll(".hero-target-selector"))

  const nerfedSelectors = heroSelectors.map(selector => {
    selector.addEventListener("click", (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
    }
    )
    return selector
  })

  // Observable for hero button interactions
  const heroButtonFunc = (event$: Observable<Event>): Observable<void> => {
    return event$.pipe(
      filter(ev => {
        const target = ev.target as Element
        return nerfedSelectors.some(selector => selector.contains(target))
      }),
      tap(ev => {
        logger.info(`Hero button interaction observed on ${ev.target}`)
        if (infoBoxIsVisible()) {
          hideOverlay()
        }
        const target = ev.target as Element
        const targetedElement = nerfedSelectors.find(selector => selector.contains(target))
        if (targetedElement) {
          smoothScroll$(targetedElement).subscribe({
            next: () => { },
            error: err => logger.error("Error in smooth scroll:", JSON.stringify(err)),
            complete: () => logger.info("Smooth scroll observable completed")
          })
        }
      }),
      map(() => void 0)
    )
  }

  const heroInteraction$ = createInteractionObservable<void>(
    nerfedSelectors,
    heroButtonFunc
  )

  manager.addSubscription(
    heroInteraction$.subscribe({
      next: () => { },
      error: err => logger.error("Error in hero button interaction:", err),
      complete: () => logger.info("Hero button interaction observable completed")
    })
  )

  if (!prefersReducedMotion()) {
    const setupAnimation = (selector: string, properties: gsap.TweenVars) => {
      gsap.set(selector, properties)
    }

    const createTimeline = (selector: string, animations: gsap.TweenVars[], scrollTrigger: ScrollTrigger.Vars) => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          ...scrollTrigger,

          onRefresh: () => {
            logger.info(`ScrollTrigger refreshed for ${selector}`)
          },
          onUpdate: () => {
            logger.info(`ScrollTrigger updated for ${selector}`)
          }
        }
      })
      animations.forEach(animation => timeline.to(selector, animation))
      return timeline
    }

    const createFadeInAnimation = (): Observable<ScrollTrigger>[][] => {
      const setupInitialStates = () => {
        const style = document.createElement('style')
        style.textContent = `
    .fade-in, .fade-in2 {
      visibility: hidden;
      opacity: 0;
    }
  `
        document.head.appendChild(style)
      }
      setupInitialStates()

const makeScrollBatch = (selector: string, optionalParams?: gsap.TweenVars) => {
    const batch: Observable<ScrollTrigger>[] = []
  ScrollTrigger.batch(selector, {
    start: "top 95%",
    end: "top -20%",
    interval: 0.1,
    batchMax: 8,
    onEnter: (elements: Element[]) => {
      gsap.to(elements, {
        opacity: 1,
        visibility: "visible",
        y: 0,
        duration: 0.75,
        ease: "power2.out",
        stagger: {
          amount: 0.3,
          from: "start"
        },
        overwrite: false,
        immediateRender: true,
        fastScrollEnd: true,
        snap: {
          snapTo: 0.1,
          duration: { min: 0.2, max: 0.5 },
          ...optionalParams
        }
      })
    },
    onEnterBack: (elements: Element[]) => {
      gsap.to(elements, {
        opacity: 1,
        visibility: "visible",
        y: 0,
        duration: 0.5,
        overwrite: false,
        immediateRender: true,
        fastScrollEnd: true,
        snap: {
          snapTo: 0.1,
          duration: { min: 0.2, max: 0.5 }
        }

      })
    },
    onLeave: (elements: Element[]) => {
      gsap.to(elements, {
        opacity: 0,
        y: 50,
        duration: 0.5,
        overwrite: false,
        immediateRender: true,
        fastScrollEnd: true,
        snap: {
          snapTo: 0.1,
          duration: { min: 0.2, max: 0.5 }
        }
      })
    },
    onLeaveBack: (elements: Element[]) => {
      gsap.to(elements, {
        opacity: 0,
        y: 50,
        duration: 0.5,
        overwrite: false,
        immediateRender: true,
        fastScrollEnd: true,
        snap: {
          snapTo: 0.1,
          duration: { min: 0.2, max: 0.5 }
        }
      })
    }
    })
    return batch
}

      // Initialize elements before creating ScrollTriggers
      const fadeInTargets = document.querySelector("#pt2-hero-content-section")?.querySelectorAll("span")
      const fadeIn2Targets = document.querySelector("#pt3-hero-content-section")?.querySelectorAll(":not(br)")

      // Reset all animations on refresh
      ScrollTrigger.addEventListener("refresh", () => {
        fadeInTargets?.forEach(el => gsap.set(el, { clearProps: "translateY" }))
        fadeIn2Targets?.forEach(el => gsap.set(el, { clearProps: "translateY" }))
      })

      if (fadeInTargets) {
        fadeInTargets.forEach(target => { target.classList.add("fade-in") })
      }
      if (fadeIn2Targets) {
        fadeIn2Targets.forEach(target => { target.classList.add("fade-in2") })
      }

      setupAnimation(".fade-in", { opacity: 0, y: 50 })
      setupAnimation(".fade-in2", { opacity: 0, y: 50 })

      return [[...makeScrollBatch(".fade-in", {pin: "h1", scrub: 0.5})], [...makeScrollBatch(".fade-in2", {maxDuration: 4, })]]
    }

    // Initialize all ScrollTrigger animations
    const initializeAnimations = () => {
      // Create fade animations

      // Create and register highlight animation
      const highlightAnimation = createTimeline(".special-highlight", [
        {
          textShadow: "0.03em 0.03em 0 var(--turkey-red)",
          x: 20,
          duration: 0.25
        },
        {
          textShadow: "0.06em 0.06em 0.08em var(--turkey-red)",
          x: 50,
          duration: 0.2,
          ease: "power2.out"
        }
      ], {
        trigger: ".special-highlight",
        scroller: document.scrollingElement,
        fastScrollEnd: true,
        start: "top 85%",
        end: "bottom 15%",
        scrub: 0.5,
      })

      setupAnimation(".special-highlight", {
        textShadow: "0 0 0 transparent",
        x: 0,
        repeat: -1,
        start: ">"
      })
      const fadeAnimations = createFadeInAnimation()
      const fadeIn1 = fadeAnimations[0]

      const fadeIn2 = fadeAnimations[1]
      const timeline = gsap.timeline()
      concat(...fadeIn1).subscribe(trigger => {
        if (trigger.animation) {
          timeline.add(trigger.animation)
        }
      })
      concat(...fadeIn2).subscribe({
        next: trigger => {
          if (trigger.animation) {
            timeline.add(trigger.animation)
          }
        }
      })
      timeline.add(highlightAnimation)
    }

    // Initialize animations when the page loads
    initializeAnimations()

    // Refresh ScrollTrigger when window is resized
    window.addEventListener("resize", () => {
      ScrollTrigger.refresh()
    })

    // Handle hash changes
    manager.addSubscription(
      fromEvent(window, "hashchange").subscribe({
        next: () => {
          window.location.hash = ""
        }
      })
    )
  }
}
