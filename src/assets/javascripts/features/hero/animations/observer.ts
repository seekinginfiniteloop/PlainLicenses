import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { debounceTime, filter, map } from "rxjs/operators"
import { OBSERVER_CONFIG } from "~/config"
import { FadeConfig, SlideConfig } from "~/config/types"
import { GsapMatchMediaConditions, Section } from "./types"
import { HeroStore } from "../state/store"
import { getMatchMediaInstance, normalizeResolution } from "./utils"
import { BehaviorSubject } from "rxjs"

gsap.registerPlugin(ScrollTrigger)

class ObservationAnimation {

  private static instance: ObservationAnimation

  private store = HeroStore.getInstance()

  private scrollState = this.store.scrollState$

  private observerConfig = OBSERVER_CONFIG

  private fades: FadeConfig

  private slides: SlideConfig

  private clickTargets: string

  private ignoreTargets: string

  private sections: Section[] = []

  private currentIndex = -1

  public animating = false

  private sectionAnimations: { [key: string]: gsap.core.Timeline }

  private setupSubscriptions() {
    this.scrollState.pipe(
      map(state => state.canTrigger),
    ).subscribe((canTrigger) => {
      if (canTrigger) {
        this.assignFadeIns(this.fades.fadeInSections.slice(1))
        this.setupSections()
        this.setupObserver()
        this.transitionToSection(0, 1)
        ScrollTrigger.refresh()
      }
    })
  }

  private constructor() {
    this.fades = this.observerConfig.fades
    this.slides = this.observerConfig.slides
    this.clickTargets = this.observerConfig.clickTargets
    this.ignoreTargets = this.observerConfig.ignoreTargets
    this.sectionAnimations = Object.fromEntries(
    this.fades.fadeInSections.map(key => [key, gsap.timeline()]))
    this.setupSubscriptions()
  }

  public static getInstance() {
    return this.instance ??= new ObservationAnimation()
  }

  public registerSectionAnimation(section: string, animations: gsap.core.Timeline, positionSelector: string) {
    const tl = this.sectionAnimations[section]
    this.sectionAnimations[section] = tl.add(animations, positionSelector)
  }

  private setupSections() {
    const sectionElements = Array.from(document.querySelectorAll(this.fades.fadeInSections.join(", ")))
    this.sections = Array.from(sectionElements).map(section => ({
      element: section,
      content: Array.from(section.querySelectorAll(".fade-in, .fade-in2"))
    }))
  }

  private assignFadeIns(fadeInSections: string[]) {
    fadeInSections.forEach((selector, idx) => {
      const element = document.querySelector(selector)
      const cls = idx === 0 ? "fade-in" : "fade-in2"
      if (element) {
        const targets = Array.from(element.querySelectorAll("*")).filter(
          el =>
            el !== element &&
            (el.innerHTML.trim() !== "" || el instanceof SVGElement)
        )
        requestAnimationFrame(() => {
          Array.from(targets).forEach(target => {
            target.classList.add(cls)
            gsap.set(target, { autoAlpha: 0 })
          })
        })
      }
    })
  }

  private transitionToSection(index: number, direction: number, pauseDuration: number = 0) {
    if (this.animating) {
      return
    }

    const targetIndex = Math.max(0, Math.min(index, this.sections.length - 1))
    const dFactor = direction === 1 ? 1 : -1

    const tl = gsap.timeline({
      defaults: { duration: this.slides.slideDuration, ease: "power1.inOut" },
      onStart: () => { this.animating = true },
      onComplete: () => { this.animating = false }
    })

    if (this.currentIndex >= 0) {
      const current = this.sections[this.currentIndex]
      tl.to(current.content, {
        opacity: 0,
        y: 50 * dFactor,
        duration: this.slides.slideDuration,
        stagger: {
          amount: 0.05,
          ease: "power1.in",
          axis: "y",
          from: dFactor === 1 ? "start" : "end"
        }
      })
        .set(current.element, { autoAlpha: 0 })
    }

    const target = this.sections[targetIndex]
    tl.set(target.element, { autoAlpha: 1 })
      .fromTo(target.content,
        { opacity: 0, y: 50 * dFactor },
        {
          opacity: 1, y: 0, duration: this.slides.slideDuration, stagger: {
            amount: 0.05, ease: "power1.out", axis: "y", from: dFactor === 1 ? "start" : "end"
          }
        })

    if (pauseDuration && targetIndex < this.sections.length - 1) {
      tl.to({}, { duration: pauseDuration })
        .call(() => {
          if (!this.animating) {
            this.transitionToSection(targetIndex + 1, 1)
          }
        })
    }

    this.currentIndex = targetIndex

  }

  private setupObserver() {
    const ignoreTargets = Array.from(document.querySelectorAll(this.ignoreTargets))
    ScrollTrigger.observe({
      target: document.body,
      axis: "y",
      type: "wheel,touch,scroll",
      wheelSpeed: -1,
      onDown: () => {
        if (!this.animating && this.currentIndex < this.sections.length - 1) {
          this.transitionToSection(this.currentIndex + 1, 1, this.slides.scrollPause)
        }
      },
      onUp: () => {
        if (!this.animating && this.currentIndex > 0) {
          this.transitionToSection(this.currentIndex - 1, -1)
        }
      },
      ignore: ignoreTargets,
      dragMinimum: 25,
      tolerance: 25,
      preventDefault: true
    })
    ScrollTrigger.observe({
      target: this.clickTargets,
      type: "pointer,touch",
      preventDefault: true,
      onClick: () => {
        if (!this.animating) {
          this.transitionToSection(this.currentIndex + 1, 1, this.slides.clickPause)
        }
      },
      onPress: () => {
        if (!this.animating) {
          this.transitionToSection(this.currentIndex + 1, 1, this.slides.clickPause)
        }
      }
    })
  }
}

/**


gsap.registerEffect(
    {
        name: "JumpBlinkEmphasis",
        extendTimeline: true,
        effect: (targets: HTMLElement[], config?: gsap.TimelineVars) => {
            const normedHeight = normalizeResolution()
            const defaults = {
              ease: "elastic",
              repeat: -1,
              delay: 5,
              yoyo: true,
                repeatDelay: 1,
            }
            const timelineConfig = config ? { ...config, ...defaults } : defaults
          const timeline = gsap.timeline(timelineConfig)


            timeline.add(["blink", gsap.to(targets, { autoAlpha: 0, duration: 0.5, repeat: 1, yoyo: true, ease: "power4.in" })], 0)
            timeline.add(["jump", gsap.to(targets, { y: 5, duration: 0.5, ease: "elastic" })], 0)

            })
            const defaults: gsap.TweenVars = {

              y: Math.max(5, 25 * normedHeight),
              scale: 1.5 + gsap.utils.mapRange(0, 1, 0, 1.5, normedHeight)
            }
            }
        }


)

const arrowDownAnimation = () => {
    const mm =   gsap.matchMedia().add(
    {
      lowMotion: 'prefers-reduced-motion: reduce',
      normalMotion: 'prefers-reduced-motion: no-preference'
        },
    (context) => {
            const { lowMotion } = context.conditions as GsapMatchMediaConditions
            if (lowMotion) {
              tl.add(["arrowDownPointer",
                gsap.to('#arrow-down', {
                    y: 5,
                    duration: 1,
                    ease: 'elastic',
                    repeat: -1,
                    repeatDelay: 2,
                    delay: 5,
                    })],
              0)
            }



    }
    )
    const tl = gsap.timeline({ repeat: -1, yoyo: true })
    tl.add(["arrowDownPointer", gsap.to('#arrow-down', { y: 10, duration: 0.5, ease: 'elastic' })], 0)

 }
