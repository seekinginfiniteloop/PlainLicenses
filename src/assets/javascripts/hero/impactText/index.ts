import { gsap } from 'gsap'
import { first, firstValueFrom, of, switchMap } from 'rxjs'
import { logger } from '~/log'
import { prefersReducedMotion$ } from '~/utils'

/**
 * Create debris particles for impact effect
 * @param target The container to append the debris to
 * @param count The number of debris particles to create
 * @returns An array of debris particles
 */
function createDebris(target: HTMLElement, count = 8) {
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
    particle.style.borderRadius = `${(x < 50 ? x * 1.25 : x).toFixed(0)}%`
    container.appendChild(particle)
    debris.push(particle)
  }
  return debris
}

// Main animation function

/**
 * Convert text content of an element into spans
 * @param el The element to convert
 */
function wordsToSpans(el: HTMLElement): HTMLElement[] {
  const text = el.innerHTML
  const words = text.split(' ').filter(word => word.trim() !== '')
  const spans = words.map(word => {
      const span = document.createElement('span')
    span.innerHTML = `${word} `
    logger.info(`span: ${span}`)
      return span
    })
  el.innerHTML = ''
  spans.forEach(span => el.appendChild(span))
  return spans
}

/**
 * Start the hero animation
 * @returns A subscription to the prefersReducedMotion$ observable with the animated text timeline
 */
export async function initHeroTextAnimation$() {
  return firstValueFrom(prefersReducedMotion$).then(prefersReducedMotion => {
    if (prefersReducedMotion && typeof prefersReducedMotion === 'boolean') {
      logger.info(`User prefers reduced motion: ${prefersReducedMotion}`)
      return gsap.timeline().add(gsap.from(['#CTA_header', '#CTA_paragraph', '#hero-primary-button'], {
        paused: true,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        delay: 0.5
      }))
    } else {
      logger.info("User does not prefer reduced motion")
      const tl = gsap.timeline({
        paused: true,
        smoothChildTiming: true
      })
        .add(["start",
          gsap.set('.mdx-hero__teaser', {
            perspective: 1000
          })], "<")
      tl.call(() => { logger.info("Hero text animation started") })
      const ctaContainer = document.querySelector('#CTA_header') as HTMLElement
      const ctaParagraph = document.querySelector('#CTA_paragraph') as HTMLElement
      const firstSpanGroup = wordsToSpans(ctaContainer)
      const secondSpanGroup = wordsToSpans(ctaParagraph)
      logger.info(`ctaContainer: ${ctaContainer}, ctaParagraph: ${ctaParagraph}, firstSpanGroup: ${firstSpanGroup}, secondSpanGroup: ${secondSpanGroup}`)
      const headerSpans = ctaContainer.querySelectorAll('span')
      const paragraphSpans = ctaParagraph.querySelectorAll('span')
      const button = document.querySelector('#hero-primary-button') as HTMLElement
      const buttonText = button.textContent
      button.innerHTML = ''
      const buttonTextSpans = buttonText?.split('').map(char => { let newSpan = document.createElement('span'); newSpan.textContent = char; return newSpan })

      // Set initial states with bottom position and forward tilt
      tl.add(["initialState", gsap.set([...headerSpans, ...paragraphSpans, button], {
        opacity: 0,
        scale: 3,
        y: 200, // Start from below
        rotationX: 45, // Tilt forward
        z: -500, // Start further back in Z space
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
        perspective: 0,
        ease: 'power3.in',
        onStart: () => {
          // Create impact effect
          if (ctaContainer && ctaContainer instanceof HTMLElement) {
            const debris = createDebris(ctaContainer)
            gsap.to(debris, {
              x: 'random(-100, 100)',
              y: 'random(-100, 100)',
              opacity: 0,
              duration: 0.5,
              ease: 'power3.out',
              stagger: {
                amount: 0.2
              }
            })
          }
        }
      })], "<")

        .add(["cameraShake", gsap.to('.mdx-hero__teaser', {
          x: 'random(-5, 5)',
          y: 'random(-5, 5)',
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
          duration: 0.5,
          ease: 'power3.in',
          stagger: {
            amount: 0.2
          },
          perspective: 0
        })], '-=0.5')

        .add(["debris", gsap.to(createDebris(ctaParagraph), {
          x: 'random(-100, 100)',
          y: 'random(-100, 100)',
          opacity: 0,
          duration: 0.3,
          ease: 'power3.out',
          stagger: {
            amount: 0.1
          }
        })], '-=0.3')

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
            // Add subtle floating animation to button
            gsap.to('#hero-primary-button', {
              y: -10,
              rotationX: -5,
              duration: 1.2,
              repeat: 4,
              yoyo: true,
              ease: 'power1.inOut'
            })
          }
        })], '>')

        .add(["buttonTextIntro", gsap
          .set([...buttonTextSpans || [document.createElement('span')]] as gsap.TweenTarget[], {
            opacity: 0,
            color: 'var(--turkey-red)'
          })], "<")

        .add(["buttonTextFadeIn", gsap.delayedCall(0.1, () => buttonTextSpans?.forEach(span => button.appendChild(span)))], ">")

        .add(["buttonTextAnimation", gsap.to([...buttonTextSpans || [document.createElement('span')]], {
          opacity: 1,
          duration: 0.3,
          perspective: 0,
          stagger: {
            amount: 0.1
          },
          color: 'var(--emerald)'
        })], "-=0.1")
        .call(() => { logger.info("Hero text animation completed") })
      return tl
    }
  })
}
