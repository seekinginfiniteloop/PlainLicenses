/**
 * @module store
 * @description Centralized state management for hero section with reactive state updates
 *
 * Implements a singleton reactive store for managing complex UI state using RxJS,
 * with advanced state tracking, predicate-based logic, and performance optimizations.
 *
 * @requires rxjs BehaviorSubject, Observable, Observer, Subscription, combineLatest, debounceTime, distinctUntilChanged, distinctUntilKeyChanged, filter, map, merge, shareReplay, startWith, switchMap, tap
 * @requires @external {CustomWindow} window - Exported window object from Material for MkDocs' bundled JavaScript
 * @requires @external ~/browser - {@link getViewportOffset}, {@link getViewportSize} - Browser utility functions
 * @requires @external ~/components - {@link getComponentElement}, {@link watchHeader} - Component utility functions
 *
 * @exports HeroStore
 *
 * @dependencies
 * - {@link module:~/utils/eventHandlers} - {@link isPageVisible$}, {@link isPartiallyInViewport}, {@link navigationEvents$}, {@link prefersReducedMotion$}, {@link setCssVariable}, {@link watchEasterEgg}, {@link watchMediaQuery} - Event handling utilities
 * - {@link module:~/utils/conditionChecks} - {@link isDev}, {@link isEggBoxOpen}, {@link isHome} - Conditional check utilities
 * - {@link module:log} - {@link logger} - Logging utility
 * - {@link module:./predicates} - {@link carouselPredicates}, {@link impactPredicates}, {@link panningPredicates}, {@link scrollPredicates} - State predicate functions
 *
 * @type {@link module:~/components} - {@link Header} - Header component
 * @type {@link module:./types} - {@link HeroState} - Hero state structure
 * @type {@link module:./types} - {@link CarouselState} - Carousel state structure
 * @type {@link module:./types} - {@link ImpactState} - Impact state structure
 * @type {@link module:./types} - {@link PanningState} - Panning state structure
 * @type {@link module:./types} - {@link ScrollState} - Scroll state structure
 * @type {@link module:./types} - {@link StatePredicate} - State predicate type
 * @type {@link module:./types} - {@link AnimationComponent} - Animation component types
 * @type {@link module:./types} - {@link ComponentState} - Component state structure
 * @type {@link module:./types} - {@link ComponentUpdateFunction} - Component update function type
 * @type {@link module:./types} - {@link LandingPermissions} - Landing permissions structure
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import { BehaviorSubject, Observable, Observer, Subscription, combineLatest, debounceTime, distinctUntilChanged, distinctUntilKeyChanged, filter, map, merge, shareReplay, startWith, switchMap, tap } from 'rxjs'
import { AnimationComponent, CarouselState, ComponentState, ComponentUpdateFunction, HeroState, ImpactState, LandingPermissions, PanningState, ScrollState, StatePredicate } from './types'

import { isPageVisible$, isPartiallyInViewport, navigationEvents$, prefersReducedMotion$, setCssVariable, watchEasterEgg, watchMediaQuery } from '~/utils/eventHandlers'
import { isDev, isEggBoxOpen, isHome } from '~/utils/conditionChecks'
import { logger } from '~/log'
import * as predicates from './predicates'
import { getViewportOffset, getViewportSize } from '~/browser'
import { Header, getComponentElement, watchHeader } from '~/components'

let customWindow: CustomWindow = window as unknown as CustomWindow
const weAreDev = isDev(new URL(customWindow.location.href))
const { viewport$ } = customWindow
const initialUrl = new URL(customWindow.location.href)

/**
 * @exports HeroStore
 * @class HeroStore
 * @singleton
 * @preserves {HeroState} Reactive state across application
 * @uses {BehaviorSubject} For state management
 *
 * @description Centralized state management for hero section with reactive state updates
 *
 * @property {BehaviorSubject<HeroState>} state$ - BehaviorSubject that holds the current state of the hero section
 * @property {BehaviorSubject<CarouselState>} carouselState$ - BehaviorSubject that holds the current state of the carousel component
 * @property {BehaviorSubject<ImpactState>} impactState$ - BehaviorSubject that holds the current state of the impact component
 * @property {BehaviorSubject<PanningState>} panningState$ - BehaviorSubject that holds the current state of the panning component
 * @property {BehaviorSubject<ScrollState>} scrollState$ - BehaviorSubject that holds the current state of the scroll component
 * @property {BehaviorSubject<LandingPermissions>} landingPermissions$ - BehaviorSubject that holds the current state of the landing permissions
 * @property {BehaviorSubject<number>} parallaxHeight$ - BehaviorSubject that holds the current state of the parallax height
 * @property {Subscription} subscriptions - Subscription for managing observables
 *
 * @method getInstance - Static singleton instance getter
 * @method updateHeroState - Updates the hero state with a partial state object
 * @method getState - Gets the current state of the hero section
 * @method getStateValue - Gets the value of a specific state subject
 * @method getComponentValue - Gets the value of a specific component
 * @method debugStateChange - Logs and updates state changes for debugging
 * @method destroy - Unsubscribes from all observables and resets the singleton instance
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
    header: { height: 0, hidden: true },
    parallaxHeight: getViewportOffset().y * 1.4,
    location: initialUrl,
    tearDown: false
  }
  )

  public carouselState$ = new BehaviorSubject<CarouselState>({ canPlay: false })

  public impactState$ = new BehaviorSubject<ImpactState>({ canPlay: false })

  public panningState$ = new BehaviorSubject<PanningState>({ canPan: false })

  public scrollState$ = new BehaviorSubject<ScrollState>({
    canTrigger: false,
  })

  public landingPermissions$ = new BehaviorSubject<LandingPermissions>({
    canPan: false,
    canCycle: false,
    canImpact: false
  })

  public parallaxHeight$ = new BehaviorSubject<number>(getViewportOffset().y * 1.4)


  private subscriptions = new Subscription()

  /**
   * @method getInstance
   * @static
   * @public
   * @returns {HeroStore} Singleton instance of the HeroStore
   * @description Static singleton instance getter
   */
  static getInstance(): HeroStore {
    return HeroStore.instance ??= new HeroStore()
  }

  /**
   * @constructor
   * @private
   * @description Initializes the HeroStore singleton instance
   */
  private constructor() {
    this.initSubscriptions()
  }

  /**
   * @method updateState
   * @private
   * @param {Partial<HeroState>} update - Partial state object to update the hero state
   * @param {AnimationComponent} component Optional component to update
   * @description Updates the hero state with a partial state
   */
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
   * @method updateHeroState
   * @public
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @param {AnimationComponent} component Optional component to update state
   * @description Updates the hero state with a partial state
   */
  public updateHeroState(updates: Partial<HeroState>, component?: AnimationComponent): void {
    logger.info('external component updating state; updates:', updates)
    this.updateState(updates, component)

  /**
   * @method createObserver
   * @private
   * @param {string} name - Name of the observable
   * @param {(T) => Partial<HeroState>} updateFn - Function to update state based on observable value
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates an observer for an observable
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
   * @method initSubscriptions
   * @private
   * @description Initializes all observables and subscriptions
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
      tap((viewport) => {
        setCssVariable('--viewport-offset-height', `${viewport.offset.y}px`)
        setCssVariable('--viewport-offset-width', `${viewport.offset.x}px`)
      }),
      tap(this.createObserver('view$', (viewport) => ({ viewport }))))

    const header$ = watchHeader(getComponentElement("header"), { viewport$ }).pipe(
      tap((header: Header) => {
        setCssVariable('--header-height', header.hidden ? '0' : `${header.height}px`)
      }),
      tap(this.createObserver('header$', (header) => ({ header }))))

    const parallax$ = combineLatest([
      viewport$,
      watchHeader(getComponentElement("header"), { viewport$ }),
      watchMediaQuery('(orientation: portrait)')]
    ).pipe(
      map(([viewport, header, portrait]) => {
        return {
          viewHeight: viewport.offset.y,
          headerHeight: header.height,
          portrait
        }
      }),
      map(({ viewHeight, headerHeight, portrait }) => {
        const adjustedHeight = viewHeight - headerHeight
        return portrait ? adjustedHeight * 1.4 : adjustedHeight * 1.6
      }),
      distinctUntilChanged(),
      shareReplay(1),
      tap((parallaxHeight) => {
        setCssVariable('--parallax-height', `${parallaxHeight}px`)
      }),
      tap(this.createObserver('parallaxHeight$', (parallaxHeight) => ({ parallaxHeight })))
    )

    const location$ = navigationEvents$.pipe(
      tap(this.createObserver('location$', (location) => ({ location }))))

    const carousel$ = this.getCarouselState$((v) => this.carouselState$.next(v as CarouselState))

    const impact$ = this.getImpactState$((v) => this.impactState$.next(v as ImpactState))

    const panning$ = this.getPanningState$((v) => this.panningState$.next(v as PanningState))

    const scroll$ = this.getScrollState$((v) => this.scrollState$.next(v as unknown as ScrollState))

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
    this.subscriptions.add(header$.subscribe())
    this.subscriptions.add(location$.subscribe())
    this.subscriptions.add(parallax$.subscribe())
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

  /**
   * @method getState
   * @public
   * @returns {HeroState} Current state of the hero section
   * @description Gets the current state of the hero section
   */
  public getState(): HeroState {
    return this.state$.getValue()
  }

  /**
   * @method getStateValue
   * @public
   * @param {string} subject - Name of the state subject
   * @returns {any} - Current value of the state subject
   * @description Gets the current value of a specific state subject
   */
  public getStateValue(subject: string): any {
    return this.state$.value[subject as keyof HeroState]
  }


  /**
   * @method getComponentValue
   * @public
   * @param {string} component - Name of the component
   * @returns {ComponentState | LandingPermissions} - Current state of the component
   * @description Gets the current state of a specific
   * component or landing permissions
   */
  public getComponentValue(component: string): ComponentState | LandingPermissions {
    switch (component) {
      case AnimationComponent.Carousel:
        return this.carouselState$.value
      case AnimationComponent.Impact:
        return this.impactState$.value
      case AnimationComponent.Panning:
        return this.panningState$.value
      case AnimationComponent.ScrollTrigger:
        return this.scrollState$.value as unknown as ComponentState
      default:
        return this.landingPermissions$.value
    }

  }

  /** ============================================
   *          Component Specific Observables
   *=============================================**/

  /**
   * @method getComponentObserver
   * @private
   * @param {string} name - Name of the observable
   * @param {ComponentUpdateFunction} func - Function to update the component state
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates a standard observer for a component observable
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
   * @method getCarouselState$
   * @private
   * @param {ComponentUpdateFunction} observerFunc Function to update the component state
   * @returns {Observable<CarouselState>} Observable for carousel state indicating play and pause conditions
   * @description Creates an observable for the carousel state indicating play and pause conditions
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
   * @method getImpactState$
   * @private
   * @param {ComponentUpdateFunction} observerFunc - Function to update the component state
   * @returns {Observable<ImpactState>} - Observable for impact state indicating play and pause conditions
   * @description Creates an observable for the impact state indicating play and pause conditions
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
   * @method getPanningState$
   * @private
   * @param {ComponentUpdateFunction} observerFunc - Function to update the component state
   * @returns {Observable<PanningState>} - Observable for panning state indicating pan conditions
   * @description Creates an observable for the panning state indicating pan conditions
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
   * @method getScrollState$
   * @private
   * @param {ComponentUpdateFunction} observerFunc - Function to update the component state
   * @returns {Observable<ScrollState>} - Observable for scroll state indicating trigger conditions
   * @description Creates an observable for the scroll state indicating trigger conditions
   */
  private getScrollState$(observerFunc: ComponentUpdateFunction): Observable<ScrollState> {
    return this.state$.pipe(
      map(state => ({
        canTrigger: predicates.scrollPredicates.canTrigger(state),
      })),
      distinctUntilChanged((prev, curr) => {
        return prev.canTrigger === curr.canTrigger
      }
      ),
      shareReplay(1),
      tap(this.getComponentObserver('scrollState$', observerFunc))
    )
  }


  /**
   * @method debugStateChange
   * @public
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @description Logs and updates state changes for debugging
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

  /**
   * @method destroy
   * @public
   * @description Unsubscribes from all observables and resets the singleton instance
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    HeroStore.instance = undefined
  }
}
