import { time } from 'console'
import gsap, { clamp } from 'gsap'
import { text } from 'stream/consumers'
import { IMPACT_CONFIG } from '~/config'
import { logger } from '~/log'

const config = IMPACT_CONFIG

// ================== Randomizer Functions ==================
const getRandomSize = gsap.utils.random(config.minParticleSize, config.maxParticleSize, 0.5, true)
const getRandomRadii = gsap.utils.random(25, 95, 5, true)
const getRandomBorderRadius = () => `${getRandomRadii()}% ${getRandomRadii()}% ${getRandomRadii()}% ${getRandomRadii()}%`
const getRandomBaseRotation = gsap.utils.random(-360, 360, 45, true)
const getRandomRotation = gsap.utils.random(-1440, 1440, 45, true)
const baseColors = ['var(--atomic-tangerine)', 'var(--turkey-red)', 'var(--saffron)', 'var(--mindaro)', 'var(--burgundy)']
const extendedColors = [
  ...baseColors,
  'var(--mauve)',
  'var(--ecru)',
  'var(--emerald)',
  'var(--cherry-blossom-pink)',
  'var(--shamrock-green)',
  'var(--aqua)',
  'var(--aquamarine)',
  'var(--castleton-green)',
  'var(--blue-blue)',
]
const randomColorArray = () => gsap.utils.shuffle(extendedColors).slice(0, baseColors.length)
const getRandomStartColor = gsap.utils.random(baseColors, true)

// ================== Registered Effects ==================

const headerAdjust = 100

// Debris Animation Effect
gsap.registerEffect({
  name: "debrisAnimation",
  defaults: { extendTimeline: true, autoRemoveChildren: true, paused: true },
  effect: (targets: HTMLDivElement[], originRect: DOMRect, headerAdjust = 100) => {
    const maxDistance = getMaxDistance(originRect, headerAdjust)
    const midWidth = originRect.width / 2
    const midHeight = originRect.height / 2
    const midInnerWidth = window.innerWidth / 2
    const midInnerHeight = (window.innerHeight / 2) - headerAdjust
    const centerX = originRect.left + midWidth
    const centerY = originRect.top + midHeight
    const debrisTimeline = gsap.timeline()

    const originDistributionX = gsap.utils.distribute({
      base: centerX,
      amount: midWidth + (1 * config.debrisOriginRatio),
      from: "center",
      grid: "auto",
      axis: "x",
      ease: "power4.out",
    })

    const originDistributionY = gsap.utils.distribute({
      base: centerY,
      amount: midHeight + (1 * config.debrisOriginRatio),
      from: "center",
      grid: "auto",
      axis: "y",
      ease: "power4.out",
    })

    const destDistributionX = gsap.utils.distribute({
      base: midInnerWidth,
      amount: clamp(midInnerWidth / originRect.width, midInnerWidth, maxDistance),
      from: "random",
      grid: "auto",
      axis: "x",
      ease: "power4.out",
    })

    const destDistributionY = gsap.utils.distribute({
      base: midInnerHeight,
      amount: clamp(midHeight, midInnerHeight, maxDistance),
      from: "random",
      grid: "auto",
      axis: "y",
      ease: "power4.out",
    })

    targets.forEach((particle, idx) => {
      const originX = originDistributionX(idx, particle, targets)
      const originY = originDistributionY(idx, particle, targets)
      const destX = destDistributionX(idx, particle, targets)
      const destY = destDistributionY(idx, particle, targets)
      const distance = getDistance(originX, originY, destX, destY)
      const travelDuration = distance / config.debrisTravelSpeed
      const glowPulses = gsap.utils.snap((distance / maxDistance) * config.glowPulsations, 1)
      debrisTimeline.add([`particleFlight_${idx}`, gsap.fromTo(
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
      debrisTimeline.add([`particleGlowInitial_${idx}`,
      gsap.fromTo(particle, {
        filter: 'brightness(${config.glowIntensity * 4}) blur(2px)',
      }, {
        filter: 'brightness(1) blur(1px)',
        duration: 0.05,
        ease: 'power4.out',
      })], 0)
      debrisTimeline.add([`particleGlowPulse_${idx}`,
      gsap.to(particle, {
        filter: `brightness(${config.glowIntensity}) blur(1px)`,
        duration: config.glowDuration,
        yoyo: true,
        repeat: glowPulses,
        ease: 'sine.inOut',
      })
      ], `>particleGlowInitial_${idx}`)
      debrisTimeline.add([`particleFade_${idx}`,
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

gsap.registerEffect({
  name: "meteorLetterAnimation",
  defaults: { extendTimeline: true, autoRemoveChildren: true, paused: true },
  effect: (letters: HTMLDivElement[]) => {
    const sliceIndex = Math.round(letters.length / 2)
    const batchOne = letters.slice(0, sliceIndex)
    const batchTwo = letters.slice(sliceIndex)
    const lettersTimeline = gsap.timeline()
    const firstOriginDistribution = gsap.utils.distribute({
      base: window.innerHeight * 0.75,
      amount: window.innerHeight * 0.25,
      from: "start",
      grid: "auto",
      ease: "power2.out",
      axis: "y",
    })
    const secondOriginDistribution = gsap.utils.distribute({
      base: window.innerWidth,
      amount: window.innerWidth / 2,
      from: "start",
      grid: "auto",
      ease: "power2.in",
      axis: "x",
    })
    const constructBatch = (batch: HTMLDivElement[], distribution: gsap.FunctionBasedValue<number>, axis: 'x' | 'y', textType: "h1" | "p") => {
      const timeline = gsap.timeline()
      const stagger = gsap.utils.distribute({
        base: 0.1,
        amount: 1.5,
        from: "start",
        ease: "power1.out",
      })
      batch.forEach((letter, idx) => {
        const start = axis === 'x' ? [distribution(idx, letter, batch), 0] : [0, distribution(idx, letter, batch)]
        const startTime = stagger(idx, letter, batch)
        const endColor = textType === "h1" ? 'var(--h1-color)' : 'var(--p-color)'
        const destRect = letter.getBoundingClientRect()
        const distance = getDistance(start[0], start[1], destRect.left + destRect.width / 2, destRect.top + destRect.height / 2)
        const flightDuration = distance / config.letterTravelSpeed
        const flameStart = flightDuration * 0.4
        const flameDuration = flightDuration * 0.35
        lettersTimeline.add([`letterFlight_${idx}`, gsap.from(
          letter,
          {
          x: start[0],
          y: start[1],
          opacity: 1,
          rotationX: getRandomRotation(),
          rotationY: getRandomRotation(),
          rotationZ: getRandomRotation(),
          z: gsap.utils.random(300, 600, 1),
          duration: flightDuration,
          ease: 'power4.out',
          onStart: () => {
            gsap.set(letter, {
            visibility: 'visible',
            opacity: 1,
            backgroundColor: endColor,
            })
          }
          }
        )], startTime)
          .add([`letterAtmosphericGlow_${idx}`, gsap.to(letter, {
          autoRemoveChildren: false,
          duration: flameDuration / 2,
          yoyo: true,
          repeat: 1,
          keyframes: {
            "0%": {
            filter: 'brightness(2) blur(2px)',
            textShadow: '-.1em 0 .3em #fefcc9, .1em -.1em .3em #feec85, -.2em -.2em .4em #ffae34, .2em -.3em .3em #ec760c, -.2em -.4em .4em #cd4606, .1em -.5em .7em #973716, .1em -.7em .7em #451b0e'
            },
            "60%": {
            filter: 'brightness(3) blur(3px)',
            textShadow: '.1em -.2em .5em #fefcc9, .15em 0 .4em #feec85, -.1em -.25em .5em #ffae34, .15em -.45em .5em #ec760c, -.1em -.5em .6em #cd4606, 0 -.8em .6em #973716, .2em -1em .8em #451b0e'
            },
            "80%": {
            filter: 'brightness(5) blur(4px)',
            textShadow: '-.1em 0 .3em #fefcc9, .1em -.1em .3em #feec85, -.2em -.2em .6em #ffae34, .2em -.3em .4em #ec760c, -.2em -.4em .7em #cd4606, .1em -.5em .7em #973716, .1em -.7em .9em #451b0e'
            },
            "100%": {
            filter: 'brightness(6) blur(5px)',
            textShadow: '-.1em -.2em .6em #fefcc9, -.15em 0 .6em #feec85, .1em -.25em .6em #ffae34, -.15em -.45em .5em #ec760c, .1em -.5em .6em #cd4606, 0 -.8em .6em #973716, -.2em -1em .8em #451b0e'
            }
          }
          })], `letterFlight_${idx}+=${flameStart}`)
          .add([`revertLetterColor_${idx}`, gsap.to(letter, {
          duration: 0.5, backgroundColor: endColor, ease: 'power2.inOut'
          })], `>letterFlight_${idx}`)
      })
      time
    }

  }
})




  // Letter Animation Effect
  gsap.registerEffect({
    name: "letterAnimation",
    effect: (letters: HTMLElement[]) => {
      const lettersTimeline = gsap.timeline()

      const distributeStagger = gsap.utils.distribute({
        amount: 0.5,
        from: "start",
        grid: "auto",
        ease: "power1.out",
      })

      lettersTimeline.from(letters, {
        opacity: 0,
        scale: gsap.utils.random(1.5, 2, 0.1),
        y: () => gsap.utils.random(0, window.innerHeight * 0.75),
        x: () => gsap.utils.random(-window.innerWidth, window.innerWidth),
        rotationX: gsap.utils.random(-720, 720),
        rotationY: gsap.utils.random(-360, 360),
        rotationZ: gsap.utils.random(-720, 720),
        z: gsap.utils.random(300, 600, 1),
        visibility: 'hidden',
        duration: 1,
        ease: 'power4.out',
        stagger: distributeStagger,
        onStart: (el: HTMLElement) => {
          gsap.set(el, { visibility: 'visible', opacity: 1 })
          gsap.to(el, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
        },
      })
    )
      lettersTimeline.to(letters, {
        color: 'var(--atomic-tangerine)',
        filter: `brightness(${gsap.utils.random(2, 4, 0.1)}) blur(2px) drop-shadow(0 0 ${gsap.utils.random(1, 4, 0.1)}px var(--mindaro))`,
        duration: 0.1,
        ease: 'power4.out',
        stagger: 0.1,
        onComplete: (el: HTMLElement) => {
          gsap.to(el, {
            color: 'var(--emerald)',
            duration: 0.3,
          })
        },
      }, "-=0.5")

      lettersTimeline.to(letters, {
        scale: 1.05,
        filter: 'brightness(1.5)',
        duration: 0.3,
        repeat: 3,
        yoyo: true,
        ease: 'sine.inOut',
      }, "-=0.5")

      lettersTimeline.to(letters, {
        filter: 'blur(4px) brightness(1.8)',
        duration: 0.5,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1,
        onComplete: (el: HTMLElement) => {
          gsap.to(el, {
            color: 'inherit',
            filter: 'none',
            scale: 1,
            duration: 1.5,
            ease: 'power2.out',
          })
        },
      }, "-=0.5")

      return lettersTimeline
    },
    defaults: {},
    extendTimeline: true,
  })
})
// ================== Utility Functions ==================

/**
 * Calculates the distance between two points.
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculates the maximum possible distance from a point considering header adjustment.
 */
function getMaxDistance(originRect: DOMRect, headerAdjust: number): number {
  const hypot = (a: number, b: number) => Math.sqrt(a * a + b * b)
  const { left, top, right, bottom } = originRect
  return Math.max(
    hypot(left, top - headerAdjust),
    hypot(window.innerWidth - right, top - headerAdjust),
    hypot(left, window.innerHeight - bottom),
    hypot(window.innerWidth - right, window.innerHeight - bottom)
  )
}

/**
 * Converts text content of an element into individual spans.
 */
function wordsToSpans(el: HTMLElement, button: boolean = false): void {
  const text = el.textContent || ''
  el.innerHTML = ''

  text.split('').forEach((char, idx) => {
    if (char === ' ') {
      el.appendChild(document.createTextNode(' '))
      return
    }

    const div = document.createElement('div')
    div.textContent = char
    div.classList.add(button ? 'button-text' : 'meteor', `meteor--${idx}`)

    if (button) {
      div.style.display = 'inline-block'
      div.style.color = 'var(--turkey-red)'
      div.style.opacity = '0'
      div.style.visibility = 'hidden'
    }

    el.appendChild(div)
  })
}

// ================== Debris Creation ==================

/**
 * Creates debris particles within a target element.
 */
function createDebris(target: HTMLElement, maxCount: number = config.maxParticles): HTMLDivElement[] {
  const debris: HTMLDivElement[] = []
  const debrisCount = gsap.utils.random(config.minParticles, maxCount, 1, true)()
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.pointerEvents = 'none'
  target.appendChild(container)

  for (let i = 0; i < debrisCount; i++) {
    const particle = document.createElement('div')
    particle.className = `debris debris-${i}`
    particle.style.position = 'absolute'
    particle.style.width = `${getRandomSize()}px`
    particle.style.height = `${getRandomSize()}px`
    particle.style.backgroundColor = getRandomStartColor()
    particle.style.borderRadius = getRandomBorderRadius()
    particle.style.pointerEvents = 'none'
    container.appendChild(particle)
    debris.push(particle)
  }

  return debris
}

// ================== Animation Timeline ==================

/**
 * Initializes the hero text animation using GSAP's matchMedia for responsive behavior.
 */
export function initHeroTextAnimation$(): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  const mm = gsap.matchMedia() // Initialize matchMedia

  mm.add(
    {
      // Media query for users who prefer reduced motion
      "(prefers-reduced-motion: reduce)"() {
        logger.info(`User prefers reduced motion`)
        tl.from(['#CTA_header', '#CTA_paragraph', '#hero-primary-button'], {
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          delay: 0.5,
          visibility: 'hidden',
        })
      },
      // Default animation for users without motion preference
      "all"() {
        const ctaContainer = document.querySelector('#CTA_header') as HTMLElement
        const ctaParagraph = document.querySelector('#CTA_paragraph') as HTMLElement
        const button = document.querySelector('#hero-primary-button') as HTMLElement

        if (!ctaContainer || !ctaParagraph || !button) {
          logger.error('CTA elements not found')
          return
        }

        // Convert words to spans
        wordsToSpans(ctaContainer)
        wordsToSpans(ctaParagraph)
        wordsToSpans(button, true)

        const buttonTextSpans = button.querySelectorAll('span')

        // Animate Headers and Paragraphs
        tl.add('headerAnimation', gsap.effects.letterAnimation(ctaContainer.querySelectorAll('span')))
        tl.add('paragraphAnimation', gsap.effects.letterAnimation(ctaParagraph.querySelectorAll('span')), 0.5)

        // Initialize Button Animation
        tl.set(button, { opacity: 0 })
        const buttonDebris = createDebris(button, 16)
        const buttonRect = button.getBoundingClientRect()
        const debrisTimeline = gsap.effects.debrisAnimation(buttonDebris, { originRect: buttonRect, headerAdjust: 100 })

        // Button Intro Animation
        tl.from(button, {
          opacity: 0,
          scale: gsap.utils.random(1.5, 2, 0.1),
          y: window.innerHeight,
          x: gsap.utils.random(0, window.innerWidth),
          rotationX: getRandomRotation(),
          rotationY: getRandomRotation(),
          rotationZ: getRandomRotation(),
          z: gsap.utils.random(300, 600, 1),
          visibility: 'hidden',
          duration: 1,
          ease: 'power4.out',
          onStart: () => {
            gsap.set(button, { visibility: 'visible', opacity: 1 })
            gsap.to(button, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
          },
          onComplete: () => {
            debrisTimeline.play()

            // Jiggle the button for extra effect
            gsap.to(button, {
              x: 'random(-1, 1, 0.5)',
              y: 'random(-1, 1, 0.5)',
              duration: 0.5,
              scale: 1.05,
              repeat: 5,
              yoyo: true,
              ease: 'elastic',
            })

            // Reset button to normal state after jiggle
            gsap.to(button, {
              scale: 1,
              filter: 'none',
              duration: 1.5,
              ease: 'power2.in',
            })
          },
        }, '-=0.5')

        // Button Text Color Effect
        tl.to(buttonTextSpans, {
          opacity: 1,
          visibility: 'visible',
          duration: 1,
          stagger: { amount: 0.1 },
          color: gsap.utils.wrapYoyo(randomColorArray()),
          onComplete() {
            gsap.to(buttonTextSpans, {
              color: 'var(--emerald)',
              duration: 0.3,
            })
          },
        }, '-=0.5')
      }
    }
  )

  return tl
}
