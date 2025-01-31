/**
 * @module observer
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @see {@link https://codepen.io/GreenSock/pen/XWzRraJ} GSAP Hero Observers Example
 * @see {@link https://gsap.com/docs/v3/Plugins/Observer/} GSAP Observer Documentation
 */

import { gsap } from "gsap"
import { Observer } from "gsap/Observer"
import { distinctUntilChanged, filter, map } from "rxjs/operators"
import { OBSERVER_CONFIG, ObserverConfig } from "~/config"
import { HeroStore } from "~/state"
import { getContentElements } from "./utils"
import { Subscription } from "rxjs"
import { Direction, Section } from "./types"
import type { HeroState } from "~/state/types"
// Make sure we have the effects registered
import "./effects"
import { logger } from "~/utils/log"

gsap.registerPlugin(Observer)

/**
 * @exports @class HeroObservation
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations. This is heavily
 * inspired by a fine example from the GreenSock team (based on another by Brian Cross), here: https://codepen.io/GreenSock/pen/XWzRraJ
 */
export class HeroObservation {
  private store = HeroStore.getInstance()

  private currentIndex: number = -1

  private config: ObserverConfig = OBSERVER_CONFIG

  private sections: Section[] = []

  private static instance: HeroObservation

  private subscriptions = new Subscription()

  // The observers are created only when the user is at home
  private transitionObserver: Observer | undefined

  private clickObserver: Observer | undefined

  public animating: boolean = false

  private transitionTl: gsap.core.Timeline

  // @ts-ignore - initialized in onLoad
  private wrapper

  private sectionCount: number = 0

  private sectionIndexLength: number = 0

  private defaultTimelineVars: gsap.TimelineVars = {}

  private initialized: boolean = false

  private firstLoad: boolean = true

  private constructor() {
    this.defaultTimelineVars = {
      repeat: 0,
      duration: this.config.slides.slideDuration,
      ease: "power2.inOut",
      onComplete: () => {
        this.animating = false
      },
      onStart: () => {
        this.animating = true
      },
      callbackScope: this,
    }
    this.transitionTl = gsap.timeline(this.defaultTimelineVars)
    this.setupSubscriptions()
    logger.info("HeroObservation initialized")
  }

  /**
   * @description Get the singleton instance of the HeroObservation class.
   * @returns {HeroObservation}
   */
  public static getInstance(): HeroObservation {
    return (HeroObservation.instance ??= HeroObservation.instance = new HeroObservation())
  }

  // Sets up RxJs subscriptions to monitor the atHome state
  private setupSubscriptions() {
    // We're only interested in the atHome state
    const atHome$ = this.store.state$.pipe(
      map((state: HeroState) => state.atHome),
      filter((atHome: boolean) => atHome),
      distinctUntilChanged(),
    )

    this.subscriptions.add(
      atHome$.subscribe(() => {
        this.onLoad()
      }),
    )
  }

  // A delayed initialization function that sets up the observers
  // and the animations for the Hero feature -- when the user is at home
  private onLoad() {
    this.transitionTl.pause()
    const outerWrappers = gsap.utils.toArray(".outer")
    const innerWrappers = gsap.utils.toArray(".inner")
    requestAnimationFrame(() => {
      document.body.style.overflow = "hidden"
      document.body.style.background = "var(--ecru)"
      gsap.set(
        this.sections.map((section) => section.element),
        { autoAlpha: 0 },
      )
      gsap.set(outerWrappers, { yPercent: 100 })
      gsap.set(innerWrappers, { yPercent: -100 })
    })

    if (!this.initialized) {
      this.setupSections()
      this.wrapper = gsap.utils.wrap([...Array(this.sectionCount).keys()])
      this.setupFirstLoad()
      this.setupObserver()
    }
    const { hash } = window.location
    if (hash !== "") {
      this.goToSection(0, 1)
    } else {
      // if there's a hash we need to transition to the correct section
      const target = document.getElementById(hash.substring(1))
      if (target) {
        const sectionTarget = this.sections.find((section) => section.content.includes(target))
        if (sectionTarget) {
          this.firstLoad = false
          const index = this.sections.indexOf(sectionTarget)
          this.goToSection(index, index === this.sectionIndexLength ? Direction.UP : Direction.DOWN)
        }
      }
      this.initialized = true
    }
  }

  /**
   * @description Set up the first load of the Hero feature.
   * Filters out the emphasis targets and fades in the content.
   * Emphasis animations are handled in videoManager.ts.
   */
  private setupFirstLoad() {
    const firstSection = this.sections[0]
    const { content } = firstSection
    const { subtle, strong } = this.config.emphasisTargets
    const subtleTargets = gsap.utils.toArray(document.querySelectorAll(subtle))
    const strongTargets = gsap.utils.toArray(document.querySelectorAll(strong))
    const emphasisTargets = [...subtleTargets, ...strongTargets]
    const filteredContent = content.filter((content) => !emphasisTargets.includes(content))
    gsap.to(filteredContent, { autoAlpha: 1, duration: 0.75 })
    gsap.to(subtleTargets, { autoAlpha: 0.7, duration: 1 })
  }

  /**
   * @param animation - The animation to register (gsap.core.Timeline)
   * @param key - The section element to register the animation with
   * @description Register an animation with a section element.
   */
  public registerAnimation(animation: gsap.core.Timeline, key: Element) {
    const section = this.sections.find((section) => section.element === key)
    if (section) {
      section.animation = section.animation ? section.animation.add(animation) : animation
    }
  }

  /**
   * @description Set up the Section objects for the Hero feature.
   */
  private setupSections() {
    const sectionEls = this.config.fades.fadeInSections
    this.sections = sectionEls.map((el, index) => {
      return {
        index,
        element: el,
        content: getContentElements(el),
        outerWrapper: el.querySelector(".outer"),
        innerWrapper: el.querySelector(".inner"),
        bg: el.querySelector(".bg"),
        animation: gsap
          .timeline({
            paused: !(index === 0), // Only play the first section
          })
          .addLabel("start"),
      }
    }) as Section[]
    const ignores = gsap.utils.toArray(this.config.fades.fadeInIgnore)
    this.sections[0].content.filter((content) => !ignores.includes(content))
    this.sections.forEach((section, _) => {
      const { content } = section
      requestAnimationFrame(() => {
        gsap.set(content, { autoAlpha: 0 })
      })
    })
    this.sectionCount = this.sections.length
    this.sectionIndexLength = this.sectionCount - 1
  }

  /**
   * @description Transition to the next section based on the direction and whether the scenicRoute is enabled.
   * @param direction
   * @param scenicRoute
   * @returns
   */
  public async transition(direction: Direction, scenicRoute?: boolean) {
    let index = this.getNextIndex(direction)
    if (!this.animating && !scenicRoute) {
      this.goToSection(index, direction)
    } else if (!this.animating && scenicRoute && direction === Direction.DOWN) {
      this.goToSection(index, direction)
      let remainingSections = this.sectionIndexLength - index

      while (remainingSections > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000))

        if (this.currentIndex !== this.sectionIndexLength && this.currentIndex === index) {
          this.goToSection(index + Direction.DOWN, direction)
          index++
          remainingSections--
        } else {
          break // Exit loop if condition fails
        }
      }
    }
    return
  }

  // Get the next index based on the direction
  private getNextIndex(direction: Direction): number {
    if (
      (this.currentIndex === 0 || this.currentIndex === -1) &&
      this.firstLoad &&
      direction === Direction.UP
    ) {
      return 0
    }
    this.firstLoad = false
    return this.wrapper(this.currentIndex + direction)
  }

  // Construct the transition timeline based on the direction and index
  // Uses registered effects from observerEffects.ts
  private constructTransitionTimeline(direction: Direction, index: number, tl: gsap.core.Timeline) {
    const nextSection = this.sections[index]
    if (this.currentIndex >= 0) {
      // the first time this runs, currentIndex will be -1
      tl.setSection({ direction, section: nextSection })
    }
    tl.transitionSection({ direction, section: nextSection })
    return tl
  }

  // Go to the next section based on the index and direction
  private goToSection(index: number, direction: Direction) {
    if (this.animating || index === this.currentIndex) {
      return
    }
    this.animating = true
    logger.info(`Going to section ${index} in direction ${direction}`)
    let tl = gsap.timeline({
      defaults: {
        duration: this.config.slides.slideDuration,
        ease: "power2.inOut",
        onComplete: () => {
          this.animating = false
        },
        onStart: () => {
          this.animating = true
        },
        callbackScope: this,
      },
    })
    tl = this.constructTransitionTimeline(direction, index, tl)
    this.transitionTl = tl
    if (!this.transitionTl.isActive()) {
      this.transitionTl.play()
    }
  }

  /**
   * @description Set up the Observers for the Hero feature. The Observers are created only when the user is at home. There are two Observers:
   * 1. The transitionObserver is the main Observer that handles all
   * perceived up/down interactions to trigger transitions between sections.
   * 2. The clickObserver handles the click-driven "guided tour" of the sections.
   */
  private setupObserver() {
    const clickTargets = gsap.utils.toArray(document.querySelectorAll(this.config.clickTargets))
    const ignoreTargets = gsap.utils.toArray(document.querySelectorAll(this.config.ignoreTargets))
    this.transitionObserver = Observer.create({
      type: "wheel,touch,pointer,scroll",
      wheelSpeed: -1,
      onDown: () => {
        this.transition(Direction.DOWN, false)
      },
      onUp: () => {
        this.transition(Direction.UP, false)
      },
      preventDefault: true,
      tolerance: 15,
      ignore: clickTargets as Element[],
    })
    this.transitionObserver.enable()
    this.clickObserver = Observer.create({
      type: "click",
      target: clickTargets as Element[],
      ignore: ignoreTargets as Element[],
      onClick: () => {
        this.transition(Direction.DOWN, true)
      },
      onRelease: () => {
        this.transition(Direction.DOWN, true)
      },
      preventDefault: true,
    })
    this.clickObserver.enable()
  }

  // Destroy the Observers and subscriptions
  public destroy() {
    if (this.transitionObserver) {
      this.transitionObserver.disable()
    }
    if (this.clickObserver) {
      this.clickObserver.disable()
    }
    this.subscriptions.unsubscribe()
  }
}
