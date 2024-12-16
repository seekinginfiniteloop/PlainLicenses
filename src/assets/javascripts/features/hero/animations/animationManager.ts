import gsap from "gsap"
import { BehaviorSubject, Subscription, distinctUntilChanged, filter, map, skip, skipWhile, tap } from "rxjs"

import type { AnimationStateUpdate, AnimationStates, Animations } from "./types"
import { HeroStore } from "../state/store"
import { HeroState, LandingViewStatus } from "../state/types"

export class AnimationManager {

  private static instance: AnimationManager | null = null

  private animations: Animations = new Map<symbol, gsap.core.Timeline>()

  private store = HeroStore.getInstance()

  private storeState$ = this.store.state$

  private subscriptions = new Subscription()

  private state: BehaviorSubject<AnimationStates>

  private landingKeys = ["impact", "transition", "panning"]

  public static getInstance(): AnimationManager {
    return this.instance ??= new AnimationManager()
  }

  constructor() {
    this.state = new BehaviorSubject(this.getAnimationStates(this.store.state$.value))
    this.initSubscriptions()
  }

  private initSubscriptions() {

    const animationState$ = this.storeState$.pipe(
      map((state) => this.getAnimationStates(state)),
      distinctUntilChanged(),
      skip(1),
      tap((state) => this.state.next(state))
    )

    const pauseWatch$ = this.state.pipe(map((state) => ({ canCycle: state.canCycle, landingVisible: state.landingVisible })),
      distinctUntilChanged(),
      filter(({ canCycle }) => !canCycle),
      tap(() => this.pause(false)),
      filter(({ landingVisible }) => !landingVisible),
      tap(() => this.pause()),
      tap(({ landingVisible }) => { if (!landingVisible) { this.pause() } }))

    const reducedMotion$ = this.state.pipe(filter((state) => state.prefersReducedMotion), tap(() =>
    ))

    const watchPreference$ = this.state.pipe(
      map((state) => state.prefersReducedMotion),
      distinctUntilChanged(),
      iif
    )

    this.subscriptions.add(animationState$.subscribe())
    this.subscriptions.add(pauseWatch$.subscribe())
  }

  public getAnimationStates(storeState: HeroState): AnimationStates {
    return Object.entries(storeState).map(([key, value]) => {
      if (["canCycle", "eggActive", "prefersReducedMotion", "triggerEnabled", "viewport"].includes(key)) {
        return { [key]: value }
      }
      if (key === "landing" && typeof value === "object") {
        const v = value as LandingViewStatus
        return { ...v }
      }
      return null
    }
    ).filter((v) => v !== null) as unknown as AnimationStates
  }

  public pause(all: boolean = true) {
    if (all) {
      this.animations.forEach((timeline, key) => {
        if (timeline.isActive()) {
          timeline.pause()
          this.updateState(key, ["pause" as AnimationStateUpdate])
        }
      })
    } else {
      this.animations.forEach((timeline, key) => {
        const keyName = this.normalizeKeyName(key)
        if (keyName && this.landingKeys.includes(keyName) && timeline.isActive()) {
          timeline.pause()
          this.updateState(key, ["pause" as AnimationStateUpdate])
        }
      })
    }
  }

  /** ============================================
   *               STATE UPDATES
   *=============================================**/

  private updateState(key: symbol, update: AnimationStateUpdate[]) {
    const keyName = this.normalizeKeyName(key)
    if (!keyName) {
      return
    }

    const updates = this.getStateUpdates(update)
    const currentState = this.storeState$.value

    const stateUpdateMap: Record<string, () => void> = {
      transition: () => this.updateLandingCarousel(currentState, updates),
      panning: () => this.updatePanningAndCarousel(currentState, updates),
      impact: () => this.updateImpactState(currentState, updates),
      scroll: () => this.updateScrollState(currentState, updates)
    }

    stateUpdateMap[keyName]?.()
  }

  private normalizeKeyName(key: symbol): string | null {
    const keyName = Symbol.keyFor(key)
    if (!keyName) {
      return null
    }
    return keyName.startsWith("panning") ? "panning" :
         keyName.startsWith("scroll") ? "scroll" :
         keyName
  }

  private getStateUpdates(updates: AnimationStateUpdate[]) {
    const updateMap = {
      "pause": { isPaused: true },
      "play": { isPaused: false, active: true },
      "stop": { active: false, isPaused: false },
      "finished": { wasShown: true, progress: 0 },
      "reset": { progress: 0 },
      "update": {},
      "disable": { triggerEnabled: false, progress: 0, isPaused: false, active: false }
    }
    return updates.reduce((acc, update) => ({ ...acc, ...updateMap[update] }), {})
  }

  private updateLandingCarousel(state: HeroState, updates: object) {
    this.store.updateState({
    ...state,
    landing: {
      ...state.landing,
      carousel: { ...state.landing.carousel, ...updates }
    }
  })
  }

  private updatePanningAndCarousel(state: HeroState, updates: object) {
    this.store.updateState({
    ...state,
    landing: {
      ...state.landing,
      panning: { ...state.landing.panning, ...updates },
      carousel: { ...state.landing.carousel, ...updates }
    }
  })
  }

  private updateImpactState(state: HeroState, updates: object) {
    this.store.updateState({
    ...state,
    landing: {
      ...state.landing,
      panning: { ...state.landing.panning, ...updates },
      carousel: { ...state.landing.carousel, ...updates },
      impact: { ...state.landing.impact, ...updates }
    }
  })
  }

  private updateScrollState(state: HeroState, updates: object) {

    this.store.updateState({
    ...state,
    landing: {
      ...state.landing,
      scroll: { ...state.landing.scroll, ...updates }
    }
  })
  }

}
