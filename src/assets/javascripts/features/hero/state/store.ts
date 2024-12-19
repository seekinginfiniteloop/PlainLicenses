/**
 * @module HeroStore
 * @description Reactive state management module for hero section
 *
 * Centralized state management for hero section with reactive state updates.
 * Implements a singleton HeroStore class for managing complex UI state using RxJS.
 *
 * @requires RxJS
 * @requires ./types
 * @requires ~/eventHandlers
 * @requires ~/conditionChecks
 * @requires ~/log
 * @requires ./predicates
 * @requires ~/browser // material for mkdocs
 *
 * @exports HeroStore
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved
 */

import { BehaviorSubject, Observable, Observer, Subscription, debounceTime, distinctUntilChanged, distinctUntilKeyChanged, filter, map, merge, shareReplay, startWith, switchMap, tap } from 'rxjs'
import { AnimationComponent, CarouselState, ComponentState, ComponentUpdateFunction, HeroState, ImpactState, LandingPermissions, PanningState, ScrollState, StatePredicate } from './types'

import { isPageVisible$, isPartiallyInViewport, navigationEvents$, prefersReducedMotion$, watchEasterEgg } from '~/eventHandlers'
import { isDev, isEggBoxOpen, isHome } from '~/conditionChecks'
import { logger } from '~/log'
import * as predicates from './predicates'
import { getViewportOffset, getViewportSize } from '~/browser'

let customWindow: CustomWindow = window as unknown as CustomWindow
const weAreDev = isDev(new URL(customWindow.location.href))
const { viewport$ } = customWindow
const initialUrl = new URL(customWindow.location.href)

/**
 * @class HeroStore
 * @description Centralized state management for hero section with reactive state updates
 *
 * Implements a singleton reactive store for managing complex UI state using RxJS,
 * with advanced state tracking, predicate-based logic, and performance optimizations.
 *
 * @singleton
 * @preserves {HeroState} Reactive state across application
 * @uses {BehaviorSubject} For state management
 * @uses {RxJS} For reactive programming patterns
 */
export class HeroStore {

  private static instance: HeroStore | undefined = new HeroStore()

  // state$ is a BehaviorSubject that holds the current state of the hero section
  public state$ = new BehaviorSubject<HeroState>({
    atHome: isHome(initialUrl),
    landingVisible: isHome(initialUrl),
    pageVisible: !document.hidden || document.visibilityState === "visible",
    eggActive: isEggBoxOpen(),
    prefersReducedMotion: customWindow.matchMedia('(prefers-reduced-motion: reduce)').matches,
    newToHome: isHome(initialUrl),
    viewport: {
      offset: getViewportOffset(),
      size: getViewportSize()
    },
    location: initialUrl,
    tearDown: false
  }
  )

  public carouselState$ = new BehaviorSubject<CarouselState>({ canPlay: false })

  public impactState$ = new BehaviorSubject<ImpactState>({ canPlay: false })

  public panningState$ = new BehaviorSubject<PanningState>({ canPan: false })

  public scrollState$ = new BehaviorSubject<ScrollState>({
    canScrollTo: false,
    canTrigger: false,
    useReducedTriggers: true
  })

  public landingPermissions$ = new BehaviorSubject<LandingPermissions>({
    canPan: false,
    canCycle: false,
    canImpact: false
  })


  private subscriptions = new Subscription()

  // Singleton instance getter
  static getInstance(): HeroStore {
    return HeroStore.instance ??= new HeroStore()
  }

  private constructor() {
    this.initSubscriptions()

  }

  private updateState(update: T, component?: AnimationComponent): void {
    if (weAreDev) {
      this.debugStateChange(update)
    }
    const keys = Object.keys(update)
    if (keys[0] in this.state$.value) {
      this.state$.next({ ...this.state$.value, ...update })
      return
    }
    switch (component) {
      case AnimationComponent.Carousel:
        this.carouselState$.next(update as CarouselState)
        break
      case AnimationComponent.Impact:
        this.impactState$.next(update as ImpactState)
        break
      case AnimationComponent.Panning:
        this.panningState$.next(update )
        break
      case AnimationComponent.ScrollTo:
      case AnimationComponent.ScrollTrigger:
        this.scrollState$.next({ ...this.scrollState$.value, ...update } as ScrollState)
        break
      case undefined:
        try {
          this.state$.next({ ...this.state$.value, ...update })
        } catch (error) {
          logger.error(`Error updating state: ${error}\nUpdate: ${update}`)
        }

    }
  }

  /**
   * Creates an observer for a given observable to log and update state
   * @param name - Name of the observable
   * @param updateFn - Function to update state based on observable value
   * @returns Observer<T> - Observer for the observable
   */
  private createObserver<T>(name: string, updateFn: (_value: T) => Partial<HeroState>, component?: AnimationComponent): Observer<T> {
    return {
      next: (value: T) => {
        logger.info(`${name} received:`, value)
        this.updateState(updateFn(value), component)
    },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`)
    }
  }

  /**
   * Initializes subscriptions to observables for state updates
   */
  private initSubscriptions(): void {

    const atHome$ = navigationEvents$.pipe(
      map(isHome),
      distinctUntilChanged(),
      startWith(isHome(initialUrl)),
      shareReplay(1),
      tap(this.createObserver('atHome$', (atHome) => ({ atHome }))))

    const landing$ = isPartiallyInViewport(document.getElementById("parallax-layer") as HTMLElement)

    const landingVisible$ = atHome$.pipe(
      filter((atHome) => atHome),
      switchMap(() => landing$),
      tap(this.createObserver('landingVisible$', (landingVisible) => ({ landingVisible }))))

    const pageVisible$ = isPageVisible$.pipe(
      tap(this.createObserver('pageVisible$', (pageVisible) => ({ pageVisible }))))

    const motion$ = prefersReducedMotion$.pipe(
      tap(this.createObserver('prefersReducedMotion$', (prefersReducedMotion) => ({ prefersReducedMotion }))))

    const egg$ = watchEasterEgg().pipe(
      tap(this.createObserver('eggActive$', (eggActive) => ({ eggActive }))))

    const newToHome$ = navigationEvents$.pipe(
      distinctUntilChanged((prev, curr) => prev.pathname === curr.pathname),
      map(isHome),
      filter((atHome) => atHome),
      tap(this.createObserver('newToHome$', (newToHome) => ({ newToHome }))))

    const view$ = viewport$.pipe(
      distinctUntilChanged(),
      debounceTime(100),
      shareReplay(1),
      tap(this.createObserver('view$', (viewport) => ({ viewport }))))

    const location$ = navigationEvents$.pipe(
      tap(this.createObserver('location$', (location) => ({ location }))))

    const carousel$ = this.getCarouselState$((v) => this.carouselState$.next(v as CarouselState))

    const impact$ = this.getImpactState$((v) => this.impactState$.next(v as ImpactState))

    const panning$ = this.getPanningState$((v) => this.panningState$.next(v as PanningState))

    const scroll$ = this.getScrollState$((v) => this.scrollState$.next(v as ScrollState))

    const landingStatus$ = merge(
      this.carouselState$,
      this.impactState$,
      this.panningState$,
    ).pipe(
      map((state) => ({
        canCycle: (state as any).canCycle,
        canImpact: (state as any).canImpact,
        canPan: (state as any).canPan
      })),
      distinctUntilChanged(),
      shareReplay(1))


    this.subscriptions.add(atHome$.subscribe())
    this.subscriptions.add(landingVisible$.subscribe())
    this.subscriptions.add(pageVisible$.subscribe())
    this.subscriptions.add(motion$.subscribe())
    this.subscriptions.add(egg$.subscribe())
    this.subscriptions.add(newToHome$.subscribe())
    this.subscriptions.add(view$.subscribe())
    this.subscriptions.add(location$.subscribe())
    this.subscriptions.add(carousel$.subscribe())
    this.subscriptions.add(impact$.subscribe())
    this.subscriptions.add(panning$.subscribe())
    this.subscriptions.add(scroll$.subscribe())
    this.subscriptions.add(landingStatus$.subscribe(
      {
        next: (value) => this.landingPermissions$.next(value as LandingPermissions),
        error: (error) => logger.error('Error in landingStatus$:', error),
        complete: () => logger.info('landingStatus$ completed')
      }
    ))
  }

  /** ============================================
   *          Component Specific Observables
   *=============================================**/

  /**
   * Creates an observer for a component state
   * @param name - Name of the component
   * @param func - ComponentUpdateFunction - Function to update the component state
   * @returns - Observer<T> - Observer for the component state
   */
  private getComponentObserver<T>(name: string, func?: ComponentUpdateFunction): Observer<T> {
    return {
      next: (value: T) => {
        logger.info(`${name} received:`, value)
        if (func) {
          (value: T) => func(value as ComponentState)
        }
      },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`)
    }
  }

  /**
   * Creates an observable for the carousel state
   * @param observerFunc - ComponentUpdateFunction - Function to update the component state
   * @returns Observable<CarouselState> - Observable for carousel state indicating play and pause conditions
   */
  private getCarouselState$(observerFunc: ComponentUpdateFunction): Observable<CarouselState> {
    return this.state$.pipe(
      map(state => ({
        canPlay: predicates.carouselPredicates.canPlay(state),
      })),
      distinctUntilKeyChanged('canPlay'),
      shareReplay(1),
      tap(this.getComponentObserver('carouselState$', observerFunc))
    )
  }

  /**
   * Creates an observable for the intro impact text state
   * @param observerFunc - ComponentUpdateFunction - Function to update the component state
   * @returns Observable<ImpactState> - Observable for impact text state indicating play and stop/don't play conditions
   */
  private getImpactState$(observerFunc: ComponentUpdateFunction): Observable<ImpactState> {
    return this.state$.pipe(
      map(state => ({
        canPlay: predicates.impactPredicates.canPlay(state)})),
      distinctUntilKeyChanged('canPlay'),
      shareReplay(1),
      tap(this.getComponentObserver('impactState$', observerFunc))
    )
  }

  /**
   * Creates an observable for the image cycler state
   * @param observerFunc - ComponentUpdateFunction - Function to update the component state
   * @returns Observable<PanningState> - Observable for image cycler state indicating pan and pause/don't play conditions
   */
  private getPanningState$(observerFunc: ComponentUpdateFunction): Observable<PanningState> {
    return this.state$.pipe(
      map(state => ({
        canPan: predicates.panningPredicates.canPan(state),
      })),
      distinctUntilKeyChanged('canPan'),
      shareReplay(1),
      tap(this.getComponentObserver('panningState$', observerFunc))
    )
  }

  /**
   * Creates an observable for the scroll state
   * @param observerFunc - ComponentUpdateFunction - Function to update the component state
   * @returns Observable<ScrollState> - Observable for scroll state indicating scroll to, trigger, and reduced trigger conditions
   */
  private getScrollState$(observerFunc: ComponentUpdateFunction): Observable<ScrollState> {
    return this.state$.pipe(
      map(state => ({
        canScrollTo: predicates.scrollPredicates.canScrollTo(state),
        canTrigger: predicates.scrollPredicates.canTrigger(state),
        useReducedTriggers: predicates.scrollPredicates.useReducedTriggers(state)
      })),
      distinctUntilChanged((prev, curr) =>
        prev.canScrollTo === curr.canScrollTo ||
        prev.canTrigger === curr.canTrigger ||
        prev.useReducedTriggers === curr.useReducedTriggers
      ),
      shareReplay(1),
      tap(this.getComponentObserver('scrollState$', observerFunc))
    )
  }

  /**
   * Creates an observable for the scroll state
   * @returns Observable<{ canScrollTo: boolean, canTrigger: boolean, useReducedTriggers: boolean }>
   */
  public debugStateChange(updates: Partial<HeroState>): void {
    if (weAreDev) {
      const oldState = this.state$.value
      const changes = Object.entries(updates)
        .filter(([key, value]) => oldState[key as keyof HeroState] !== value)

      logger.info('Changes:', Object.fromEntries(changes))
      logger.info('New State:', { ...oldState, ...updates })
      Object.entries(predicates)
        .filter(([_, value]) => typeof value === 'function')
        .forEach(([name, predicate]) => {
          logger.info(`${name}:`, (predicate as StatePredicate)({ ...oldState, ...updates }))
        })
    }
  }

  public destroy(): void {
    this.subscriptions.unsubscribe()
    HeroStore.instance = undefined
  }
}
