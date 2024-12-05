import { gsap } from 'gsap'

import { prefersReducedMotion } from '~/utils'

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
    particle.style.backgroundColor = '#fff'
    particle.style.borderRadius = '50%'
    container.appendChild(particle)
    debris.push(particle)
  }
  return debris
}

// Main animation function

/**
 * Start the hero animation
 */
export function initHeroAnimation() {
    // Add perspective to the container
  gsap.set('.mdx-hero__teaser', {
        perspective: 1000
    })

  if (prefersReducedMotion()) {
        // Simple fade in for users who prefer reduced motion
    gsap.from(['.cta-container', '#CTA_paragraph', '#hero-primary-button'], {
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            delay: 0.5
        })
    return
  }

    // Set initial states with bottom position and forward tilt
  gsap.set(['.cta-container', '#CTA_paragraph', '#hero-primary-button'], {
        opacity: 0,
        scale: 3,
        y: 200, // Start from below
        rotationX: 45, // Tilt forward
        z: -500, // Start further back in Z space
        transformOrigin: 'center center'
    })

    // Create timeline for coordinated animations
  const tl = gsap.timeline({
        delay: 0.5
    })

    // Animate main heading
  tl.to('.cta-container', {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.out',
        onStart: () => {
            // Create impact effect
            const debris = createDebris(document.querySelector('.cta-container'))
            gsap.to(debris, {
                x: 'random(-100, 100)',
                y: 'random(-100, 100)',
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                stagger: {
                  amount: 0.3
                }
            })

            // Add camera shake effect
            gsap.to('.mdx-hero__teaser', {
                x: 'random(-5, 5)',
                y: 'random(-5, 5)',
                duration: 0.1,
                repeat: 5,
                yoyo: true,
                ease: 'none',
                clearProps: 'x,y'
            })
        }
    })

    // Animate subheading with similar but slightly different trajectory
    .to('#CTA_paragraph', {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        z: 0,
        duration: 0.7,
        ease: 'power2.out',
    }, '-=0.5')

    // Animate button with a more dramatic approach
    .to('#hero-primary-button', {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        z: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
            // Add subtle floating animation to button
            gsap.to('#hero-primary-button', {
                y: -10,
                rotationX: -5,
                duration: 1.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            })
        }
    }, '-=0.4')
}
