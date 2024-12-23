/**
 * @module ImpactEffects
 * @description Creates the (admittedly over-the-top) meteor-like
 * text impact animations for the Hero feature.
 *
 * @overview
 * Handles the creation of the impact animations for the Hero feature,
 * handling the animation of text elements as they "fall" into place,
 * and the subsequent debris particles that explode from the text.
 *
 ** Key Features:
 ** - Meteor-style text entry animations
 ** - Debris particle animations
 ** - Dynamic text intro for call-to-action button
 ** - Dynamic distribution and positioning of animation elements
 ** - Performance-optimized animation calculations
 *
 * @requires GSAP (GreenSock Animation Platform)
 * @requires RxJS for reactive state management
 * @requires Hero Store for viewport and header state
 *
 * @exports constructImpactTimeline: Primary timeline construction function
 * @exports getRandomStartColor: Utility for generating random start colors
 *
 * @see {@link https://greensock.com/docs/} GSAP Documentation
 */


import gsap from 'gsap'
import { distinctUntilChanged, map } from 'rxjs'

import { IMPACT_CONFIG } from '~/config'
import { DebrisAnimationConfig, ImpactLetter, ImpactTimeline, LetterAnimationConfig, MaxDistance, OriginDimensions, PageDimensions, Rect } from './types'

import { HeroStore } from '~/features/hero/state/store'
import { HeroState } from '../state/types'
import { memoize } from '~/utilities/cache'
import { logger } from '~/log'
import { pluckRandomFrom } from './utils'


const store = HeroStore.getInstance()

const config = IMPACT_CONFIG

const getRandomBaseRotation = gsap.utils.random(-360, 360, 45, true)
const getRandomRotation = gsap.utils.random(-1440, 1440, 45, true)
export const getRandomStartColor = gsap.utils.random(config.baseColors, true)
const extendedColors = gsap.utils.shuffle([...config.extendedColors])
const getRandomColorArray = (arrayLength: number) => {
  return arrayLength >= extendedColors.length ? extendedColors : extendedColors.slice(0, arrayLength)
}

/**
 * Batch DOM operations to run on the next animation frame.
 * @param operations - The operations to batch.
 */
const batchDOMOperations = (operations: (() => void)[]) => {
    requestAnimationFrame(() => {
        operations.forEach((operation) => operation())
    })
}

let pageDimensions: PageDimensions = {
  width: store.state$.value.viewport.size.width,
  height: store.state$.value.viewport.size.height,
  headerHeight: store.state$.value.header.height,
  adjustedHeight: store.state$.value.viewport.size.height - store.state$.value.header.height
}

/**
 * Calculates the squared distance between two points.
 */
const getSquaredDistance = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1
  const dy = y2 - y1
  return dx * dx + dy * dy
}

/**
 * Calculates the distance between two points.
 */
const getDistance = memoize((x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt(getSquaredDistance(x1, y1, x2, y2))
)

/**
 * Calculates the maximum possible distance from a point considering header adjustment.
 * @param dimensions - The origin dimensions object.
 */
const getMaxDistance = memoize((dimensions: OriginDimensions): MaxDistance => {
    const { originArea, pageDimensions } = dimensions
    const { left, top, right, bottom } = originArea
    const { width: windowWidth, height: windowHeight, headerHeight } = pageDimensions
    return {
      maxDistanceX: Math.max(right, windowWidth - left),
      maxDistanceY: Math.max(bottom, windowHeight - top - headerHeight),
    }
})

/**
 * Calculates the origin dimensions for debris particles.
 * @param rect - The origin rect.
 * @param page - The page dimensions.
 */
const getOriginDimensions = memoize((rect: Rect, page: PageDimensions = pageDimensions): OriginDimensions => {
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const radius = config.debrisOriginRadius
    return {
      centerX,
      centerY,
      originArea: {
        x: rect.left - (rect.width * radius),
        y: rect.top - (rect.height * radius),
        width: rect.width + (rect.width * radius * 2),
        height: rect.height + (rect.height * radius * 2),
        top: rect.top - (rect.height * radius),
        right: rect.right + (rect.width * radius),
        bottom: rect.bottom + (rect.height * radius),
        left: rect.left - (rect.width * radius)
      },
      pageDimensions: page,
    }
    }
)

// Subscribe to viewport changes
store.state$.pipe(map((state: HeroState) => {
    return {
      height: state.viewport.size.height,
      width: state.viewport.size.width,
      headerHeight: state.header.height,
      adjustedHeight: state.viewport.size.height - state.header.height
    }
}),
distinctUntilChanged((prev: PageDimensions, curr: PageDimensions) => {
        return prev.height === curr.height && prev.width === curr.width && prev.headerHeight === curr.headerHeight
    }
)).subscribe({
    next: (value) => {
        pageDimensions = value
    },
  error: (error) => {
    logger.error(`Error in viewport subscription: ${error}`)
  }
})


/**
 * Precomputes distribution functions for debris and target particles.
 * @param origin - The origin dimensions.
 * @returns The distribution functions.
 */
const createDistributionFunctions = (origin: OriginDimensions) => {
  const { maxDistanceX, maxDistanceY } = getMaxDistance(origin)
  const originDistributionX = gsap.utils.distribute({
    base: origin.centerX,
    amount: origin.originArea.width / 2,
    from: "center",
    grid: "auto",
    axis: "x",
    ease: "power4.out",
  })

  const originDistributionY = gsap.utils.distribute({
    base: origin.centerY,
    amount: origin.originArea.height / 2,
    from: "center",
    grid: "auto",
    axis: "y",
    ease: "power4.out",
  })

  const destDistributionX = gsap.utils.distribute({
      base: origin.pageDimensions.width / 2,
      amount: gsap.utils.clamp(origin.originArea.width / origin.originArea.height, origin.pageDimensions.width / 2, maxDistanceX),
      from: "edges",
      grid: "auto",
      axis: "x",
      ease: "power4.out",
  })

    const destDistributionY = gsap.utils.distribute({
        base: origin.pageDimensions.height / 2,
        amount: gsap.utils.clamp(origin.originArea.height / origin.originArea.width, origin.pageDimensions.height / 2, maxDistanceY),
        from: "edges",
        grid: "auto",
        axis: "y",
        ease: "power4.out",
    })

  return { originDistributionX, originDistributionY, destDistributionX, destDistributionY }
}

/** ========================================================================
 **                     DEBRIS ANIMATION EFFECT
 *========================================================================**/
gsap.registerEffect({
  name: "debrisAnimation",
  paused: true,
  extendTimeline: true,
  effect: (effectConfig: DebrisAnimationConfig) => {
    const { debris, originRect } = effectConfig.impactLetter
    const { container, particles, letter } = debris
    const { originDistributionX, originDistributionY, destDistributionX, destDistributionY } = createDistributionFunctions(getOriginDimensions(originRect))
    const debrisTimeline = gsap.timeline({
        name: "debrisTimeline",
      paused: true,
      onStart: () => {
        batchDOMOperations([() => {
          particles.forEach((particle: HTMLDivElement) => {
            particle.style.display = 'block'
            particle.style.opacity = '1'
            particle.style.willChange = 'transform, position, opacity, color, filter, textShadow, translate, scale, rotate'
          })
          letter.appendChild(container)
        }])
        },
        // cleanup the container after the animation completes
        onComplete: () => {
            requestAnimationFrame(() => {
              container.remove()
            })
        }
    })
      const { maxDistanceX, maxDistanceY } = getMaxDistance(getOriginDimensions(originRect))
      const maxDistance = Math.max(maxDistanceX, maxDistanceY)

    // iterate over each particle and add animations
    particles.forEach((particle: HTMLDivElement, idx: number) => {
    const originX = originDistributionX(idx, particle, particles)
    const originY = originDistributionY(idx, particle, particles)
    const destX = destDistributionX(idx, particle, particles)
    const destY = destDistributionY(idx, particle, particles)
    const distance = getDistance(originX, originY, destX, destY)
    const particleSize = { width: particle.offsetWidth, height: particle.offsetHeight }

    // calculate the unit size for the flame effect; proportional to the particle size
    const calculateBaseFlameUnit = memoize((particleSize: { width: number, height: number }) => {
    const bFU = ((particleSize.width + particleSize.height) / 2) / 10
    return (multiplier: number) => `${bFU * multiplier}`
    })
    const bFUs = calculateBaseFlameUnit(particleSize)
    const travelDuration = distance / config.debrisTravelSpeed
    const glowPulses = gsap.utils.snap((distance / maxDistance) * config.glowPulsations, 1)

    // quick burn effect on creation
    debrisTimeline.add([`initialBurn_${idx}`, gsap.to(particle, {
    yoyo: true,
    duration: 0.02,
    ease: 'power4.out',
    keyframes: {
      "0%": {
        filter: 'brightness(1) blur(1px)',
        boxShadow: `- ${bFUs(1)}px 0 ${bFUs(2)}px #fefcc9, ${bFUs(1)}px - ${bFUs(1)}px ${bFUs(3)}px #feec85, -${bFUs(2)}px - ${bFUs(2)}px ${bFUs(4)}px #ffae34, ${bFUs(3)}px -${bFUs(3)}px ${bFUs(3)}px #ec760c, -${bFUs(4)}px -${bFUs(4)}px ${bFUs(4)}px #cd4606, ${bFUs(1)}px -${bFUs(5)}px ${bFUs(7)}px #973716, ${bFUs(1)}px -${bFUs(7)}px ${bFUs(7)}px #451b0e`
      },
      "40%": {
        filter: 'brightness(4) blur(2px)',
        boxShadow: `-${bFUs(1)}px -${bFUs(2)}px ${bFUs(6)}px #fefcc9, -${bFUs(15)}px 0 ${bFUs(6)}px #feec85, ${bFUs(1)}px -${bFUs(25)}px ${bFUs(6)}px #ffae34, -${bFUs(15)}px -${bFUs(45)}px ${bFUs(5)}px #ec760c, ${bFUs(1)}px -${bFUs(5)}px ${bFUs(6)}px #cd4606, 0 -${bFUs(8)}px ${bFUs(6)}px #973716, -${bFUs(2)}px -${bFUs(100)}px ${bFUs(8)}px #451b0e`,
        ease: 'power4.out',
      },
      "100%": {
        filter: 'brightness(1) blur(0)',
        boxShadow: 'none',
        ease: 'power4.in',
      },
    }
    })], 0)
      // particle flight animation
      .add([`particleFlight_${idx}`, gsap.fromTo(
        particle,
        {
          x: originX,
          y: originY,
          opacity: 1,
          rotation: getRandomBaseRotation(),
          backgroundColor: getRandomStartColor(),
        },
        {
          x: destX,
          y: destY,
          rotation: `+=${getRandomRotation()}`,
          backgroundColor: 'var(--emerald)',
          duration: travelDuration,
          ease: 'power4.out',
        })],
      0)
        // simulate a particle flying up and down
          .add([`scaleUpAndDown_${idx}`, gsap.to(particle, {
              keyframes: {
                "0%": {
                  scale: 0.5,
                },
                "30%": {
                  scale: 1.5,
                  ease: 'power4.out',
                },
                "80%": {
                  scale: 1,
                  ease: 'power4.in',
                },
                "100%": {
                  scale: 0.5,
                  ease: 'power4.in',
                },
              },
                duration: travelDuration,
          })], 0)
        // particle glow effect, quick flare on creation
      .add([`particleGlowInitial_${idx}`,
        gsap.fromTo(particle, {
        filter: `brightness(${config.glowIntensity * 4}) blur(2px)`,
      }, {
        filter: 'brightness(1) blur(1px)',
        duration: 0.05,
        ease: 'power4.out',
        })], 0)

      // particle glow pulsations
      .add([`particleGlowPulse_${idx}`,
        gsap.to(particle, {
        filter: `brightness(${config.glowIntensity}) blur(1px)`,
        duration: config.glowDuration,
        yoyo: true,
        repeat: glowPulses,
        ease: 'sine.inOut',
      })
      ], `>particleGlowInitial_${idx}`)

    // fade out the particle at the end of its flight if it hasn't already
    .add([`particleFade_${idx}`,
      gsap.to(particle, {
        opacity: 0,
        duration: gsap.utils.clamp(Math.min(config.glowDuration, travelDuration), Math.max(config.glowDuration, travelDuration) + 0.6, 0.5),
        ease: 'power4.out',
      })
    ], 0)
    })
    return debrisTimeline
    },
})

/** ========================================================================
 **                    METEOR TARGET ANIMATION EFFECT
 *========================================================================**/

/**
 * Precomputes distribution functions for "meteor" target start points.
 * @returns The distribution functions.
 */
const precomputeDistributions = () => {
    const { width } = pageDimensions
  return {
    xOriginDistribution: gsap.utils.distribute({
        base: 0,
        amount: width / 2,
        from: "start",
        grid: "auto",
        ease: "power2.in",
        axis: "x",
      }),
    stagger: gsap.utils.distribute({
        base: 0.1,
        amount: 1.5,
        from: "start",
        ease: "power1.out",
      })
  }
}

// Register the meteor target animation effect
gsap.registerEffect({
    name: "meteortargetAnimation",
    defaults: { paused: true },
    extendTimeline: true,
    paused: true,
    effect: (configs: LetterAnimationConfig) => {
        const targetsTimeline = gsap.timeline({
            name: "meteorTimeline",
            paused: true,
            // make sure the letters are visible and reset
          onStart: () => {
            const { impactLetters, parentFragment } = configs
            batchDOMOperations([() => {

                const parentElement = configs[0].textType === 'button' ? document.getElementById('hero-primary-button') : (configs[0].textType === 'h1' ? document.getElementById('CTA_header') : document.getElementById('CTA_paragraph'))
              // insert letters into the DOM
              if (configs[0].textType === 'button') {
                Array.from(parentFragment.children).forEach((child) => {
                  (child as HTMLElement).style.visibility = 'hidden'
                })
              }
                parentElement?.appendChild(parentFragment)
               },
            () => {
              impactLetters.map((cfg: ImpactLetter) => {
                if (cfg.textType !== 'button') {
                  gsap.set(cfg.letter, {
                    visibility: 'visible',
                    opacity: 1,
                    color: cfg.textType === 'h1' ? 'var(--h1-color)' : 'var(--p-color)',
                    filter: 'brightness(1) blur(0)',
                    textShadow: 'none',
                  })
                } else {
                  // for button, this is the actual button element
                  gsap.set(cfg.letter, {
                    visibility: 'hidden',
                    opacity: 0,
                    color: 'var(--button-text-color)',
                    filter: 'brightness(1) blur(0)',
                    textShadow: 'none',
                  })
                }
                    })
                }])
          }
        })
        const targets = Array.from(configs.impactLetters.map((config) => config.letter))

        // iterate over each letter and add animations
        // !NOTE: we're really iterating over `ImpactLetter` config objects, not letters
      // This way we can add the debris timeline to the config object
      // without nesting gsap effects, which apparently results in
      // pan-dimensional collapse of the universe
        configs.forEach((cfg: ImpactLetter, idx: number) => {
            const { letter, originRect, debrisTimeline, axis, textType } = cfg
            const { xOriginDistribution, stagger } = precomputeDistributions()
            const distribution = xOriginDistribution
            const start = axis === 'x' ? [distribution(idx, letter, targets), 0] : [0, pageDimensions.height - distribution(idx, letter, targets)]
            const startTime = stagger(idx, letter, targets)
            const distance = getDistance(start[0], start[1], originRect.left + originRect.width / 2, originRect.top + originRect.height / 2)
            const flightDuration = distance / config.letterTravelSpeed
            // point in flight where atmospheric flame effect starts
            const flameStart = flightDuration * 0.4
            const flameDuration = flightDuration * 0.35
            targetsTimeline.add([`targetFlight_${idx}`, gsap.from(
              letter,
                {
                    x: start[0],
                    y: start[1],
                    opacity: 1,
                    scale: 2,
                    rotationX: getRandomRotation(),
                    rotationY: getRandomRotation(),
                    rotationZ: getRandomRotation(),
                    z: gsap.utils.random(300, 600, 1),
                    duration: flightDuration,
                    ease: 'power4.out',
                }
            )], startTime)
            // atmospheric glow effect
                .add([`targetAtmosphericGlow_${idx}`, gsap.to(letter, {
                    duration: flameDuration,
                    keyframes: {
                      "0%": {
                        filter: 'brightness(2) blur(2px)',
                        textShadow: '-.1em 0 .3em #fefcc9, .1em -.1em .3em #feec85, -.2em -.2em .4em #ffae34, .2em -.3em .3em #ec760c, -.2em -.4em .4em #cd4606, .1em -.5em .7em #973716, .1em -.7em .7em #451b0e',
                        ease: 'power4.out',
                      },
                      "40%": {
                        filter: 'brightness(6) blur(5px)',
                        textShadow: '-.1em -.2em .6em #fefcc9, -.15em 0 .6em #feec85, .1em -.25em .6em #ffae34, -.15em -.45em .5em #ec760c, .1em -.5em .6em #cd4606, 0 -.8em .6em #973716, -.2em -1em .8em #451b0e',
                        ease: 'power4.out',
                      },
                      "100%": {
                        filter: 'brightness(1) blur(0)',
                        textShadow: 'none',
                        ease: 'power4.in',
                        color: textType === 'h1' ? 'var(--h1-color)' : 'var(--p-color)',
                      }
                    }
                })], `targetFlight_${idx}+=${flameStart}`)
            if (debrisTimeline) {
              targetsTimeline.add(debrisTimeline, `>targetFlight_${idx}`)
            }
        }) // end forEach
        return targetsTimeline
    }
})

/** ========================================================================
 **                 BUTTON TEXT ANIMATION EFFECT
 *========================================================================**/

gsap.registerEffect({
  name: "buttonTextAnimation",
  defaults: { paused: true },
  extendTimeline: true,
  paused: true,
  effect: (letterConfig: ImpactLetter) => {
    const { buttonText, letter } = letterConfig
    const wordArray = buttonText as HTMLDivElement[]
    const charArray = wordArray.map((word) => { return Array.from(word.querySelectorAll('.text-char')) }).flat() as HTMLDivElement[]
    // !NOTE: `letter` is actually the button element here
    const colorArray = getRandomColorArray(charArray.length)
    const buttonTimeline = gsap.timeline({
      name: "buttonTextTimeline",
      paused: true,
      onStart: () => {
        batchDOMOperations([() => {
          wordArray?.forEach((word: HTMLDivElement) => {
            Object.assign(word.style, {
              filter: 'brightness(1) blur(0)',
              textShadow: 'none',
              z: 0.1,
              fontFamily: "Inter, 'Noto Sans', 'Open Sans', Lato, Helvetica, Arial, system-ui, sans-serif",
            })
            letter.appendChild(word)
          })
        },
        () => {
            charArray.forEach((char: HTMLDivElement) => {
              gsap.set(char, {
                color: pluckRandomFrom({ eligible: colorArray }),
              })
             })
        }
        ])
      }
    })
    buttonTimeline.add(['initialSetup', gsap.set(wordArray, { visibility: 'visible', opacity: 1 })])
      .add(['buttonTextZoomIntro', gsap.from(wordArray, {
        scale: 4,
        z: 1000,
        x: "-10%",
        y: "-20%",
        textShadow: '0 0 1em #fff, 0 0 2em #fff, 0 0 4em #fff, 0 0 8em #ff00ff, 0 0 0.1em #ff00ff, 0 0 0.1em #ff00ff, 0 0 0.1em #ff00ff',
        filter: 'brightness(3) blur(1px) hue-rotate(135deg)',
        duration: 3,
        fontFamily: "Bangers, Impact, Haettenschweiler, Charcoal, 'Arial Narrow Bold', Gadget, sans-serif",
        ease: 'power4.inOut',
        repeat: 0,
        stagger: {
          amount: 0.5,
          from: 'start',
          axis: 'x',
          ease: 'power3.in',
        },
      })])
      // flash effect
      .add(['buttonTextStyleFlash', gsap.to(wordArray, {
        stagger: {
          amount: 0.1,
          from: 'start',
          axis: 'x',
        },
        ease: 'power1.inOut',
        color: 'var(--atomic-tangerine)',
        filter: 'brightness(3) blur(0)',
        textShadow: '0.1em 0.1em 0.3em #fff, 0.3em 0.3em 0.5em var(--ecru)',
        duration: 0.5,
        yoyo: true,
        repeat: 1, // revert to original color with yoyo
      })], '>=buttonTextZoomIntro')
      // revert to original color
      .add(['buttonTextRevertColor', gsap.to(wordArray, {
        stagger: {
          amount: 0.05,
          from: 'start',
          axis: 'x',
        },
        ease: 'power1.inOut',
        color: 'var(--button-text-color)',
        filter: 'brightness(1) blur(0)',
        cursor: 'pointer',
        textShadow: 'none',
        duration: 0.3,
        repeat: 0,
      })], '>=buttonTextStyleFlash')
    // left to right rainbow shimmer effect
      .add(['buttonTextRainbowShimmer', gsap.from(charArray, {
        stagger: {
          amount: 0.05,
          from: 'start',
          axis: 'x',
        },
        modifiers: {
          color: (index) => {
            return gsap.utils.shuffle(colorArray)[index]
          }
        },
        ease: 'power1.inOut',

        filter: 'brightness(2) blur(0)',
        yoyo: true,
        textShadow: 'none',
        duration: 0.5,
        repeat: 1,
      })], '>=buttonTextStyleFlash')
      .add(["leftToRightUnderline", gsap.to(wordArray, {
        stagger: {
          amount: 0.05,
          from: 'start',
          axis: 'x',
          ease: 'power1.out'
        },
        duration: 1,
        yoyo: true,
        repeat: 1,
        scaleX: 1,
        borderBottom: '3px solid var(--turkey-red)',
        ease: 'power4.inOut',
      }), '>=buttonTextRainbowShimmer'])
      .add(["finalSetup", gsap.set(wordArray, {
        borderBottom: 'none',
        color: 'var(--button-text-color)',
        cursor: 'pointer',
        filter: 'brightness(1) blur(0)',
        textShadow: 'none',
        fontFamily: "Inter, 'Noto Sans', 'Open Sans', Lato, Helvetica, Arial, system-ui, sans-serif",
        willChange: 'auto',
      })], '>=leftToRightUnderline')
      .add([gsap.to(letter, {
        willChange: 'auto',
      })], '>=finalSetup')

    // revert to original color
    return buttonTimeline
  } // end effect
})

/**
 * Main constructor for an impact timeline.
 * @param letterConfig - The letter animation configuration.
 * @param label - The label for the timeline.
 * @returns The impact timeline.
 */
export const constructImpactTimeline = (letterConfig: LetterAnimationConfig, label?: string): ImpactTimeline => {
    const { impactLetters } = letterConfig
    const isButton = impactLetters[0].textType === 'button'
    const impactTimeline = gsap.timeline({ name: label || `impactTimeline_${impactLetters[0].textType}`, paused: true })
  impactTimeline.impactConfigs = { ...impactLetters, parentFragment: letterConfig.parentFragment }
    impactTimeline.impactConfigs.map((cfg: ImpactLetter, _idx: number) => {
        const debrisTimeline = gsap.effects.debrisAnimation({ impactLetter: cfg })
        cfg.debrisTimeline = debrisTimeline
        return cfg
    })
    impactLetters.map((cfg: ImpactLetter, idx: number) => {
        cfg.debrisTimeline = impactTimeline.impactConfigs[idx].debrisTimeline
    })
  const meteorTargetAnimation = gsap.timeline({ name: "meteortargetAnimation", paused: true }).add(gsap.effects.meteortargetAnimation(letterConfig), 0)

  impactTimeline.add(meteorTargetAnimation, 0)
  impactTimeline.meteorTargetAnimation = meteorTargetAnimation
  if (isButton) {
    const buttonTextAnimation = gsap.effects.buttonTextAnimation(impactLetters[0])
    impactTimeline.add(buttonTextAnimation, `>=${meteorTargetAnimation}`)
    impactTimeline.buttonTimeline = buttonTextAnimation
  }
    return impactTimeline as ImpactTimeline
 }
