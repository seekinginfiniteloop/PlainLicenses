/* eslint-disable no-unused-vars */

export enum StateCondition {
  AtHome = 1 << 0,
  LandingVisible = 1 << 1,
  PageVisible = 1 << 2,
  EggActive = 1 << 3,
  ReducedMotion = 1 << 4,
  ArrivedAtHome = 1 << 5,
}
// Derived states that components care about
export enum ComponentState {

  // Carousel can cycle when: AtHome && LandingVisible && PageVisible && !EggActive
  CanCycle =
  StateCondition.AtHome &
  StateCondition.LandingVisible &
  StateCondition.PageVisible &
  ~StateCondition.EggActive,
  // Pause cycle when ANY: EggActive || !AtHome || !LandingVisible || !PageVisible
  PauseCycle =
  StateCondition.EggActive | ~StateCondition.AtHome | ~StateCondition.LandingVisible | ~StateCondition.PageVisible,

  // Can show impact when: CanCycle && !ReducedMotion
  CanImpact = (
    StateCondition.AtHome &
  StateCondition.LandingVisible &
  StateCondition.PageVisible &
  StateCondition.ArrivedAtHome)
  &
  (~StateCondition.EggActive |
    ~StateCondition.ReducedMotion),

  // Pause impact when ANY: EggActive || !AtHome || !LandingVisible || !PageVisible || ReducedMotion
  NoImpact =
  ~StateCondition.AtHome |
  ~StateCondition.LandingVisible |
  ~StateCondition.PageVisible |
  ~ StateCondition.ArrivedAtHome |
  StateCondition.EggActive |
  StateCondition.ReducedMotion,

  // Can pan when: CanCycle && !ReducedMotion
  CanPan =
  StateCondition.AtHome &
  StateCondition.LandingVisible &
  StateCondition.PageVisible &
  (~StateCondition.EggActive |
    ~StateCondition.ReducedMotion),

  // Pause pan when ANY: EggActive || !AtHome || !LandingVisible || !PageVisible || ReducedMotion
  NoPan =
  ~StateCondition.AtHome |
  ~StateCondition.LandingVisible |
  ~StateCondition.PageVisible |
  StateCondition.EggActive |
  StateCondition.ReducedMotion,

  // Scroll to is button activated, so the only condition is ReducedMotion
  CanScrollTo = ~StateCondition.ReducedMotion,
  NoScrollTo = StateCondition.ReducedMotion,

  // Scroll trigger inherently requires the page to be visible and them to be on the page
  CanScrollTrigger =
  ~StateCondition.EggActive &
  ~StateCondition.ReducedMotion,
  CanReduceScrollTrigger =
  (~StateCondition.EggActive &
  StateCondition.ReducedMotion)
}
export interface CarouselStatus {
  active: boolean
  currentImage: symbol | null
  imageCount: number
  imageIndex: number
  imagePreloaded: boolean
  isPaused: boolean
  progress: number
}

export type PageOrientation = 'portrait' | 'landscape'

export interface PanningStatus {
  active: boolean
  imageIndex: number
  paused: boolean
  progress: number
}

export interface ImpactStatus {
  active: boolean
  paused: boolean
  preLoaded: boolean
  progress: number
  wasShown: boolean
}

export interface LandingViewStatus {
  carousel: CarouselStatus
  impact: ImpactStatus
  landingVisible: boolean
  panning: PanningStatus
  scroll: ScrollStatus
}

export interface ScrollStatus {
  duration: number
  progress: number
  target: Element | null
  wayPoint: Element | null
  wayPointPause: number
  triggerEnabled: boolean
}

export interface HeroState {
  atHome: boolean
  canCycle: boolean
  eggActive: boolean
  error: Error | null
  landing: LandingViewStatus
  pageOrientation: PageOrientation
  prefersReducedMotion: boolean
  viewport: Viewport
}
