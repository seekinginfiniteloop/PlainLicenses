

import gsap, { clamp } from 'gsap'
import { BehaviorSubject, debounce, debounceTime, distinctUntilChanged, filter, map, min } from 'rxjs'

import { IMPACT_CONFIG, IMPACT_ELEMENT_CONFIG } from '~/config/config'
import * as effects from './impactEffects'
import { logger } from '~/utils/log'
import type { GsapMatchMediaConditions, ImpactLetter, ImpactTimeline, LetterAnimationConfig, ParticleConfig } from './types'
import { memoize } from '~/utils/cache'
import type { ImpactElementConfig } from '~/config/types'
import { HeroStore } from '../state/store'
import { getMatchMediaInstance, getRandomBorderRadius, getRandomStartColor } from './utils'
import { config } from 'process'

const store = HeroStore.getInstance()

// map viewport area from state and subscribe to changes
const viewportArea = (store.getStateValue('viewport')).map((viewport: Viewport) => viewport.size.width * viewport.size.height)

store.state$.pipe(
  filter(state => state.atHome),
  map(state => state.viewport.size),
  distinctUntilChanged(),
  debounceTime(150),
  map(size => size.width * size.height)
).subscribe(value => { viewportArea.next(value) })

const impactConfig = IMPACT_CONFIG

const elementConfigs = IMPACT_ELEMENT_CONFIG

const configMinParticles = impactConfig.minParticles
const configMaxParticles = impactConfig.maxParticles
let minParticles = configMinParticles
let maxParticles = configMaxParticles

// ================== Utility Functions ==================


const minViewportArea = 320 * 568 // iPhone SE resolution, below this we use the min value
const maxViewportArea = 1920 * 1080 // 1080p resolution, above this we use the max value
const scaledViewportArea = gsap.utils.mapRange(minViewportArea, maxViewportArea, impactConfig.minParticles, impactConfig.maxParticles)
const clampedParticleRange = gsap.utils.clamp(impactConfig.minParticles, impactConfig.maxParticles)
const clampedParticleCount = clampedParticleRange(scaledViewportArea(viewportArea.value))
const particleRange = clampedParticleCount <= configMinParticles ? [configMinParticles, configMinParticles + 3] : [configMinParticles, clampedParticleCount]
minParticles = particleRange[0]
maxParticles = particleRange[1]

const getRandomSize = gsap.utils.random(impactConfig.minParticleSize, impactConfig.maxParticleSize, 0.5, true)

const getSpacingTime = gsap.utils.random(0.5, impactConfig.letterTotalDuration, 0.1, true)

const getDebrisCount = memoize((minParticles?: number, maxParticles?: number) => {
  return gsap.utils.random(minParticles || impactConfig.minParticles, maxParticles || impactConfig.maxParticles, 1, true)
})
const getRandomDustDuration = gsap.utils.random(1.5, 4, 0.1, true)
const getRandomDustMultiplier = gsap.utils.random(1.3, 2.5, 0.1, true)
const randomizeHighValue = gsap.utils.random(0.7, 0.9, 0.05, true)
const randomizeLowValue = gsap.utils.random(0.08, 0.18, 0.01, true)

export class ImpactAnimation {
  private static instance: ImpactAnimation

  private particlePool: HTMLDivElement[] = []

  public timeline: gsap.core.Timeline = gsap.timeline({ paused: true, callbackScope: this })

  private particleCap: number

  private particleConfigs: ParticleConfig[] = []


  private constructor() {
    this.particleCap = this.estimateParticleCap()
    this.particleConfigs = this.getParticleConfigs(this.particleCap)
    this.timeline = this.animateText()

  }

  public static getInstance() {
    return this.instance ??= new ImpactAnimation()
  }

  /**
 * Generates a random particle configurations.
 * @returns
 */
  private createParticleConfig = (): ParticleConfig => ({
  backgroundColor: getRandomStartColor(),
  borderRadius: getRandomBorderRadius(),
  className: 'debris',
  display: 'none',
  height: `${getRandomSize()}px`,
  opacity: 1,
  pointerEvents: 'none',
  position: 'absolute',
  transform: 'none',
  width: `${getRandomSize()}px`,
  willChange: 'transform, position, opacity, color, filter, textShadow, translate, scale, rotate',
  zIndex: 2000,
})

/**
 * Generates a random array of particle configurations.
 * @param length The number of configurations to generate.
 * @returns An array of ParticleConfig objects.
 */
  private getParticleConfigs = (length: number): ParticleConfig[] => {
  return Array.from({ length }).map(() => this.createParticleConfig())
}

/**
 * Creates a div element with the specified character.
 * @param char The character to display.
 * @param index The index of the character.
 * @param isButton A boolean flag to determine if the character is part of a button.
 * @returns A div element.
 */
  private createCharDiv(char: string, index?: number, isButton: boolean = false): HTMLDivElement {
    const div = document.createElement('div')
    div.textContent = char
    div.classList.add(
      isButton ? 'button-char' : 'meteor',
      ...(index !== undefined ? [`meteor--${index}`] : [])
    )

    if (isButton) {
      div.classList.add('button-char')
    }

    return div
  }


/**
 * Converts text content of an element into individual divs.
 * @param el The element to convert.
 * @param button A boolean flag to determine if the text is a button.
 * @returns A document fragment containing the divs.
 */
  private wordsToDivs(el: HTMLElement, button: boolean = false): DocumentFragment {
    const text = el.innerText || ''
    const fragment = document.createDocumentFragment()

    requestAnimationFrame(() => {
    el.innerText = ""
  })

    if (button) {
      const buttonWords = text.split(' ').map(word => {
      const wordDiv = document.createElement('div')
      wordDiv.classList.add('button-text', 'button-word')

      word.split('').forEach(char => {
        wordDiv.appendChild(this.createCharDiv(char, undefined, true))
      })

      return wordDiv
    })

      Object.assign(el.style, {
      backgroundColor: 'var(--button-background-color)',
      opacity: '0',
      visibility: 'hidden',
    })

      fragment.append(...buttonWords)
    } else {
      text.split('').forEach((char, idx) => {
      if (char === ' ') {
        fragment.appendChild(document.createTextNode(' '))
      } else {
        const charDiv = this.createCharDiv(char, idx)
        Object.assign(charDiv.style, {
          color: 'inherit',
          visibility: 'hidden',
          opacity: '0'
        })
        fragment.appendChild(charDiv)
      }
    })
    }

    return fragment
  }

/**
 * We need to find the cap of active particles at one time.
 *
 * We don't need to be exact; it's better to keep the calculation simple/fast and
 * overestimate the cap to ensure we have enough particles. Otherwise, we'd be
 * doing double duty on heavy calculations and lose the benefit of pre-generation.
 *
 * Each letter is staggered over a duration, impactConfig.letterTotalDuration, and
 * travels at a speed of impactConfig.letterTravelSpeed. The debris particles travel
 * at impactConfig.debrisTravelSpeed. We can use these values to estimate the cap.
 * Actual debris travel time is based on the screen resolution. Large screens will have
 * particles active longer. We can just take 75% of the largest dimension as a rough
 * estimate of max travel distance.
 * @returns The estimated particle cap.
 */
  private estimateParticleCap() {
  // first we find the total duration of a letter impact, along with its debris duration
    const flightDuration = impactConfig.letterTotalDuration / impactConfig.letterTravelSpeed
    const debrisTravelTime = Math.max(viewport.offset.x, viewport.offset.y) * 0.75 / impactConfig.debrisTravelSpeed
    const particleFadeTime = Math.max(impactConfig.glowDuration, debrisTravelTime)
    const totalLetterDuration = Math.max(particleFadeTime, debrisTravelTime) + flightDuration
  // we now know the max time of a single letter impact, now we need to find overlap
  // the letters are minimally spaced 0.5s apart, so we can use that as a base
  // but we only care about debris overlap, which is at the end of the letter impact
    const staggerTime = 0.5 + flightDuration
  // we can now find the number of particle effects that can be active at once
    const maxEffects = Math.max(Math.ceil(totalLetterDuration / staggerTime), 1) // at least 1 effect
    return maxEffects * impactConfig.maxParticles + 16 // button can have up to 16 more particles
  }

  /**
  * Creates an impact animation for a target element.
  * @param config The configuration for the element.
  * @returns An ImpactTimeline object.
  */
  private createImpactAnimation(config: ImpactElementConfig): LetterAnimationConfig {
    const element = document.getElementById(config.id.slice(1)) as HTMLElement
    const fragment = this.wordsToDivs(element, !!config.isButton)
    const targets = Array.from(fragment.children)

    const debrisConfig = targets.map((target) =>
      this.createImpactLetterConfigs(
        target as HTMLElement,
        config.axis as 'x' | 'y',
        config.textType as 'h1' | 'p' | 'button',
        config.maxParticles
      )
    )

    return {
      impactLetters: config.isButton
        ? debrisConfig.map(letter => ({
            ...letter,
            buttonText: targets as HTMLDivElement[]
          }))
        : debrisConfig,
      parentFragment: fragment
    }
  }


    /**
   *  Creates a debris configuration for a target element.
   * @param target The target element.
   * @param axis The axis of the debris stagger.
   * @param textType The type of text element.
   * @param maxCount The maximum number of particles.
   * @returns An ImpactLetter object.
   */

  private getParticles(count: number): HTMLDivElement[] {
    try {
      return this.particlePool.splice(0, count)
    } catch {
      logger.error(`Error retrieving particles from pool`)
      return []
    }
  }

/**
 * Deferred function to retrieve particles from the pool.
 * @param count The number of particles to retrieve.
 * @returns A function to retrieve particles.
 */
  private retrieveParticles(count: number) { return this.getParticles(count) }

  private returnParticles(particles: HTMLDivElement[]) {
    Array.prototype.push.apply(this.particlePool, particles)
  }

  private createImpactLetterConfigs(target: HTMLElement, axis: 'x' | 'y', textType: 'h1' | 'p' | 'button', maxCount: number = maxParticles): ImpactLetter {
    const debrisCount = getDebrisCount(minParticles, maxCount)()
    const container = document.createElement('div') // empty container for debris
    const targetRect = target.getBoundingClientRect()
    const hazeSpan = document.createElement('span') // haze effect
    const dustDuration = getRandomDustDuration()
    const multiplier = getRandomDustMultiplier()
    container.classList.add('debris-container')

    // we'll use a from tween with yoyo, so this is the apex of the effect
    Object.assign(hazeSpan.style, {
      backgroundColor: 'var(--saffron)',
      borderRadius: '100%',
      filter: `blur(${2 * multiplier * multiplier}px) brightness(1.1) sepia(${randomizeLowValue()}) contrast(${randomizeHighValue()})`,
      height: '100%',
      left: '50%',
      mixBlendMode: 'screen',
      opacity: randomizeLowValue(),
      pointerEvents: textType === 'button' ? 'auto' : 'none',
      position: 'absolute',
      top: '50%',
      transform: `translate(-50%, -50%) scale(${multiplier})`,
      transformOrigin: 'center center',
      width: '100%',
      z: 100,
      zIndex: 300,
    })

    return {
      axis,
      debris: {
        container,
        // function for particle retrieval
        // execution deferred until needed
        retrieveParticles: this.retrieveParticles.bind(this, debrisCount),
        returnParticles: this.returnParticles.bind(this),
        letter: target
      },
      letter: target as HTMLElement,
      originRect: targetRect,
      textType,
      dustDuration,
      dustLayer: hazeSpan
    }
  }


 /**
 * Initializes the particle pool with reusable particles.
 * We pre-generate a pool of particles to avoid creating and destroying them
 * Reduce, reuse, recycle!
 * @returns An array of HTMLDivElement particles.
 */
  private initializeParticlePool() {
    const configs = this.particleConfigs
    configs.forEach((config) => {
    const particle = document.createElement('div')
    Object.assign(particle.style, {
      ...config
    })
    this.particlePool.push(particle)
   })
  }

  private updateOnComplete(store: HeroStore) {
    store.updateHeroState({newToHome: false})
  }

  private animationContext(context: gsap.Context) {
    const { lowMotion } = context.conditions as GsapMatchMediaConditions

    if (lowMotion) {
      logger.info(`User prefers reduced motion`)
      this.timeline.from(
        elementConfigs.map(config => config.id),
        {
          opacity: 0,
          duration: impactConfig.letterTotalDuration,
          stagger: 0.2,
          delay: 1,
          visibility: 'hidden',
          filter: 'hue-rotate(120deg)',
        },
        0
      )
    } else {
      logger.info(`User prefers normal motion`)

      elementConfigs.forEach((config, index) => {
        const impactConfig = this.createImpactAnimation(config)
        this.timeline.add(
          effects.constructImpactTimeline(
            impactConfig,
            `${config.textType}Impact`,
          ),
          index === 0 ? '1' : `-=${getSpacingTime.toString()}`
        )
      })
    }
  }

/**
 * Creates a timeline for the impact text animation.
 * @returns An ImpactTimeline object.
 */
  public animateText(): ImpactTimeline {
    if (this.particlePool.length === 0) {
      this.initializeParticlePool()
    }
    if (this.timeline.totalDuration() > 0) {
      return this.timeline as ImpactTimeline// already initialized
    }
    const mainTimeline = gsap.timeline({ paused: true, callbackScope: this, onComplete: this.updateOnComplete, onCompleteParams: [store] })
    this.timeline = mainTimeline
    getMatchMediaInstance(this.animationContext)
    return mainTimeline
  }

}
