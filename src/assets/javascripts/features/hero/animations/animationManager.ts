import gsap from "gsap"
import { BehaviorSubject, Observable, Subscription, distinctUntilChanged, iif, of, switchMap, tap } from "rxjs"

import type { Animations } from "./types"
import { HeroStore } from "../state/store"
import { HeroState } from "../state/types"
import { logger } from "~/log"

export class AnimationManager {

  private static instance: AnimationManager | null = null

  private animations: Animations = new Map<symbol, gsap.core.Timeline>()

  private store = HeroStore.getInstance()


  private landing$ = this.store.landingPermissions$

  private storeState$: BehaviorSubject<HeroState> = this.store.state$

  private subscriptions = new Subscription()

  public static getInstance(): AnimationManager {
    return this.instance ??= new AnimationManager()
  }

  constructor() {
    this.initSubscriptions()
  }

  private initSubscriptions() {

    const animationState$ = this.storeState$.pipe(
      distinctUntilChanged(),
    )

    const initialSetup$ = this.storeState$.pipe(
      switchMap(state => iif(
        () => !state.atHome,
        of(this.cacheImpact()),
        of(null))
      ))

    this.subscriptions.add(this.landing$.subscribe())
    this.subscriptions.add(animationState$.subscribe())
    this.subscriptions.add(initialSetup$.subscribe())

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

  private cacheImpact(): void {
    this.animateImpact()
  }

  private checkCache(key: symbol): gsap.core.Timeline {
    const cachedTimeline = this.animations.get(key)
    if (cachedTimeline) {
      return cachedTimeline
    }
    return gsap.timeline()
  }

  private animate(timeline: gsap.core.Timeline): void {
    const initialValues = this.landing$.value
    timeline.data = initialValues
    timeline.eventCallback("onUpdate", () => {

    })
}

  private setupLandingAnimations(nextImage: HTMLImageElement, currentImage?: HTMLImageElement | undefined): gsap.core.Timeline {
    const timeline = gsap.timeline()
    const { canImpact, canPan } = this.landing$.value
    if (canImpact) {
      const impactTimeline = this.checkCache(Symbol.for("impact"))
      if (timeline.totalDuration() > 0) {
        timeline.add(impactTimeline)
      } else {
        timeline.add(this.animateImpact())
      }
    }
    timeline.add(this.animateTransition(nextImage, currentImage))
    if(canPan) {
      const prevDuration = timeline.totalDuration()
      const panTimeline = this.checkCache(Symbol.for(`panning-${nextImage.dataset.imageName}`))
      if (timeline.totalDuration() > prevDuration) {
        timeline.add(panTimeline)
      } else {
        timeline.add(this.animatePanning(nextImage))
      }
    }
      this.timeline.data = landing$.value
      this.animations.set(Symbol.for('mainTimeline'), timeline)
      return this.animateImpact()
  }

  private animatePanning(): gsap.core.TimelineChild {

    // include logic for caching before returning
  }

  private animateImpact(): gsap.core.TimelineChild {

    // include logic for caching before returning
  }

  private animateTransition(nextImage: HTMLImageElement, currentImage?: HTMLImageElement | undefined): gsap.core.TimelineChild {

  }

  public setupTransition(nextImage: Observable<HTMLImageElement>, currentImage?: HTMLImageElement | undefined): void {
    const landingTimeline = this.setupLandingAnimations(nextImage, currentImage)
  }

}
