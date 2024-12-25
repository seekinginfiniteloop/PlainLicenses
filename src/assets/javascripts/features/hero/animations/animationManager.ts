import gsap from "gsap"
import { BehaviorSubject, Observable, Subscription, distinctUntilChanged, iif, of, switchMap, tap } from "rxjs"

import type { Animations, ImpactTimeline } from "./types"
import { HeroStore } from "../state/store"
import { HeroState } from "../state/types"
import { logger } from "~/log"
import { ImpactAnimation } from "./impactText"

export class AnimationManager {

  private static instance: AnimationManager | null = null

  private animations: Animations = new Map<symbol, gsap.core.Timeline>()

  private currentTimeline: symbol | null = null

  private store = HeroStore.getInstance()

  private impactAnimator = ImpactAnimation.getInstance()

  private landing$ = this.store.landingPermissions$

  private scrollState$ = this.store.scrollState$

  private storeState$: BehaviorSubject<HeroState> = this.store.state$

  private subscriptions = new Subscription()

  public static getInstance(): AnimationManager {
    return this.instance ??= new AnimationManager()
  }

  constructor() {
    this.initSubscriptions()
  }

  private initSubscriptions() {

    const heroState$ = this.storeState$.pipe(
      distinctUntilChanged(),
    )

    const initialSetup$ = this.storeState$.pipe(
      switchMap(state => iif(
        () => !state.atHome,
        of(this.cacheImpact()),
        of(null))
      ))

    this.subscriptions.add(this.landing$.subscribe())
    this.subscriptions.add(heroState$.subscribe())
    this.subscriptions.add(initialSetup$.subscribe())
    this.subscriptions.add(this.scrollState$.subscribe())

    // Subscribe to carouselState$ from HeroStore
    this.store.carouselState$.pipe(
      distinctUntilChanged(),
      tap((state) => {
        logger.info("Carousel State Changed:", state)
        // Add logic based on carousel state
        // For example:
        if (state.canPlay) {
          // Trigger animations or other actions
        } else {
          // Handle pause or other states
        }
      })
    ).subscribe()

    // TODO add logic for landing permissions, and caching impact animations if they don't start at the home page
  }

  private checkCache(key: symbol): gsap.core.Timeline {
    const cachedTimeline = this.animations.get(key)
    if (cachedTimeline) {
      return cachedTimeline
    }
    return gsap.timeline()
  }

  private isNewTimeline(timeline: gsap.core.Timeline): boolean {
    return timeline.totalDuration() === 0
  }

  private animate(timeline: gsap.core.Timeline): void {
    const initialValues = this.landing$.value
    timeline.data = initialValues
    timeline.eventCallback("onUpdate", () => {

    })
  }

  private setupLandingAnimations(nextImage: HTMLImageElement, currentImage?: HTMLImageElement | undefined): gsap.core.Timeline {
    const timeline = gsap.timeline()
    timeline.data = {...timeline.data, ...this.landing$.value}
    const { canImpact, canPan } = this.landing$.value
    if (canImpact || this.store.state$.value.newToHome) {
      const impactTimeline = this.checkCache(Symbol.for("impact"))
      if (this.isNewTimeline(impactTimeline)) {
        timeline.add(impactTimeline)
      } else {
        const impactTimeline: ImpactTimeline = this.impactAnimator.animateText()
        this.animations.set(Symbol.for("impact"), impactTimeline)
        timeline.add(impactTimeline)
      }
    }
    timeline.add(this.animateTransition(nextImage, currentImage))
    if(canPan) {
      const panTimeline = this.checkCache(Symbol.for(`panning-${nextImage.dataset.imageName}`))
      if (panTimeline.totalDuration() > 0) {
        timeline.add(panTimeline)
      } else {
        timeline.add(this.animatePanning(nextImage))

      }
    }
    this.timeline.data = landing$.value
    this.animations.set(Symbol.for('mainTimeline'), timeline)
  }

  private cacheImpact() {
    const impactTimeline = animateText()
    this.animations.set(Symbol.for("impact"), impactTimeline)
  }

  private animatePanning(): gsap.core.TimelineChild {

    // include logic for caching before returning
  }

  private animateTransition(nextImage: HTMLImageElement, currentImage?: HTMLImageElement | undefined): gsap.core.TimelineChild {

  }

  public setupTransition(nextImage: Observable<HTMLImageElement>, currentImage?: HTMLImageElement | undefined): void {
    const landingTimeline = this.setupLandingAnimations(nextImage, currentImage)
  }

}
