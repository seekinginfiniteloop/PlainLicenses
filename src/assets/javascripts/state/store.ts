/**
 * @module store
 * @description Centralized state management for hero section with reactive state updates
 *
 * Implements a singleton reactive store for managing complex UI state using RxJS,
 * with advanced state tracking, predicate-based logic, and performance optimizations.
 *
 * Frankly, it's overkill, but it was designed for a complex UI with many moving parts... and then I changed the design to be simpler... so now it's overkill.
 * But it works, so I'm leaving it in place.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import {
  BehaviorSubject,
  Observable,
  Observer,
  Subscription,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from "rxjs"
import {
  AnimationComponent,
  ComponentStateUpdateFunction,
  HeroState,
  StatePredicate,
  VideoState,
} from "./types"

import {
  isPageVisible$,
  isPartiallyInViewport,
  navigationEvents$,
  prefersReducedMotion$,
  watchMediaQuery,
} from "~/utils/eventHandlers"
import { isDev, isHome } from "~/utils/conditionChecks"
import { setCssVariable } from "~/utils/helpers"
import { logger } from "~/utils/log"
import * as predicates from "./predicates"
import { getViewportOffset, getViewportSize } from "~/browser"
import { Header, getComponentElement, watchHeader } from "~/components"

let customWindow: CustomWindow = window as unknown as CustomWindow
const weAreDev = isDev(new URL(customWindow.location.href))
const { viewport$ } = customWindow
const initialUrl = new URL(customWindow.location.href)

/**
 * @class HeroStore
 *
 * @description Centralized state management for hero section with reactive state updates
 *
 * @property {BehaviorSubject<HeroState>} state$ - BehaviorSubject that holds the current state of the hero section
 * @property {BehaviorSubject<VideoState>} videoState$ - BehaviorSubject that holds the current state of the video component
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
    prefersReducedMotion: customWindow.matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewport: {
      offset: getViewportOffset(),
      size: getViewportSize(),
    },
    header: { height: 0, hidden: true },
    parallaxHeight: getViewportOffset().y * 1.4,
    location: initialUrl,
    tearDown: false,
  })

  public videoState$ = new BehaviorSubject<VideoState>({ canPlay: false })

  public parallaxHeight$ = new BehaviorSubject<number>(getViewportOffset().y * 1.4)

  private subscriptions = new Subscription()

  /**
   * @returns {HeroStore} Singleton instance of the HeroStore
   * @description Static singleton instance getter
   */
  static getInstance(): HeroStore {
    return (HeroStore.instance ??= new HeroStore())
  }

  /**
   * @description Initializes the HeroStore singleton instance
   */
  private constructor() {
    this.initSubscriptions()
  }

  /**
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
      case AnimationComponent.Video:
        this.videoState$.next(update as VideoState)
        break
      // there were more cases, but we simplified it by moving to the video.
      // keeping this to make it easier to add components in the future.
      case undefined:
        try {
          this.state$.next({ ...this.state$.value, ...update })
        } catch (error) {
          logger.error(`Error updating state: ${error}\nUpdate: ${update}`)
        }
    }
  }

  /**
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @param {AnimationComponent} component Optional component to update state
   * @description Updates the hero state with a partial state
   */
  public updateHeroState(updates: Partial<HeroState>, component?: AnimationComponent): void {
    logger.info("external component updating state; updates:", updates)
    this.updateState(updates, component)
  }

  /**
   * @param {string} name - Name of the observable
   * @param {(T) => Partial<HeroState>} updateFn - Function to update state based on observable value
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates an observer for an observable
   */
  private createObserver<T>(
    name: string,
    updateFn: (_value: T) => Partial<HeroState>,
    component?: AnimationComponent,
  ): Observer<T> {
    return {
      next: (value: T) => {
        logger.info(`${name} received:`, value)
        this.updateState(updateFn(value), component)
      },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`),
    }
  }

  /**
   * @description Initializes all observables and subscriptions
   */
  private initSubscriptions(): void {
    const atHome$ = navigationEvents$.pipe(
      map(isHome),
      distinctUntilChanged(),
      startWith(isHome(initialUrl)),
      shareReplay(1),
      tap(this.createObserver("atHome$", (atHome) => ({ atHome }))),
    )

    const landing$ = isPartiallyInViewport(document.getElementById("parallax-layer") as HTMLElement)

    const landingVisible$ = atHome$.pipe(
      filter((atHome) => atHome),
      switchMap(() => landing$),
      tap(this.createObserver("landingVisible$", (landingVisible) => ({ landingVisible }))),
    )

    const pageVisible$ = isPageVisible$.pipe(
      tap(this.createObserver("pageVisible$", (pageVisible) => ({ pageVisible }))),
    )

    const motion$ = prefersReducedMotion$.pipe(
      tap(
        this.createObserver("prefersReducedMotion$", (prefersReducedMotion) => ({
          prefersReducedMotion,
        })),
      ),
    )

    const view$ = viewport$.pipe(
      distinctUntilChanged(),
      debounceTime(100),
      shareReplay(1),
      tap((viewport) => {
        setCssVariable("--viewport-offset-height", `${viewport.offset.y}px`)
        setCssVariable("--viewport-offset-width", `${viewport.offset.x}px`)
      }),
      tap(this.createObserver("view$", (viewport) => ({ viewport }))),
    )

    const header$ = watchHeader(getComponentElement("header"), { viewport$ }).pipe(
      tap((header: Header) => {
        setCssVariable("--header-height", header.hidden ? "0" : `${header.height}px`)
      }),
      tap(this.createObserver("header$", (header) => ({ header }))),
    )

    const parallax$ = combineLatest([
      viewport$,
      watchHeader(getComponentElement("header"), { viewport$ }),
      watchMediaQuery("(orientation: portrait)"),
    ]).pipe(
      map(([viewport, header, portrait]) => {
        return {
          viewHeight: viewport.offset.y,
          headerHeight: header.height,
          portrait,
        }
      }),
      map(({ viewHeight, headerHeight, portrait }) => {
        const adjustedHeight = viewHeight - headerHeight
        return portrait ? adjustedHeight * 1.4 : adjustedHeight * 1.6
      }),
      distinctUntilChanged(),
      shareReplay(1),
      tap((parallaxHeight) => {
        setCssVariable("--parallax-height", `${parallaxHeight}px`)
      }),
      tap(this.createObserver("parallaxHeight$", (parallaxHeight) => ({ parallaxHeight }))),
    )

    const location$ = navigationEvents$.pipe(
      tap(this.createObserver("location$", (location) => ({ location }))),
    )

    const video$ = this.getVideoState$((v) => this.videoState$.next(v as VideoState))

    this.subscriptions.add(atHome$.subscribe())
    this.subscriptions.add(landingVisible$.subscribe())
    this.subscriptions.add(pageVisible$.subscribe())
    this.subscriptions.add(motion$.subscribe())
    this.subscriptions.add(view$.subscribe())
    this.subscriptions.add(header$.subscribe())
    this.subscriptions.add(location$.subscribe())
    this.subscriptions.add(parallax$.subscribe())
    this.subscriptions.add(video$.subscribe())
  }

  /**
   * @returns {HeroState} Current state of the hero section
   * @description Gets the current state of the hero section
   */
  public getState(): HeroState {
    return this.state$.getValue()
  }

  /**
   * @param {string} subject - Name of the state subject
   * @returns {any} - Current value of the state subject
   * @description Gets the current value of a specific state subject
   */
  public getStateValue(subject: string): any {
    return this.state$.value[subject as keyof HeroState]
  }

  /**
   * @param {string} component - Name of the component
   * @returns {ComponentState} - Current state of the component
   * @description Gets the current state of a specific
   * component or landing permissions
   */
  public getComponentValue(component: string): VideoState {
    switch (component) {
      case AnimationComponent.Video:
        return this.videoState$.value
      default:
        return this.videoState$.value
    }
  }

  /** ============================================
   *          Component Specific Observables
   *=============================================**/

  /**
   * @param {string} name - Name of the observable
   * @param {ComponentStateUpdateFunction} func - Function to update the component state
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates a standard observer for a component observable
   */
  private getComponentObserver<T>(name: string, func?: ComponentStateUpdateFunction): Observer<T> {
    return {
      next: (value: T) => {
        logger.info(`${name} received:`, value)
        if (func) {
          ;(value: T) => func(value as VideoState)
        }
      },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`),
    }
  }

  /**
   * @param {ComponentStateUpdateFunction} observerFunc Function to update the component state
   * @returns {Observable<VideoState>} Observable for carousel state indicating play and pause conditions
   * @description Creates an observable for the carousel state indicating play and pause conditions
   */
  private getVideoState$(observerFunc: ComponentStateUpdateFunction): Observable<VideoState> {
    return this.state$.pipe(
      map((state) => ({
        canPlay: predicates.videoPredicate.canPlay(state),
      })),
      distinctUntilKeyChanged("canPlay"),
      shareReplay(1),
      tap(this.getComponentObserver("carouselState$", observerFunc)),
    )
  }

  /**
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @description Logs and updates state changes for debugging
   */
  public debugStateChange(updates: Partial<HeroState>): void {
    if (weAreDev) {
      const oldState = this.state$.value
      const changes = Object.entries(updates).filter(
        ([key, value]) => oldState[key as keyof HeroState] !== value,
      )

      logger.info("Changes:", Object.fromEntries(changes))
      logger.info("New State:", { ...oldState, ...updates })
      Object.entries(predicates)
        .filter(([_, value]) => typeof value === "function")
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
