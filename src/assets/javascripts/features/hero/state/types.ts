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
