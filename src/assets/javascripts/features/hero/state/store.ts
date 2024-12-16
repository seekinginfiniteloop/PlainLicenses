import { BehaviorSubject, Observable, Subscription, combineLatest, debounceTime, distinctUntilChanged, filter, finalize, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs'

import { HeroState } from './types'
import { isPageVisible$, navigationEvents$, prefersReducedMotion$, watchEasterEgg, watchElementInView, watchMediaQuery } from '~/eventHandlers'
import { isHome, isOnSite } from '~/conditionChecks'
import { logger } from '~/log'
import { ImageLoader } from '../imageCarousel/loader'

let customWindow = window as unknown as CustomWindow

const { viewport$ } = customWindow

const defaultState: HeroState = {
  atHome: false,
  canCycle: false,
  eggActive: false,
  error: null,
  prefersReducedMotion: false,
  viewport: { offset: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
  pageOrientation: 'landscape',
  landing: {
    carousel: {
      active: false,
      currentImage: null,
      imageIndex: 0,
      imagePreloaded: false,
      isPaused: true,
      imageCount: 0,
      progress: 0,
    },
    panning: {
      active: false,
      imageIndex: 0,
      paused: false,
      progress: 0,
    },
    impact: {
      active: false,
      preLoaded: false,
      progress: 0,
      paused: false,
      wasShown: false,
    },
    landingVisible: false,
    scroll: {
      target: null,
      wayPoint: null,
      wayPointPause: 0,
      duration: 0,
      progress: 0,
      triggerEnabled: false,
    },
  },
}

/**
 * A singleton store for state management of the hero section.
 */
export class HeroStore {
  private static instance: HeroStore | null = null

  public state$ = new BehaviorSubject<HeroState>({ ...defaultState })

  public navBeacon$ = navigationEvents$.pipe(shareReplay(1))

  private watchSubscriptions = new Subscription()

  private constructor() {
    this.initSubscriptions()
  }

  /**
   * It says what it does.
   * @returns The singleton instance of the HeroStore.
   */
  public static getInstance(): HeroStore {
    return this.instance ??= new HeroStore()
  }

  /**
   * Constructs a series of observables that will update the store's state.
   * @returns An array of observables that will update the store's state.
   */
  private getObservables() {

    const atHome$ = this.navBeacon$.pipe(
      map(isHome),
      distinctUntilChanged(),
      startWith(isHome(new URL(location.href))),
      shareReplay(1),
      tap(atHome => this.updateState({ atHome })))

    const motionPreference$ = prefersReducedMotion$.pipe(
      tap(prefersReducedMotion => this.updateState({
        prefersReducedMotion
      })))

    const eggActive$ = this.navBeacon$.pipe(
      filter(isHome),
      switchMap(() => watchEasterEgg()),
      filter((eggActive): eggActive is boolean => eggActive !== null),
      tap(eggActive => this.updateState({ eggActive })))

    const viewportChange$ = viewport$.pipe(
      filter((viewport): viewport is Viewport => viewport != null), distinctUntilChanged(),
      debounceTime(200), tap(viewport => this.updateState({ viewport })
      ))

    const landingInView$ = this.navBeacon$.pipe(filter(isHome), switchMap(() => watchElementInView(document.getElementById('hero__parallax'))), tap(landingVisible => this.updateState({ landing: { ...this.state$.value.landing, landingVisible } })))

    const orientation$ = watchMediaQuery('(orientation: portrait)').pipe(
      map(matches => matches ? 'portrait' : 'landscape'),
      distinctUntilChanged(),
      tap(pageOrientation => this.updateState({ pageOrientation })))

    const PageIsVisible$ = atHome$.pipe(
      filter(atHome => atHome),
      switchMap(() => isPageVisible$))

    const leftSite$ = this.navBeacon$.pipe(
      filter((url) => !isOnSite(url)),
      debounceTime(30000),
      finalize(() => this.destroy())
    )

    const canCycle$ = combineLatest([
      atHome$.pipe(filter(atHome => atHome)),
      eggActive$.pipe(filter(eggActive => !eggActive)),
      landingInView$.pipe(filter(landingVisible => landingVisible)),
      PageIsVisible$.pipe(filter(visible => visible))
    ]).pipe(
      filter(([atHome, eggActive, inView, pageVisible]) => { return atHome && !eggActive && inView && pageVisible }),
      switchMap(() => of(true)),
      tap(() => this.updateState({ canCycle: true })))

    return [atHome$, motionPreference$, eggActive$, viewportChange$,
      landingInView$, leftSite$, canCycle$, PageIsVisible$, orientation$
    ]
  }

  /**
   * Initializes the store's subscriptions.
   */
  private initSubscriptions() {
    const observables = this.getObservables() as Array<Observable<any>>

    observables.forEach(obs => this.watchSubscriptions.add(obs.subscribe()))
  }

  /**
   * Updates the store's state.
   * @param state The new state to update the store with.
   */
  public updateState(state: Partial<HeroState>) {
    if (state.error instanceof Error) {
      logger.error(`New error in HeroStore's state: ${state.error}`)
    }
    const newState = { ...this.state$.value, ...state }
    this.state$.next(newState)
  }

  /**
   * Destroys the store by unsubscribing from all subscriptions and completing the state subject.
   */
  public destroy() {
    ImageLoader.getInstance().destroy()


    this.watchSubscriptions.unsubscribe()
    this.state$.complete()
    HeroStore.instance = null
  }
}
