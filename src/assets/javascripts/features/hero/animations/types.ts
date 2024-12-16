import { CarouselStatus, HeroState, ImpactStatus, PanningStatus, ScrollStatus } from "../state/types"
import { heroImages } from "../imageCarousel/heroImages"

export type AnimationStateUpdate = "pause" | "play" | "stop" | "finished" | "reset" | "update" | "disable"

type ImageKey = typeof heroImages[number]["imageName"]

type PanningKey = `panning-${ImageKey}`

export type AnimationType = "transition" | "scrollTrigger" | "scrollTo" | "impact" | PanningKey

export type Animations = Map<symbol, gsap.core.Timeline>

// A modified version of HeroState with pertinent properties pushed to the top level
export interface AnimationStates extends Partial<HeroState> {
  canCycle: boolean
  carousel: CarouselStatus
  eggActive: boolean
  impact: ImpactStatus
  landingVisible: boolean
  panning: PanningStatus
  prefersReducedMotion: boolean
  scroll: ScrollStatus
  triggerEnabled: boolean
  viewport: Viewport
}


export type HeroKey = keyof HeroState
export type HeroValue = HeroState[HeroKey]
