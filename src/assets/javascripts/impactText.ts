import gsap from 'gsap'
import { Observable, first, from, of, switchMap } from 'rxjs'
import { prefersReducedMotion$ } from './eventHandlers'
import { logger } from './log'


const CONFIG = {
  travelSpeed: 500,           // Base speed for debris travel
  glowDuration: 0.2,          // Duration of each glow pulsation
  glowIntensity: 2,           // Intensity of the glow effect
  glowPulsations: 3,          // Number of glow pulsations
  debrisOriginRatio: 0.25,    // Fraction of element width to determine debris origin spread
} as const

// ================== Debris Creation ==================

/**
 * Creates debris particles within a target element.
 * @param {HTMLElement} target - The container to append debris to.
 * @param {number} maxCount - Maximum number of debris particles to create.
 * @returns {HTMLDivElement[]} Array of created debris particles.
 */
function createDebris(target: HTMLElement, maxCount: number = 16): HTMLDivElement[] {
  const debris: HTMLDivElement[] = []
  const debrisCount = gsap.utils.random(4, maxCount, 1)
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
    particle.style.width = `${gsap.utils.random(1, 4, 1)}px`
    particle.style.height = `${gsap.utils.random(1, 4, 1)}px`
    particle.style.backgroundColor = Math.random() < 0.5 ? 'var(--atomic-tangerine)' : 'var(--mindaro)'
    particle.style.borderRadius = `${gsap.utils.random(25, 95, 1)}% ${gsap.utils.random(25, 90, 1)}% ${gsap.utils.random(15, 98, 1)}% ${gsap.utils.random(40, 75, 1)}%`
    particle.style.pointerEvents = 'none'
    container.appendChild(particle)
    debris.push(particle)
  }

  return debris
}

// ================== Debris Animation ==================

/**
 * Animates debris particles outward from an origin point.
 * @param {HTMLDivElement[]} debris - Array of debris particles.
 * @param {DOMRect} originRec - Bounding rectangle of the origin element.
 * @param {number} headerAdjust - Adjustment value for header positioning.
 * @returns {gsap.core.Timeline} GSAP timeline for debris animation.
 */
function animateDebris(debris: HTMLDivElement[], originRec: DOMRect, headerAdjust: number = 100): gsap.core.Timeline {
  const debrisTimeline = gsap.timeline({ paused: true })

  const widthRatio = originRec.width * CONFIG.debrisOriginRatio
  const rectRanges = {
    x1: originRec.left - widthRatio,
    x2: originRec.right + widthRatio,
    y1: originRec.top - widthRatio,
    y2: originRec.bottom + widthRatio,
  }

  debris.forEach((particle, idx) => {
    const originX = gsap.utils.random(rectRanges.x1, rectRanges.x2, 1)
    const originY = gsap.utils.random(rectRanges.y1, rectRanges.y2, 1)

    const destX = gsap.utils.random(0, window.innerWidth, 1)
    const destY = gsap.utils.random(headerAdjust, window.innerHeight, 1)

    const distance = getDistance(originX, originY, destX, destY)
    const travelDuration = distance / CONFIG.travelSpeed

    debrisTimeline.add([
      `debris-${idx}`,
      gsap.fromTo(
        particle,
        {
          x: originX,
          y: originY,
          opacity: 1,
          rotation: gsap.utils.random(-360, 360),
          backgroundColor: particle.style.backgroundColor,
        },
        {
          x: destX,
          y: destY,
          opacity: 0,
          rotation: `+=${gsap.utils.random(-360, 360)}`,
          backgroundColor: 'var(--emerald)',
          duration: travelDuration,
          ease: 'power4.out',
          onStart: () => {
            gsap.from(particle, {
              filter: `brightness(${CONFIG.glowIntensity * 4}) blur(${gsap.utils.random(1, 4, 1)}px) drop-shadow(0.5px var(--mindaro))`,
              duration: 0.05,
              ease: 'power4.out',
            })
          },
          onUpdate: () => {
            gsap.to(particle, {
              filter: `brightness(${CONFIG.glowIntensity}) blur(1px)`,
              duration: CONFIG.glowDuration,
              yoyo: true,
              repeat: Math.max(Math.round(CONFIG.glowPulsations * (distance / getMaxDistance(originX, originY, headerAdjust))), 1),
              ease: 'sine.inOut',
            })
          },
          onComplete: () => {
            particle.remove()
             }
        }
      )],
    0
    )
  })

  return debrisTimeline
}

/**
 * Calculates the distance between two points.
 * @param {number} x1 - X-coordinate of the first point.
 * @param {number} y1 - Y-coordinate of the first point.
 * @param {number} x2 - X-coordinate of the second point.
 * @param {number} y2 - Y-coordinate of the second point.
 * @returns {number} Distance between the two points.
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculates the maximum possible distance from a point considering header adjustment.
 * @param {number} x - X-coordinate of the point.
 * @param {number} y - Y-coordinate of the point.
 * @param {number} headerAdjust - Header adjustment value.
 * @returns {number} Maximum distance.
 */
function getMaxDistance(x: number, y: number, headerAdjust: number): number {
  const hypot = (a: number, b: number) => Math.sqrt(a * a + b * b)
  return Math.max(
    hypot(x, y - headerAdjust),
    hypot(window.innerWidth - x, y - headerAdjust),
    hypot(x, window.innerHeight - y),
    hypot(window.innerWidth - x, window.innerHeight - y)
  )
}

// ================== Word-to-Spans ==================

/**
 * Converts text content of an element into individual spans.
 * @param {HTMLElement} el - The element to convert.
 * @param {boolean} button - Flag indicating if the element is a button.
 */
function wordsToSpans(el: HTMLElement, button: boolean = false): void {
  const text = el.innerHTML
  el.innerHTML = ''

  const characters = text.split('').filter(char => char !== ' ')
  characters.forEach((char, idx) => {
    const span = document.createElement('span')
    span.textContent = char
    if (!button) {
      span.classList.add('meteor', `meteor--${idx}`)
    }
    if (button) {
      span.classList.add('button-text')
      span.style.color = 'var(--turkey-red)'
      span.style.opacity = '0'
      span.style.visibility = 'hidden'
    }
    el.appendChild(span)
  })
}

// ================== Letters Animation ==================

/**
 * Animates letters with landing, pulsation, shimmer, and cooling effects.
 * @param {HTMLElement} el - The element containing letter spans.
 * @returns {gsap.core.Timeline} GSAP timeline for letters animation.
 */
function animateLetters(el: HTMLElement): gsap.core.Timeline {
  const spans = el.querySelectorAll('span')
  const lettersTimeline = gsap.timeline({ paused: true })
  const letters = Array.from(spans) as HTMLElement[]
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  letters.forEach((letter, idx) => {
    const debris = createDebris(letter, 16)
    const debrisTl = animateDebris(debris, letter.getBoundingClientRect())
    const fromXorY = gsap.utils.random(['x', 'y'])
    const originX = fromXorY === 'x' ? gsap.utils.random(0, windowWidth, 1) : 0
    const originY = fromXorY === 'y' ? gsap.utils.random(windowHeight * 0.75, windowHeight, 1) : 0

    lettersTimeline.add([
      `letter-${idx}`,
      gsap.from(letter, {
        opacity: 0,
        scale: gsap.utils.random(1.5, 2, 0.1),
        y: originY,
        x: originX,
        rotationX: gsap.utils.random(-720, 720),
        rotationY: gsap.utils.random(-360, 360),
        rotationZ: gsap.utils.random(-720, 720),
        z: gsap.utils.random(300, 600, 1),
        visibility: 'hidden',
        duration: 1,
        ease: 'power4.out',
        onStart: () => {
          gsap.set(letter, { visibility: 'visible', opacity: 1 })
          gsap.to(letter, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
        },
        onComplete: () => {
          debrisTl.play()
          lettersTimeline.add(
            gsap.timeline()
              .add(
                gsap.to(letter, {
                  color: 'var(--atomic-tangerine)',
                  filter: `brightness(${  gsap.utils.random(2, 4, 0.1)  }) blur(2px) drop-shadow(0 0 ${  gsap.utils.random(1, 4, 0.1)  }px var(--mindaro))`,
                  duration: 0.1,
                  ease: 'power4.out',
                })
              )
              .add(
                gsap.to(letter, {
                  scale: 1.05,
                  filter: 'brightness(1.5)',
                  duration: 0.3,
                  repeat: 3,
                  yoyo: true,
                  ease: 'sine.inOut',
                })
              )
              .add(
                gsap.to(letter, {
                  filter: 'blur(4px) brightness(1.8)',
                  duration: 0.5,
                  ease: 'power1.inOut',
                  yoyo: true,
                  repeat: 1,
                  onComplete: () => {
                    gsap.to(letter, {
                      color: 'inherit',
                      filter: 'none',
                      scale: 1,
                      duration: 1.5,
                      ease: 'power2.out',
                    })
                  },
                }),
                0
              ),
            `-=${0.5}` // Overlap the shimmer effect slightly
          )
        },
      })],
    1 + idx * gsap.utils.random(0.05, 0.2, 0.01)
    )
  })

  return lettersTimeline
}

// ================== Animation Timeline ==================

/**
 * Initializes the hero text animation.
 * @returns {Observable<gsap.core.Timeline>} Observable emitting the GSAP timeline.
 */
export function initHeroTextAnimation$(): Observable<gsap.core.Timeline> {
  const tl = gsap.timeline({ paused: true })

  return from(prefersReducedMotion$).pipe(
    first(),
    switchMap(prefersReducedMotion => {
      if (prefersReducedMotion && typeof prefersReducedMotion === 'boolean') {
        logger.info(`User prefers reduced motion: ${prefersReducedMotion}`)
        return of(
          tl.add(
            gsap.from(['#CTA_header', '#CTA_paragraph', '#hero-primary-button'], {
              opacity: 0,
              duration: 1,
              stagger: 0.2,
              delay: 0.5,
              visibility: 'hidden',
            })
          )
        )
      } else {
        const ctaContainer = document.querySelector('#CTA_header') as HTMLElement
        const ctaParagraph = document.querySelector('#CTA_paragraph') as HTMLElement
        const button = document.querySelector('#hero-primary-button') as HTMLElement

        if (!ctaContainer || !ctaParagraph || !button) {
          logger.error('CTA elements not found')
          return of(tl)
        }

        wordsToSpans(ctaContainer)
        wordsToSpans(ctaParagraph)
        wordsToSpans(button, true)

        const buttonTextSpans = button.querySelectorAll('span')

        // Animate Headers and Paragraphs
        tl.add(['headerAnimation', animateLetters(ctaContainer)], 0)
          .add(['paragraphAnimation', animateLetters(ctaParagraph)], 0.5)
          .set(button, { opacity: 0 })

        // ================== Button Animation ==================
        const buttonDebris = createDebris(button, 16)
        const buttonRect = button.getBoundingClientRect()
        const animateDebrisButton = animateDebris(buttonDebris, buttonRect, 100)

        tl.add([
          'buttonIntro',
          gsap.from(button, {
            opacity: 0,
            scale: gsap.utils.random(1.5, 2, 0.1),
            y: window.innerHeight,
            x: 'random(0, window.innerWidth)',
            rotationX: gsap.utils.random(-720, 720),
            rotationY: gsap.utils.random(-360, 360),
            rotationZ: gsap.utils.random(-720, 720),
            z: gsap.utils.random(300, 600, 1),
            visibility: 'hidden',
            duration: 1,
            ease: 'power4.out',
            onStart: () => {
              gsap.set(button, { visibility: 'visible', opacity: 1 })
              gsap.to(button, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
            },
            onComplete: () => {
              animateDebrisButton.play()

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
          })],
        '-=0.5' // Overlap button animation slightly with previous animation
        )

        // ================== Button Text Color Effect ==================
        tl.add([
          'buttonTextAnimation',
          gsap.to(buttonTextSpans, {
            opacity: 1,
            visibility: 'visible',
            duration: 0.5,
            stagger: { amount: 0.1 },
            color: 'var(--emerald)',
            onUpdate() {
              // Simulate flowing text with color cycling
              this.targets().forEach((el: HTMLElement) => {
                el.style.color = gsap.utils.random(
                  ['var(--ecru)', 'var(--turkey-red)', 'var(--saffron)', 'var(--shamrock-green)'],
                  true
                )()
              })
            },
            onComplete() {
              // Ensure final color is set
              gsap.to(buttonTextSpans, {
                color: 'var(--emerald)',
                duration: 0.3,
              })
            },
          })],
        '-=0.5'
        )

        return of(tl)
      }
    })
  )
}
