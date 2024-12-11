import { gsap } from 'gsap'
import { first, from, of, switchMap } from 'rxjs'
import { logger } from '~/log'
import { prefersReducedMotion$ } from '~/utils'

/**
 * Create debris particles for impact effect
 * @param target The container to append the debris to
 * @param count The number of debris particles to create
 * @returns An array of debris particles
 */
function createDebris(target: HTMLElement, count = 16) {
  const randomRadii = (): string => {
    const values = [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100]
    return `${values[0]}% ${values[1]}% ${values[2]}% ${values[3]}%`
  }
  const debris = []
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.pointerEvents = 'none'
  target.appendChild(container)

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div')
    particle.style.position = 'absolute'
    particle.style.width = '4px'
    particle.style.height = '4px'
    particle.style.backgroundColor = 'var(--emerald)'
    const x = Math.random() * 100
    particle.style.borderRadius = randomRadii()
    container.appendChild(particle)
    debris.push(particle)
  }
  logger.info(`debris: ${debris}, length: ${debris.length}`)
  return debris
}

let customWindow: CustomWindow = window as unknown as CustomWindow
const windowWidth = customWindow.innerWidth
const windowHeight = customWindow.innerHeight
// Main animation function

/**
 * Convert text content of an element into spans
 * @param el The element to convert
 */
function wordsToSpans(el: HTMLElement, button: boolean = false) {
  const text = el.innerHTML
  const words = text.split(' ').filter(word => word.trim() !== '')
  logger.info(`text: ${text}, words: ${words}`)
  let className = 'meteor'
  if (!words.includes('Fight!')) {
    className = 'meteor--two'
  }
  el.innerHTML = ''
  const characters = text.split('')
  characters.forEach(char => {
    logger.info(`char: ${char}`)
    const span = document.createElement('span')
    span.innerHTML = char
    span.classList.add(className)
    logger.info(`span: ${span}`)
    if (button) {
      span.classList.add('button-text')
      span.style.color = 'var(--turkey-red)'
      span.style.opacity = '0'
      span.style.transition = 'color 0.3s ease, opacity 0.3s ease'
      span.style.visibility = 'hidden'
    }
    el.appendChild(span)

  })
}

/**
 * Start the hero animation
 * @returns A subscription to the prefersReducedMotion$ observable with the animated text timeline
 */
export function initHeroTextAnimation$() {
  const tl = gsap.timeline()
  return from(prefersReducedMotion$).pipe(
    first(),
    switchMap(prefersReducedMotion => {
      if (prefersReducedMotion && typeof prefersReducedMotion === 'boolean') {
        logger.info(`User prefers reduced motion: ${prefersReducedMotion}`)
        return of(tl.add(gsap.from(['#CTA_header', '#CTA_paragraph', '#hero-primary-button'], {
          paused: true,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          delay: 0.5,
          visibility: 'hidden'
        }))
        )
      } else {
        tl.call(() => { logger.info("Hero text animation started") })
        const ctaContainer = document.querySelector('#CTA_header') as HTMLElement
        const containerRect = ctaContainer.getBoundingClientRect()
        const ctaParagraph = document.querySelector('#CTA_paragraph') as HTMLElement
        const paragraphRect = ctaParagraph.getBoundingClientRect()
        wordsToSpans(ctaContainer)
        wordsToSpans(ctaParagraph)
        logger.info(`ctaContainer: ${ctaContainer}, ctaParagraph: ${ctaParagraph}`)
        const headerSpans = ctaContainer.querySelectorAll('span')
        const paragraphSpans = ctaParagraph.querySelectorAll('span')
        const button = document.querySelector('#hero-primary-button') as HTMLElement
        wordsToSpans(button, true)
        const buttonTextSpans = button.querySelectorAll('span')
        const firstDebris = createDebris(ctaContainer)
        const secondDebris = createDebris(ctaParagraph)

        // Set initial states with bottom position and forward tilt
        tl.add(["initialState", gsap.set([...headerSpans, ...paragraphSpans, button], {
          opacity: 0,
          scale: 3,
          y: 200, // Start from below
          x: 50,
          rotationX: 45, // Tilt forward
          z: -800, // Start further back in Z space
          visibility: 'visible',
          transformOrigin: 'center center'
        })], "<")
        // Create timeline for coordinated animations

        // Animate main heading
        tl.add(["headingIntro", gsap.to([...headerSpans], {
          opacity: 1,
          scale: 1,
          delay: 1,
          y: 0,
          rotationX: 0,
          z: 0,
          duration: 0.8,
          stagger: {amount: 0.2},
          perspective: 0,
          ease: 'power3.in',
        })], "<")
          .add(["firstDebris", gsap.fromTo([...firstDebris],
            {
              x: gsap.utils.random(containerRect.left, containerRect.right),
              y: gsap.utils.random(containerRect.top, containerRect.bottom),
              opacity: 1,
            },
            {
            x: gsap.utils.random(0, windowWidth),
            y: gsap.utils.random(0, windowHeight),
            opacity: 0,
            duration: 0.3,
            ease: 'power3.out',
            stagger: {
              amount: 0.05
            }
          })], "-=0.2")

          .add(["cameraShake", gsap.to('.mdx-hero__teaser', {
            x: 'random(-3, 3)',
            y: 'random(-3, 3)',
            duration: 0.2,
            repeat: 3,
            yoyo: true,
            ease: 'none',
            clearProps: 'x,y'
          })
          ], ">")

          // Animate subheading with similar but slightly different trajectory
          .add(["intoParagraphs", gsap.to([...paragraphSpans], {
            opacity: 1,
            scale: 1,
            y: 0,
            rotationX: 0,
            z: 0,
            duration: 0.6,
            ease: 'power3.in',
            stagger: {
              amount: 0.2
            },
            perspective: 0
          })], '-=0.3')

            .add(["secondDebris", gsap.fromTo([...secondDebris],
            {
              x: gsap.utils.random(paragraphRect.left, paragraphRect.right),
              y: gsap.utils.random(paragraphRect.top, paragraphRect.bottom),
              opacity: 1,
            },
            {
            x: gsap.utils.random(0, windowWidth),
            y: gsap.utils.random(0, windowHeight),
            opacity: 0,
            duration: 0.3,
            ease: 'power3.out',
            stagger: {
              amount: 0.05
            }
          })], "-=0.25")

          // Animate button with a more dramatic approach
          .add(["buttonIntro", gsap.to('#hero-primary-button', {
            opacity: 1,
            scale: 1,
            y: 0,
            rotationX: 0,
            z: 0,
            duration: 0.6,
            ease: 'power3.in',
            perspective: 0,
            onComplete: () => {
              // jiggle the button
              gsap.to('#hero-primary-button', {
                y: -1,
                x: 2,
                rotationX: -1,
                duration: 0.1,
                repeat: 10,
                yoyo: true,
                ease: 'power1.inOut'
              })
            }
          })], '>')

            .add(["buttonTextAnimation", gsap.to([...buttonTextSpans], {
              opacity: 1,
              visibility: 'visible',
              duration: 0.5,
              perspective: 0,
              stagger: {
                amount: 0.1
              },
              color: 'var(--emerald)'
            })], "-=0.1")
            .call(() => { logger.info("Hero text animation completed") })
        return of(tl)
      }
      }
    ))
}
