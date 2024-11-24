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
  Subscription,
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

import { createInteractionObservable, isHome, isOnSite, mergedUnsubscription$, unsubscribeFromAll, watchLocationChange } from "~/utils"
import { logger } from "~/log"

gsap.registerPlugin(ScrollToPlugin)
gsap.registerPlugin(ScrollTrigger)

const subscriptions: Subscription[] = []

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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
logger.info(`Prefers reduced motion: ${prefersReducedMotion}`)

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
 * @returns Observable&lt;void> - An observable of void.
 */
const smoothScroll$ = (el: Element): Observable<boolean> => {
  const { target, wayPoint, wayPointPause, duration } = getScrollTargets(el)
  logger.info(`Setting scroll parameters: target: ${target}, wayPoint: ${wayPoint}, wayPointPause: ${wayPointPause}, duration: ${duration}`)

  if (!(target instanceof HTMLElement)) {
    logger.error(`Target element ${target} not found within document.`)
    return of(false)
  }

  if (prefersReducedMotion) {
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

    const tl = gsap.timeline({
      paused: true,
      defaults: {
        ease: "power3.inOut",
        overwrite: 'auto'
      }
    })

    const firstScrollDuration = duration * FIRST_SCROLL_RATIO
    const secondScrollDuration = duration * SECOND_SCROLL_RATIO
    const pause = wayPointPause || 0

    logger.info(`Current scroll: ${currentScroll}, firstScrollDuration: ${firstScrollDuration}, secondScrollDuration: ${secondScrollDuration}, scrollPositions: ${JSON.stringify(scrollPositions)}`)

    tl.to(html, {
      duration: firstScrollDuration,
      scrollTo: { y: scrollPositions.wayPoint, autoKill: false },
      immediateRender: false
    })

    if (secondScrollDuration > 0) {
      tl.to(html, {
        duration: secondScrollDuration,
        scrollTo: { y: scrollPositions.target, autoKill: false },
        immediateRender: false
      }, `+=${pause}`)
    }

    return new Observable<boolean>(observer => {
      tl.eventCallback('onComplete', () => {
        logger.info('Smooth scroll completed')
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

/** Subscribes to all user interaction observables and handles the corresponding actions. */
export const allSubscriptions = (): void => {
  document.body.style.scrollBehavior = "instant"
  document.body.style.overflowY = "scroll"

  // Observable for easter egg interactions
  const eggFunction = (event$: Observable<Event>): Observable<void> => {
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
    event$: Observable<Event>
  ): Observable<void> => {
    return event$.pipe(
      withLatestFrom(infoBoxVisible$),
      filter(([_, isVisible]) => isVisible), // Only proceed if the info box is visible
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

  subscriptions.push(
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

    subscriptions.push(
      heroInteraction$.subscribe({
      next: () => { heroInteraction$.subscribe() },
      error: err => logger.error("Error in hero button interaction:", err),
      complete: () => logger.info("Hero button interaction observable completed")
    })
    )


  const noLongerHome = (url: URL) => !isHome(url) && isOnSite(url)
  const pathObservable$ = watchLocationChange((url) => noLongerHome(url)).pipe(tap(() => hideOverlay()), tap(() => logger.info("Path changed, overlay hidden")))

  subscriptions.push(
    pathObservable$.subscribe({ next: () => { unsubscribeFromAll(subscriptions) } }))

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
          start: "top 90%", // Show sooner
          end: "bottom 10%", // Hide later
          interval: 0.2,
          batchMax: 5, // Smoother batching
          onEnter: (b: Element[]) => {
            gsap.to(b, {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: "power1.out",
              stagger: { each: 0.3, grid: "auto" },
              overwrite: true
            })
          },
          onLeave: (b: Element[]) => {
            gsap.to(b, {
              opacity: 0,
              y: -50,
              duration: 0.3,
              ease: "power1.in"
            })
          },
          onEnterBack: (b: Element[]) => {
            gsap.to(b, {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power1.out",
              stagger: 0.1
            })
          },
          onLeaveBack: (b: Element[]) => {
            gsap.to(b, {
              opacity: 0,
              y: 50,
              duration: 0.3,
              ease: "power1.in"
            })
          }
        }).forEach((trigger: ScrollTrigger) => batch.push(of(trigger)))
        return batch
      }
      const fadeInTargets = document.querySelector("#pt2-hero-content-section")?.querySelectorAll("*")
      if (fadeInTargets) {
        fadeInTargets.forEach(target => { target.classList.add("fade-in") })
      }
      const fadeIn2Targets = document.querySelector("#pt3-hero-content-section")?.querySelectorAll("*")
      if (fadeIn2Targets) {
        fadeIn2Targets.forEach(target => { target.classList.add("fade-in2") })
      }
      const fadeIns = (): Observable<ScrollTrigger>[] => {
        return [...makeScrollBatch(".fade-in"), ...makeScrollBatch(".fade-in2")
        ]
      }

      if (fadeIn2Targets) {
        setupAnimation(".fade-in", { opacity: 0, y: 50 })
        setupAnimation(".fade-in2", { opacity: 0, y: 50 })
        ScrollTrigger.addEventListener("refreshInit", () => {
          gsap.set(".fade-in", { y: 0, opacity: 1 })
          gsap.set(".fade-in2", { y: 0, opacity: 1 })
        })
        return fadeIns()
      }
      return []
    }
    subscriptions.push(concat(...createFadeInAnimation()).subscribe())

    const createCtaAnimation = () => {
        setupAnimation(".cta-ul", {
          scaleX: 0,
          transformOrigin: "left",
          height: "1.8em",
          width: "0"
        })
        const ctaTimeline = createTimeline(".cta-ul", [
          {
            scaleX: 1,
            transformOrigin: "left",
            duration: 0.4,
            height: "1.3em",
            width: "50%"
          },
          {
            scaleX: 1,
            duration: 0.5,
            ease: "power2.out",
            height: "0.8em",
            width: "100%"
          }
        ], {
          scrub: true,
          start: "top top", // Starts immediately when page loads
          trigger: "body",
          onEnter: () => ctaTimeline.play(),
          once: true // Only plays once
        })
      }
    subscriptions.push(of(createCtaAnimation).subscribe())

    const createEmphasisAnimation = () => {
        setupAnimation(".special-ul", {
          scaleX: 0,
          transformOrigin: "left",
          height: "1.8em",
          width: "0"
        })
        const emphasisTimeline = createTimeline(".special-ul", [
          {
            scaleX: 1,
            transformOrigin: "left",
            duration: 0.25,
            height: "1.3em",
            width: "50%"
          },
          {
            scaleX: 1,
            duration: 0.3,
            ease: "power2.out",
            height: "0.8em",
            width: "100%"
          }
        ], {
          scrub: 0.5,
          start: "top 90%",
          end: "top 70%",
          trigger: "#pt2-hero-section-content",
          onEnter: () => emphasisTimeline.play()
        })
      }
    subscriptions.push(of(createEmphasisAnimation).subscribe())

    const createSpecialHighlight = () => {
      setupAnimation(".special-highlight", {
        textShadow: "0 0 0 transparent",
        x: 0
      })
      return createTimeline(".special-highlight", [
        {
          textShadow: "0.02em 0.02em 0 var(--turkey-red)",
          x: 20,
          duration: 0.25
        },
        {
          textShadow: "0.04em 0.04em 0.06em var(--turkey-red)",
          x: 50,
          duration: 0.2,
          ease: "power2.out"
        }
      ], {
              start: "top 85%", // Start when element is 85% from top
              end: "bottom 15%", // End when element is 15% from bottom
              trigger: ".special-highlight",
              toggleActions: "play pause resume reset",
              scrub: 0.5
            })
    }
    subscriptions.push(of(createSpecialHighlight).subscribe())

    subscriptions.push(fromEvent(window, "hashchange").pipe(
    ).subscribe({
        next: () => {
          window.location.hash = ""
        }
      }))
  }
  }

const urlFilter = (url: URL) => (!isHome(url) && isOnSite(url)) || !isOnSite(url)

if (!urlFilter(new URL(window.location.href)) && subscriptions.length === 0) {
  allSubscriptions()
}

mergedUnsubscription$(urlFilter).subscribe({
      next: () => {
        unsubscribeFromAll(subscriptions)
      }
    })
