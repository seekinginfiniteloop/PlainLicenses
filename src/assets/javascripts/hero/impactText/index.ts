import { gsap, random } from 'gsap'
import { first, from, of, switchMap } from 'rxjs'
import { logger } from '~/log'
import { prefersReducedMotion$ } from '~/utils'

const CONFIG = {
  travelSpeed: 500,
  glowDuration: 0.2,
  glowIntensity: 2,
  glowPulsations: 3,
  debrisOriginRatio: 0.25,
} as const

// ================== Debris Creation ==================

function createDebris(target: HTMLElement, maxCount = 16) {
  const debris = []
  const debrisCount = gsap.utils.random(4, maxCount)
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
    particle.className = 'debris'
    particle.style.pointerEvents = 'none'
    particle.classList.add(`debris-${i}`)
    particle.style.position = 'absolute'
    particle.style.width = `${gsap.utils.random(1, 4)}px`
    particle.style.height = `${gsap.utils.random(1, 4)}px`
    particle.style.backgroundColor = Math.random() < .5 ? 'var(--atomic-tangerine)' : 'var(--mindaro)'
    particle.style.borderRadius = `${gsap.utils.random(25, 95)}% ${gsap.utils.random(25,90)}% ${gsap.utils.random(15, 98)}% ${gsap.utils.random(40,75)}%`
    container.appendChild(particle)
    debris.push(particle)
  }
  return debris
}


// ================== Debris Animation ==================
function animateDebris(debris: HTMLDivElement[], originRec: DOMRect, headerAdjust = 100) {
  const getMaxDistance = (x: number, y: number, headerAdjust = 100) => {
  const hypot = (a: number, b: number) => Math.sqrt(a * a + b * b)
  const maxHypot = (a: number, b: number, c: number, d: number) => Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d))

  const wX = window.innerWidth
  const wY = window.innerHeight
  const hypot1 = hypot(x, y - headerAdjust)
  const hypot2 = hypot(wX - x, y - headerAdjust)
  const hypot3 = hypot(x, wY - y)
  const hypot4 = hypot(wX - x, wY - y)
  return maxHypot(hypot1, hypot2, hypot3, hypot4)
  }

  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1)
    const dy = Math.abs(y2 - y1)
    return Math.sqrt(dx * dx + dy * dy)
  }

  // keep the debris within a fraction of the width of the origin element
  const widthRatio = originRec.width * CONFIG.debrisOriginRatio
  const debrisTimeline = gsap.timeline({ paused: true })
  const rectRanges = { x1: originRec.left - widthRatio, x2: (originRec.right + widthRatio), y1: originRec.top - widthRatio, y2: originRec.bottom + widthRatio }
  debris.forEach((particle, idx) => {
    const originX = gsap.utils.random(rectRanges.x1, rectRanges.x2)
    const originY = gsap.utils.random(rectRanges.y1, rectRanges.y2)
    const possibleDistance = getMaxDistance(originX, originY, headerAdjust)
    const destX = gsap.utils.random(0, window.innerWidth)
    const destY = gsap.utils.random(headerAdjust, window.innerHeight)
    const distance = getDistance(originX, originY, destX, destY)
    const distanceRatio = distance / possibleDistance
    const travelDuration = distance / CONFIG.travelSpeed

    debrisTimeline.add([`debris-${idx}`, gsap.fromTo(particle,
      {
        x: originX,
        y: originY,
        opacity: 1,
        rotation: `random(-360, 360)`,
        backgroundColor: 'random(var(--atomic-tangerine), var(--mindaro)',
      },
      {
        x: destX,
        y: destY,
        opacity: 0,
        rotation: '+=random(-360, 360)',
        backgroundColor: 'var(--emerald)',
        duration: travelDuration,
        ease: 'power4.out',
        onStart: () => { gsap.from(particle, { filter: `brightness(${CONFIG.glowIntensity * 4}) blur(random(1,4,1)px) dropShadow(0.5px var(--mindaro))`, duration: 0.05, ease: 'power4.out'})}, // Add a flash effect at the start
        onUpdate: () => {
          // Add glow pulsations during flight
          gsap.to(particle, {
            filter: `brightness(${CONFIG.glowIntensity}) blur(1px)`,
            duration: CONFIG.glowDuration,
            yoyo: true,
            repeat: Math.max(Math.round(CONFIG.glowPulsations * distanceRatio), 1),
            ease: 'sine.inOut',
          })
        }
      }
    )
    ], 0)
  }
  )
  return debrisTimeline
}

// ================== Word-to-Spans ==================
function wordsToSpans(el: HTMLElement, button = false) {
  const text = el.innerHTML
  el.innerHTML = ''

  const characters = text.split('').filter(char => char !== ' ')
  characters.forEach((char, idx) => {
    const span = document.createElement('span')
    span.innerHTML = char
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

function animateLetters(el: HTMLElement) {
  const spans = el.querySelectorAll('span')
  const lettersTimeline = gsap.timeline({ paused: true })
  const letters = Array.from(spans)
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  letters.forEach((letter, idx) => {
    const debris = createDebris(letter as HTMLElement, 16)
    const debrisTl = animateDebris(debris, letter.getBoundingClientRect())
    const fromXorY = gsap.utils.random(0, 1) ? 'x' : 'y'
    const originX = fromXorY === 'x' ? 0 : gsap.utils.random(0, windowWidth / 2)
    const originY = fromXorY === 'y' ? windowHeight : gsap.utils.random(windowHeight * 0.75, windowHeight)
    lettersTimeline.add([
      `letter-${idx}`,
      gsap.from(letter,
        {
          opacity: 0,
          scale: 'random(1.5, 2)',
          y: originY,
          x: originX,
          rotationX: 'random(-720, 720)',
          rotationY: 'random(-360, 360)',
          rotateZ: 'random(-720, 720)',
          z: 'random(300, 600)px',
          visibility: 'hidden',
          duration: 1,
          onStart: () => {
            gsap.set(letter, { visibility: 'visible', opacity: 1 })
            gsap.to(letter, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
          },
          ease: 'power4.out',
          onComplete: () => {
            debrisTl.add(
              gsap.from(letter, {
                color: 'var(--atomic-tangerine)',
                filter: 'brightness(random(2,4)) blur(2px) drop-shadow(0 0 random(1,4)px var(--mindaro))',
                duration: 0.1,
                ease: 'power4.out',
                onComplete: () => { // Add subtle pulsations (heat effect)
                  gsap.to(letter, {
                    scale: 1.05,
                    filter: 'brightness(1.5)',
                    duration: 0.3,
                    repeat: 3,
                    yoyo: true,
                    ease: 'sine.inOut',
                  })

                  // Simulate heat shimmer
                  gsap.to(letter, {
                    filter: 'blur(4px) brightness(1.8)',
                    duration: 0.5,
                    ease: 'power1.inOut',
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                      // Cool down after shimmer ends
                      gsap.to(letter, {
                        color: 'inherit',
                        filter: 'none',
                        scale: 1,
                        duration: 1.5,
                        ease: 'power2.out',
                      })
                    }
                  })
                }
              }), 0)
            debrisTl.play()
          }
        })], 1 + idx * gsap.utils.random(0.05, 0.2))
  })
  return lettersTimeline
}

// ================== Animation Timeline ==================
export function initHeroTextAnimation$() {
  const tl = gsap.timeline({ paused: true })

  return from(prefersReducedMotion$).pipe(
    first(),
    switchMap(prefersReducedMotion => {
      if (prefersReducedMotion && typeof prefersReducedMotion === 'boolean') {
        logger.info(`User prefers reduced motion: ${prefersReducedMotion}`)
        return of(
          tl.add(
            gsap.from(['#CTA_header', '#CTA_paragraph', '#hero-primary-button'], {
              paused: true,
              opacity: 0,
              duration: 1,
              stagger: 0.2,
              delay: 0.5,
              visibility: 'hidden',
            })
          )
        )
      } else {
        const ctaContainer = document.querySelector('#CTA_header')
        const ctaParagraph = document.querySelector('#CTA_paragraph')
        const button = document.querySelector('#hero-primary-button')
        const buttonRect = button?.getBoundingClientRect()
        const buttonDebris = createDebris(button as HTMLElement, 16)
        const animateDebrisButton = animateDebris(buttonDebris, buttonRect as DOMRect, 100)
        if (!ctaContainer || !ctaParagraph || !button) {
          logger.error('CTA elements not found')
          return of(tl)
        }
        wordsToSpans(ctaContainer as HTMLElement)
        wordsToSpans(ctaParagraph as HTMLElement)
        wordsToSpans(button as HTMLButtonElement, true)

        const buttonTextSpans = button.querySelectorAll('span')

        tl.add(['headerAnimation', animateLetters(ctaContainer as HTMLElement)], 0)
          .add(['paragraphAnimation', animateLetters(ctaParagraph as HTMLElement)], 0.5)
          .set(button, { opacity: 0})

        // ================== Button Animation ==================
          .add(["buttonIntro", gsap.from(button, {
            opacity: 0,
            scale: 'random(1.5, 2)',
            y: window.innerHeight,
            x: random(0, window.innerWidth),
            rotationX: 'random(-720, 720)',
            rotationY: 'random(-360, 360)',
            rotateZ: 'random(-720, 720)',
            z: 'random(300, 600)px',
            visibility: 'hidden',
            duration: 1,
            onStart: () => {
              gsap.set(button, { visibility: 'visible', opacity: 1 })
              gsap.to(button, { filter: 'brightness(2) drop-shadow(0 0 2px var(--mindaro))', duration: 1 })
            },
            onComplete: () => {
              animateDebrisButton.add(
                gsap.from(button, {
                  backgroundColor: 'var(--atomic-tangerine)',
                  filter: 'brightness(random(2,4)) blur(2px) drop-shadow(0 0 random(1,4)px var(--mindaro))',
                  duration: 0.1,
                  ease: 'power4.out',
                }), 0)
                .add(gsap.to(button, {
                  x: 'random(-1, 1, 0.5)',
                  y: 'random(-1, 1, 0.5)',
                  duration: 0.5,
                  scale: 1.05,
                  repeat: 3,
                }), 0)
                .add(gsap.to(button, {
                  scale: 1,
                  filter: 'none',
                  duration: 1.5,
                  ease: 'power2.out',
                }), 0)
            }
          })], "-=0.5")

        // ================== Button Text Color Effect ==================
        tl.add([
          "buttonTextAnimation",
          gsap.to(buttonTextSpans, {
            opacity: 1,
            visibility: 'visible',
            duration: 0.5,
            perspective: 0,
            stagger: { amount: 0.1 },
            color: 'var(--emerald)', // Final color after animation
            onUpdate() {
              // Simulate flowing text with color cycling
              this.targets().forEach((el: HTMLElement) => {
                el.style.color = gsap.utils.random(
                  'var(--ecru)', 'var(--turkey-red)', 'var(--saffron)',
                  'var(--shamrock-green)')
              })
            }
})], "-=0.5")

        return of(tl)
      }
    })
  )
}
