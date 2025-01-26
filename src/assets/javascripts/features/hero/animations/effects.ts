/**
 * @module observerEffects
 * @description Creates and registers gsap effects for observer-based animations.
 *
 * USAGE:
 * The effects register to the global gsap object, and can be used in timelines or tweens as if it were a 'gsap.to' or 'gsap.fromTo' effect.
 * For example, for the 'fadeIn' effect: gsap.fadeIn(targets, config)
 *
 ** Effects:
 **  - setSection: Sets the specified section up for a transition.
 **  - transitionSection: Transitions the specified section.
 **  - fadeIn: Fades in the specified targets with a y-axis movement.
 **  - fadeOut: Fades out the specified targets with a y-axis movement.
 **  - emphasize: Blinks, jumps, and scales up the specified targets.
 *
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 *
 */

import gsap from 'gsap'
import { getDistanceToViewport, getMatchMediaInstance, modifyDurationForReducedMotion, wordsToLetterDivs } from './utils'
import { AnimateMessageConfig, Direction, EmphasisConfig, FadeEffectConfig, ReducedMotionCondition, TransitionConfig} from './types'


/**
 * Retrieves the fade variables for autoAlpha and yPercent.
 * @param out - Whether it's a fade out effect or not.
 * @param yPercent - The percentage of the y-axis to fade in/out.
 * @param direction - The direction to fade in/out.
 * @returns The fade variables for the fade effect's from and to states.
 */
function getFadeVars(out: boolean = false, yPercent: number, direction?: Direction |null) {
  const defaultDirection = out ? Direction.UP : Direction.DOWN
  const pathDirection = direction || defaultDirection
  return {
    from: { autoAlpha: out ? 1 : 0, yPercent: out ? 0 : pathDirection * yPercent },
    to: { autoAlpha: out ? 0 : 1, yPercent: out ? pathDirection * yPercent : 0 },
  }
}

function getDFactor(direction: Direction) {
  return direction === Direction.UP ? Direction.UP : Direction.DOWN
}

// ! WARNING: gsap warns about nesting effects within an effect.
// ! I Don't know what happens if you do...implosion of the multiverse?
// ! We avoid that be creating tweens/timelines and then creating effects from those tweens/timelines.

/**
 * Sets the specified section up for a transition.
 */
gsap.registerEffect({
    name: "setSection",
    extendTimeline: true,
    defaults: { extendTimeline: true },
    effect: (config: TransitionConfig) => {
        const { direction, section } = config
        const dFactor = getDFactor(direction)
        const tl = gsap.timeline()
            tl.add(
              gsap.set(section.element, { zIndex: 0 }))
                .add(
                  gsap.to(section.bg, { yPercent: -15 * dFactor }))
                .add(
                  gsap.set(section.element, { autoAlpha: 0 }))
                .add(
                  gsap.set(section.content, { autoAlpha: 0 }))
            }
})

/**
 * Transitions the specified section.
 */
gsap.registerEffect({
    name: "transitionSection",
    extendTimeline: true,
    defaults: { extendTimeline: true },
    effect: (config: TransitionConfig) => {
        const { direction, section } = config
        const dFactor = getDFactor(direction)
        const tl = gsap.timeline()
        tl.fromTo([section.outerWrapper,
          section.innerWrapper], {
            yPercent: (i: number) => i ? i * -100 * dFactor : 100 * dFactor
        }, {
            yPercent: 0
        }, 0)
            .fromTo(
              section.bg, {
            yPercent: 15 * dFactor
            }, {
            yPercent: 0
            }, 0)
            .set(section.element, { zIndex: 1, autoAlpha: 1 })
            .fromTo(
              section.content, {
            autoAlpha: 0,
            yPercent: 50 * dFactor
            }, {
            autoAlpha: 1,
            yPercent: 0,
            stagger: {
              each: 0.1,
              axis: "y",
              from: direction === Direction.UP ? "start" : "end"
            }
            }, 0.2)
        if (section.animation) {
          tl.add(section.animation, ">=wrapperTransition")
        }
        return tl
    }
})

/**
 * Fades in or out the specified targets.
 * @param targets - The targets to fade in or out.
 * @param config - The fade effect configuration.
 * @returns The fade effect.
 */
const fade = (targets: gsap.TweenTarget,
    config: FadeEffectConfig = { out: false, direction: 1, fromConfig: {}, toConfig: {} })  => {
    const media = getMatchMediaInstance()
    const tl = gsap.timeline()
    media.add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context: gsap.Context) => {
        const { out, direction, fromConfig, toConfig } = config
        if (fromConfig && toConfig) {
          const fadeVars = getFadeVars(out, Number(fromConfig.yPercent) || Number(toConfig?.yPercent) || 50, direction || null)
          const fromVars = { ...fadeVars.from, ...fromConfig }
          const toVars = { ...fadeVars.to, ...toConfig }
          const { reducedMotion } = context.conditions as ReducedMotionCondition
          if (reducedMotion) {
            const modifiedVars = [fromVars, toVars].map((vars) => {
                let modified: Partial<typeof vars> = { ...vars }
                if (modified.yPercent) {
                  delete modified.yPercent
                } else if (modified.duration) {
                  modified.duration = modifyDurationForReducedMotion(vars.duration || 0.5)
                }
                return modified
            })
            tl.add(gsap.fromTo(targets, modifiedVars[0], modifiedVars[1]))
          } else {
            tl.add(gsap.fromTo(targets, {
                ...fromVars
                }, {
                ...toVars,
          }))
          }
        }})
    return tl
}

// Register the fade effect with GSAP for fadeIn and fadeOut.
gsap.registerEffect({
    name: "fadeIn",
    extendTimeline: true,
    effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
        const { direction, fromConfig, toConfig } = config
        targets = targets instanceof Array ? targets : [targets]
        return fade(targets, { out: false, direction, fromConfig, toConfig })
    }
})

gsap.registerEffect({
    name: "fadeOut",
    extendTimeline: true,
    defaults: { extendTimeline: true },
    effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
        const { direction, fromConfig, toConfig } = config
            return fade(targets, { out: true, direction, fromConfig, toConfig })
    }
})

/**
 * Blinks the specified targets.
 * @param targets - The targets
 * @param config - The blink configuration.
 * @returns The blink effect.
 */
const blink = (
    targets: gsap.TweenTarget,
    config: gsap.TweenVars = {},
) => {
    const duration = modifyDurationForReducedMotion(config.duration || 0.5)
    return gsap.to(targets, { autoAlpha: 0, ease: "power4.in", startAt: { filter: "brightness(1.3)" }, ...config, duration})
}

/**
 * Jumps the specified targets.
 * @param targets - The targets.
 * @param config - The jump configuration.
 * @returns The jump effect.
 */
const jump = (
    targets: gsap.TweenTarget,
    config: gsap.TweenVars = {},
) => {
    config.y ? config.delete("y") : null
    const duration = modifyDurationForReducedMotion(config.duration || 0.5)
    return gsap.to(targets, {
        y: (_index: number, target: Element, _targets: Element[]) => {
            const distance = Math.abs(getDistanceToViewport(target))
            // Note the negative sign to invert the direction of the jump.
            return -(gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25) as number)
        },
        yoyoEase: "bounce",
        ease: "elastic",
        repeatDelay: 2,
        ...config,
        duration
    }
    )}

/**
 * Scales up the specified targets.
 * @param targets - The targets.
 * @param config - The scale up configuration.
 * @returns The scale up effect.
 */
const scaleUp = (
    targets: gsap.TweenTarget,
    config: gsap.TweenVars = {},
) => {
    const duration = modifyDurationForReducedMotion(config.duration || 0.5)
    return gsap.to(targets, { scale: 1.5, ease: "elastic", ...config, duration })
}

/**
 * Emphasizes the specified targets.
 * @param targets - The targets.
 * @param config - The emphasis configuration.
 * @returns The emphasis effect.
 */
gsap.registerEffect({
    name: "emphasize",
    extendTimeline: true,
    defaults: { repeat: - 1, yoyo: true, extendTimeline: true },
    effect: (targets: gsap.TweenTarget, config: EmphasisConfig) => {
        if (!targets) {
          return null
        }
        const { blinkConfig, jumpConfig, scaleUpConfig } = config
        const emphasisTimeline = gsap.timeline()
        getMatchMediaInstance().add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context: gsap.Context) => {
            const { reducedMotion } = context.conditions as ReducedMotionCondition
            if (reducedMotion) {
              emphasisTimeline.add(blink(targets, { ...blinkConfig, ease: "power1.inOut" }))
              emphasisTimeline.add(scaleUp(targets, { ...scaleUpConfig }))
            }
            else {
              emphasisTimeline.add(blink(targets, blinkConfig))
              emphasisTimeline.add(jump(targets, jumpConfig))
              emphasisTimeline.add(scaleUp(targets, scaleUpConfig))
            }
        }
        )
        return emphasisTimeline
    }
}
)

/**
 * Animates a message.
 * Note: The message will be animated by drawing text from the target element(s) if
 * you don't provide a message in the config.
 * If a message is provided in the config, it will only animate
 * in the first target element (if there are multiple)
 * ... I assume you don't want the same message animated over and over again.
 * @param target - The target element(s) to animate the message in.
 * @param config - The animate message configuration.
 */
gsap.registerEffect({
    name: "animateMessage",
    extendTimeline: true,
    defaults: { extendTimeline: true, repeat: 0 },
    effect: (target: gsap.TweenTarget, config: AnimateMessageConfig) => {
        target = target instanceof Array ? target : gsap.utils.toArray(target)
        if (!target || !(target instanceof Array)) {
          return gsap.timeline()
        }
        target = gsap.utils.toArray(target).filter((el) => el !== null && el instanceof HTMLElement)
        let msgFrag = document.createDocumentFragment()
        let animationElements: HTMLElement[] = []
        if (config.message) {
          msgFrag = wordsToLetterDivs(config.message)
          target = (target as []).slice(0, 1)
          if (target instanceof Array && target.length > 0 && target[0] && target[0] instanceof HTMLElement) {
            requestAnimationFrame(() => {
                    // @ts-ignore - seriously... can't TS see the type guard RIGHT THERE? ^^
                    const element = target[0] as HTMLElement
                    element.append(msgFrag)
                    animationElements = gsap.utils.toArray(element.querySelectorAll('div')).filter((el) => el !== null && el instanceof HTMLElement && el.innerText !== '') as HTMLElement[]
                })
          } else { return gsap.timeline() }
        } else {
          gsap.utils.toArray(target).forEach((el) => {
                if (el instanceof HTMLElement) {
                  const text = wordsToLetterDivs(el)
                  requestAnimationFrame(() => {
                        el.append(text)
                    })
                  animationElements.push(el)
                }
            })
        }
        const messageTimeline = gsap.timeline()
        messageTimeline.add(["setState", gsap.set(animationElements, { autoAlpha: 0 })], 0)
        let fromVars = config.entranceFromVars || {}
        let toVars = config.entranceToVars || {}
        let exitVars = config.exitVars || {}
        gsap.matchMedia().add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context: gsap.Context) => {
            const { reducedMotion } = context.conditions as ReducedMotionCondition
            if (reducedMotion) {
              fromVars.yPercent = 50
              toVars.ease = "power1.inOut"
              toVars.stagger = { each: 0.04, from: "start" }
              toVars.duration = modifyDurationForReducedMotion(toVars.duration || 1)
              exitVars.duration = modifyDurationForReducedMotion(exitVars.duration || 0.5)
              exitVars.yPercent = -50
              exitVars.ease = "power1.inOut"
              exitVars.stagger = { each: 0.04, from: "end" }
            }
        }
        )
        messageTimeline.add(["randomEntrance", gsap.fromTo(animationElements, { autoAlpha: 0, yPercent: 150, ...fromVars}, { autoAlpha: 1, yPercent: 0, stagger: { each: 0.03, from: "random" }, duration: 1.2, ...toVars})], 0.02)
        messageTimeline.add(["randomExit", gsap.to(animationElements, { autoAlpha: 0, duration: 0.5, yPercent: gsap.utils.random(-150, 150, 10), stagger: { each: 0.03, from: "random"}, ...exitVars})], 4.5)
        return messageTimeline
    }
})
