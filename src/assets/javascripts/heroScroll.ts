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
  Observable,
  concat,
  defer,
  from,
  fromEvent,
  fromEventPattern,
  of
} from "rxjs"
import {
  catchError,
  debounceTime,
  filter,
  map,
  mergeMap,
  switchMap,
  tap} from "rxjs/operators"

import { prefersReducedMotion$ } from "~/utils"
import { logger } from "~/log"
import { preventDefault } from "./utilities/eventHandlers"

gsap.registerPlugin(ScrollTrigger,ScrollToPlugin)

/* ------------------------------------------------------------------------ */
/*                           Easter Egg Animations                          */
/* ------------------------------------------------------------------------ */

const easterEgg = document.getElementById("the-egg") as HTMLElement
const infoBox = document.getElementById("egg-box") as HTMLDialogElement
const eggExit = document.getElementById("egg-box-close") as HTMLElement

const FIRST_SCROLL_RATIO = 0.4
const SECOND_SCROLL_RATIO = 0.6

const leaveBox$ = fromEvent(document, "click").pipe(filter(ev => infoBox !== null && (!infoBox.contains(ev.target as Node) || ev.target === eggExit || eggExit.contains(ev.target as Node))), debounceTime(25), tap(() => infoBoxHandler(infoBox))) // Close the info box when clicking outside of it or on exit button

const infoBoxHandler = (infoBox: HTMLDialogElement): void => {
  if (infoBox.open) {
    infoBox.close()
    infoBox.style.zIndex = "-1"
  } else {
    infoBox.showModal()
    infoBox.style.zIndex = "1000"
    leaveBox$.subscribe()
  }
}

let infoBox$ = of(new Event(""))

if (easterEgg && infoBox) {
  easterEgg.style.display = "block"
  infoBox$ = fromEvent(easterEgg, "click").pipe(
    tap(() => preventDefault),
    debounceTime(25),
    tap(() => {
      infoBoxHandler(infoBox)
    })
  )
}


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

const nerfSelectors = (selectors: Element[]) => {
  return selectors.forEach(selector => {
    selector.addEventListener("click", preventDefault)
  })
}

/**
 * Creates an observable that scrolls to a specified element with a smooth animation.
 * @param el The element to scroll to.
 * @returns Observable&lt;boolean> - An observable of void.
 */
const smoothScroll$ = (el: Element): Observable<boolean> => {
  const { target, wayPoint, wayPointPause, duration } = getScrollTargets(el)
  logger.info(`Setting scroll parameters: target: ${target}, wayPoint: ${wayPoint}, wayPointPause: ${wayPointPause}, duration: ${duration}`)

  const currentScrollBehavior = document.body.style.scrollBehavior

  if (!(target instanceof HTMLElement)) {
    logger.error(`Target element ${target} not found within document.`)
    return of(false)
  }
  document.body.style.overflowY = "scroll"

  prefersReducedMotion$.pipe(
    tap((prefersReducedMotion) => {
      if (prefersReducedMotion) {
        scrollFallback(target)
        document.body.style.scrollBehavior = "smooth"
        return // Exit the function if prefersReducedMotion is true
      }
    })
  ).subscribe()
  document.body.style.scrollBehavior = "instant"
  document.body.style.overflowY = "scroll"
  const html = document.scrollingElement
  const currentScroll = html?.scrollTop || 0
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
    onUpdate: () => ScrollTrigger.update()
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
    onStart: ScrollTrigger.refresh
  })

  if (secondScrollDuration > 0) {
    tl.to(html, {
      duration: secondScrollDuration,
      scrollTo: { y: scrollPositions.target, autoKill: false },
      immediateRender: false,
      onStart: ScrollTrigger.refresh
    }, `+=${pause}`)
  }

  return fromEventPattern<boolean>(
    () =>
  tl.eventCallback("onComplete", () => {
    document.body.style.scrollBehavior = currentScrollBehavior
    document.body.style.overflowY = currentScrollBehavior
  }),
    handler => tl.removeEventCallback('onComplete', handler)
  ).pipe(
    map(() => true),
    catchError(err => {
      logger.error(`Error in Smooth Scroll: ${JSON.stringify(err)}`)
      scrollFallback(target)
      return of(false)
    })
  )
}

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

  if (fadeInTargets) {
    fadeInTargets.forEach(target => { target.classList.add("fade-in") })
  }
  if (fadeIn2Targets) {
    fadeIn2Targets.forEach(target => { target.classList.add("fade-in2") })
  }

  const scrollTriggerRefresh$ = fromEventPattern<ScrollTrigger>(
    () => ScrollTrigger.addEventListener("refresh", () => {
      [...(fadeInTargets ? Array.from(fadeInTargets) : []), ...(fadeIn2Targets ? Array.from(fadeIn2Targets) : [])]?.forEach(el => gsap.set(el, { clearProps: "translateY" }))
    })
    ,
    handler => ScrollTrigger.removeEventListener("refresh", handler)
  )

  const resize$ = fromEvent(window, "resize").pipe(debounceTime(100), tap(() => ScrollTrigger.refresh()))

  scrollTriggerRefresh$.subscribe()
  resize$.subscribe()

  setupAnimation(".fade-in", { opacity: 0, y: 50 })
  setupAnimation(".fade-in2", { opacity: 0, y: 50 })

  return [makeScrollBatch(".fade-in", { pin: "h1", scrub: 0.5 }), makeScrollBatch(".fade-in2", { maxDuration: 4, })]
}


  /* ------------------------------------------------------------------------ */
  /*                        All Animation Subscriptions                       */
  /* ------------------------------------------------------------------------ */

export const subscribeToAnimation$ = (): Observable<void> =>
  {

    const heroSelectors = Array.from(document.querySelectorAll(".hero-target-selector"))

  nerfSelectors(heroSelectors)

  const heroScrollTo$ = defer(() => from(heroSelectors.map(selector => fromEvent(selector, "click").pipe(debounceTime(5), filter(ev => ev.target === selector || selector.contains(ev.target as Node)), tap(() => {
      if (infoBox.open) {
        infoBox.click()
      }
    })))).pipe(
      mergeMap((evArray) => from(evArray).pipe(
        switchMap(ev => smoothScroll$(ev.target as Element))
      ))
    ))

  // Observable for easter egg interactions
  infoBox$.subscribe()

  // Observable for hero scroll on-click animations
  heroScrollTo$.subscribe()

  prefersReducedMotion$.subscribe((prefersReducedMotion) => {
      if (prefersReducedMotion) {
        return
      } else {
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
    })

    fromEvent(window, "hashchange").subscribe({
      next: () => {
        window.location.hash = ""
      }
    })

  return of(void 0)
}
