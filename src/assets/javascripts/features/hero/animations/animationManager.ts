import gsap from "gsap"
import { BehaviorSubject, Observable, Subscription, distinctUntilChanged, filter,tap, merge } from "rxjs"

import type { Animations } from "./types"
import { HeroStore } from "../state/store"
import { HeroState } from "../state/types"

const getInitialLandingPermissions = (): LandingPermissions => ({})

export class AnimationManager {

  private static instance: AnimationManager | null = null

  private animations: Animations = new Map<symbol, gsap.core.Timeline>()

  private store = HeroStore.getInstance()

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

    const landingPermissions$ = merge(
      // do stuff
    )
    this.subscriptions.add(animationState$.subscribe())

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

  private setupLandingAnimations(nextImage, currentImage?): gsap.core.Timeline {
    const timeline = gsap.timeline()
    const { canCycle, canImpact, canPan } = this.landingPermissions$.value
    if (canImpact) {
      const impactTimeline = this.checkCache(Symbol.for("impact"))
      if (impactTimeline.totalDuration() > 0) {
        timeline.add(impactTimeline)
      } else {
        timeline.add(this.animateImpact())
      }

      if (canPan) {
        // do pan animation
      }
    }
  }

  animateImpact(): gsap.core.TimelineChild {
    throw new Error("Method not implemented.")
  }

  public static animateTransition(nextImage: Observable<HTMLImageElement>, currentImage?: HTMLImageElement): void {
    const instance = AnimationManager.instance || AnimationManager.getInstance()
    const landingTimeline = instance.setupLandingAnimations(nextImage, currentImage)
  }

}
