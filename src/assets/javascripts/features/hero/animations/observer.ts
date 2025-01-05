import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Observer } from "gsap/Observer"
import { debounceTime, distinctUntilChanged, filter, map } from "rxjs/operators"
import { OBSERVER_CONFIG } from "~/config/config"
import { FadeConfig, SlideConfig } from "~/config/types"
import { GsapMatchMediaConditions, Section } from "./types"
import { HeroStore } from "../../../state/store"
import { getMatchMediaInstance, normalizeResolution } from "./utils"
import { Subscription, combineLatest } from "rxjs"

gsap.registerPlugin(Observer, ScrollTrigger)

export class ObservationAnimation {

  private store = HeroStore.getInstance()

  private clickTargets: string

  private currentIndex = -1

  private fades: FadeConfig

  private ignoreTargets: string

  private observerConfig = OBSERVER_CONFIG

  private sectionAnimations: { [key: string]: gsap.core.Timeline }

  private sections: Section[] = []

  private slides: SlideConfig

  private static instance: ObservationAnimation

  private subscriptions = new Subscription()

  private trigger = ScrollTrigger

  private observers: Observer[] = []

  public animating = false //* only public property

// we can access scroll trigger from within the `this` in a gsap instance

  private setupSubscriptions() {

    const atHome$ = this.store.state$.pipe(
      map(state => state.atHome),
      filter(atHome => atHome),
      distinctUntilChanged()
    )

    const resizeWatcher$ = combineLatest([
      this.store.state$.pipe(
        map(state => ({ viewport: state.viewport, header: state.header })),
        debounceTime(100),
      ),
      atHome$
    ]
    ).pipe(
      map(([{ viewport, header }, _]) => { return ({
        y: viewport.offset.y,
        headerHidden: header.hidden,
        headerHeight: header.height,
      })
          }),
      distinctUntilChanged((prev, curr) => {
                return prev.y === curr.y && prev.headerHidden === curr.headerHidden && prev.headerHeight === curr.headerHeight
          })
    )

    this.subscriptions.add(
      resizeWatcher$.subscribe(() => {
                this.trigger.refresh()
                this.trigger.update()
            })
    )
    this.subscriptions.add(atHome$.subscribe(() => {
      this.setupSections()
      this.assignFadeIns(this.fades.fadeInSections)
      this.setupObserver()
     }))
  }

  private constructor() {
    this.fades = this.observerConfig.fades
    this.slides = this.observerConfig.slides
    this.clickTargets = this.observerConfig.clickTargets
    this.ignoreTargets = this.observerConfig.ignoreTargets
    this.sectionAnimations = Object.fromEntries(
      this.fades.fadeInSections.map((key: string) => [key, gsap.timeline()]))
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

  private assignFadeIns(fadeInSections: readonly string[]) {
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

  private downTransition(_self: Observer) {
    const { target } = _self
    const clickTargets = Array.from(document.querySelectorAll(this.clickTargets))
    const isClickTarget = clickTargets.includes(target)
    if (!this.animating && this.currentIndex < this.sections.length - 1) {
      this.transitionToSection(this.currentIndex + 1, 1, isClickTarget ? this.slides.clickPause : this.slides.scrollPause)
    }
  }

  private upTransition(_self: Observer) {
    if (!this.animating && this.currentIndex > 0) {
      this.transitionToSection(this.currentIndex - 1, -1)
    }
  }

  private setupObserver() {
    const ignoreTargets = Array.from(document.querySelectorAll(this.ignoreTargets))
    const movementObserver = this.trigger.observe({
      target: document.body,
      axis: "y",
      type: "wheel,touch,scroll",
      wheelSpeed: -1,
      onDown: this.downTransition.bind(this),
      onUp: this.upTransition.bind(this),
      ignore: ignoreTargets,
      dragMinimum: 25,
      tolerance: 25,
      preventDefault: true
    })
    const clickObserver = this.trigger.observe({
      target: this.clickTargets,
      type: "pointer,touch",
        preventDefault: true,
      onClick: this.downTransition.bind(this),
      onPress: this.downTransition.bind(this),
    })
    this.observers = [movementObserver, clickObserver]
    this.observers.forEach(observer => observer.enable())
  }

  public destroy() {
    this.trigger.getAll().forEach(trigger => trigger.kill())
    this.trigger.update()
    this.subscriptions.unsubscribe()
  }
}
