import { HeroState } from './types'

export const isFullyVisible = (state: HeroState): boolean =>
  state.atHome && state.landingVisible && state.pageVisible

export const hasNoRestrictions = (state: HeroState): boolean =>
  !state.eggActive && !state.prefersReducedMotion

// Component-specific predicates
export const carouselPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive,

  shouldPause: (state: HeroState): boolean =>
    !isFullyVisible(state) || state.eggActive
}

export const impactPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) &&
    state.newToHome &&
    hasNoRestrictions(state),

  shouldStop: (state: HeroState): boolean =>
    !isFullyVisible(state) ||
    !state.newToHome ||
    state.eggActive ||
    state.prefersReducedMotion
}

export const panningPredicates = {
  canPan: (state: HeroState): boolean =>
    isFullyVisible(state) && hasNoRestrictions(state),

  shouldPause: (state: HeroState): boolean =>
    !isFullyVisible(state) ||
    state.eggActive ||
    state.prefersReducedMotion
}

export const scrollPredicates = {
  canScrollTo: (state: HeroState): boolean =>
    !state.prefersReducedMotion,

  canTrigger: (state: HeroState): boolean =>
    !state.eggActive && !state.prefersReducedMotion,

  useReducedTriggers: (state: HeroState): boolean =>
    !state.eggActive && state.prefersReducedMotion
}
