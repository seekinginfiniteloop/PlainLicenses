/* eslint-disable no-unused-vars */


export enum Action {
  Disable,
  Finish,
  Pause,
  Play,
  Reset,
  Restart,
  Resume,
  Reverse,
  Stop,
  Update,
}

export type HaltingAction = Action.Pause | Action.Stop | Action.Finish | Action.Disable
export type ResumingAction = Action.Play | Action.Resume | Action.Reverse
export type RestartingAction = Action.Reset | Action.Restart

export enum AnimationType {
  Impact,
  Panning,
  ScrollTo,
  ScrollTrigger,
  Transition,
}

export type LandingAnimation = AnimationType.Impact | AnimationType.Panning | AnimationType.Transition

export enum RestrictedAnimations {
  FullyRestricted = AnimationType.Impact | AnimationType.Panning | AnimationType.ScrollTo,
  SomeRestricted = AnimationType.ScrollTrigger,
  Unrestricted = AnimationType.Transition,
  OnlyNewArrival = AnimationType.Impact,
  Pausable = ~AnimationType.ScrollTo,
  OnlyOnLanding = AnimationType.Impact | AnimationType.Panning | AnimationType.Transition,
}

export enum ViewPrecondition {
  OnPage,
  IsInViewport,
  IsVisible,
  LandingVisible,
  NotEaster,
}

export enum ViewChange {
  ScrollTo,
  Orientation,
  Viewport,
  Width,
  EasterActivation,
}

export enum StatePrecondition {
  OceanMotion, // !prefersReducedMotion
  NewArrival,
}

export enum StateChange {
  PreferenceChange,
  NavToPage,
  NavAwayFromPage,
}

export enum Precondition {
    // easter potential == animation potential
    /** We can animate, but could have restrictions */
  AnimationPotential = ViewPrecondition.OnPage & ViewPrecondition.IsInViewport & ViewPrecondition.IsVisible & ViewPrecondition.NotEaster,

    /** Let 'er rip */
  FullAnimationPotential = AnimationPotential & StatePrecondition.OceanMotion,

    /** Gotta hold back the good stuff */
  ReducedAnimation = AnimationPotential & ~StatePrecondition.OceanMotion,

    /** It's a low bar -- you meet it if you just got here */
  NewArrival = StatePrecondition.NewArrival,

    /** You're not new here */
  NotNewArrival = ~NewArrival,

}

export enum PermittedAction {

  CanPlayAll = Precondition.FullAnimationPotential & ViewPrecondition.LandingVisible & (AnimationType.Impact | AnimationType.Panning | AnimationType.Transition, AnimationType.ScrollTrigger, AnimationType.ScrollTo),

  CanPlayAllNotLanding = Precondition.FullAnimationPotential & ~ViewPrecondition.LandingVisible,

  CanPlayAllNotNewArrival = Precondition.FullAnimationPotential & Precondition.NotNewArrival,

  CanPlaySome = Precondition.ReducedAnimation & RestrictedAnimations.OnlyOnLanding & ViewPrecondition.LandingVisible & (RestrictedAnimations.SomeRestricted | RestrictedAnimations.Unrestricted),

  CanPlaySomeNotLanding = Precondition.ReducedAnimation & RestrictedAnimations.OnlyOnLanding & ~ViewPrecondition.LandingVisible & (RestrictedAnimations.SomeRestricted | RestrictedAnimations.Unrestricted),

  CanPreload = Precondition.NewArrival & ~ViewPrecondition.OnPage & (AnimationType.Impact | AnimationType.Transition),
}


export type AnimationStateUpdate = Action | RestartingAction | ResumingAction

export interface AnimationFlag {

}
