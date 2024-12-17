import { BehaviorSubject, Observable, Subscription, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay,  } from 'rxjs'
import { ComponentState, StateCondition } from './types'

import { isPageVisible$, navigationEvents$, prefersReducedMotion$, watchElementInView,  watchMediaQuery } from '~/eventHandlers'
import { isHome, isDev } from '~/conditionChecks'
import { logger } from '~/log'


let customWindow: CustomWindow = window as unknown as CustomWindow

const { viewport$ } = customWindow

export class HeroStore {
  private static instance: HeroStore | null = null;

  // Core state observable
  private conditions$ = new BehaviorSubject<number>(0);

  // Track subscriptions for cleanup
  private subscriptions = new Subscription();

  private constructor() {
    if (isDev) {
      // Debug state changes in development
      this.subscriptions.add(
        this.conditions$.subscribe(state => {
          this.debugState('State updated', state);
        })
      );
    }
  }

  static getInstance(): HeroStore {
    return HeroStore.instance ??= new HeroStore();
  }

  // Component-specific state observables
  getCarouselState$(): Observable<{ canPlay: boolean }> {
    return this.conditions$.pipe(
      map(state => ({
        canPlay: this.checkState(state, ComponentState.CanCycle),
        shouldPause: this.checkState(state, ComponentState.PauseCycle)
      })),
      distinctUntilChanged((prev, curr) =>
        prev.canPlay === curr.canPlay &&
        prev.shouldPause === curr.shouldPause
      ),
      shareReplay(1)
    );
  }

  getImpactState$(): Observable<{ canPlay: boolean }> {
    return this.conditions$.pipe(
      map(state => ({
        canPlay: this.checkState(state, ComponentState.CanImpact),
        shouldStop: this.checkState(state, ComponentState.NoImpact)
      })),
      distinctUntilChanged((prev, curr) =>
        prev.canPlay === curr.canPlay &&
        prev.shouldStop === curr.shouldStop
      ),
      shareReplay(1)
    );
  }

  getPanningState$(): Observable<{ canPan: boolean }> {
    return this.conditions$.pipe(
      map(state => ({
        canPan: this.checkState(state, ComponentState.CanPan),
        shouldPause: this.checkState(state, ComponentState.NoPan)
      })),
      distinctUntilChanged((prev, curr) =>
        prev.canPan === curr.canPan &&
        prev.shouldPause === curr.shouldPause
      ),
      shareReplay(1)
    );
  }

  getScrollState$(): Observable<{
    canScrollTo: boolean,
    canTrigger: boolean,
    useReducedTriggers: boolean
  }> {
    return this.conditions$.pipe(
      map(state => ({
        canScrollTo: this.checkState(state, ComponentState.CanScrollTo),
        canTrigger: this.checkState(state, ComponentState.CanScrollTrigger),
        useReducedTriggers: this.checkState(state, ComponentState.CanReduceScrollTrigger)
      })),
      distinctUntilChanged((prev, curr) =>
        prev.canScrollTo === curr.canScrollTo &&
        prev.canTrigger === curr.canTrigger &&
        prev.useReducedTriggers === curr.useReducedTriggers
      ),
      shareReplay(1)
    );
  }

  // State updates
  updateCondition(condition: StateCondition, value: boolean): void {
    const currentState = this.conditions$.value;
    const newState = value
      ? currentState | condition
      : currentState & ~condition;

    if (this.isValidStateTransition(currentState, newState)) {
      this.conditions$.next(newState);
    } else {
      logger.warn(
        'Invalid state transition attempted',
        { from: currentState, to: newState }
      );
    }
  }

  // State validation
  private isValidStateTransition(from: number, to: number): boolean {
    // Can't arrive at home without being at home
    if ((to & StateCondition.ArrivedAtHome) && !(to & StateCondition.AtHome)) {
      return false;
    }

    // Can't have landing visible without being at home
    if ((to & StateCondition.LandingVisible) && !(to & StateCondition.AtHome)) {
      return false;
    }

    return true;
  }

  private checkState(state: number, requiredState: ComponentState): boolean {
    return (state & requiredState) === requiredState;
  }

  private debugState(message: string, state: number): void {
    if (!isDev) return;

    const activeConditions = Object.entries(StateCondition)
      .filter(([_, value]) => typeof value === 'number')
      .filter(([_, value]) => state & value)
      .map(([key]) => key);

    const activeStates = Object.entries(ComponentState)
      .filter(([_, value]) => typeof value === 'number')
      .filter(([_, value]) => this.checkState(state, value))
      .map(([key]) => key);

    logger.info('Active Conditions:', activeConditions);
    logger.info('Active States:', activeStates);
    logger.info('Binary:', state.toString(2).padStart(6, '0'));
  }

  // Cleanup
  destroy(): void {
    this.subscriptions.unsubscribe();
    this.conditions$.complete();
    HeroStore.instance = null;
  }
}
