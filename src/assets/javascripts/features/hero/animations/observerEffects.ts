/**
 * @module observerEffects
 * @description Creates and registers gsap effects for observer-based animations.
 *
 * USAGE:
 * The effects register to the global gsap object, and can be used in timelines or tweens as if it were a 'gsap.to' or 'gsap.fromTo' effect.
 * For example, for the 'fadeIn' effect: gsap.fadeIn(targets, config)
 *
 ** Effects:
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
import { getDistanceToViewport, getMatchMediaInstance } from './utils'
import { Direction, EmphasisConfig, FadeEffectConfig, ReducedMotionCondition, TransitionConfig } from './types'

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

//! WARNING: gsap warns about nesting effects in an effect. Don't know what happens if you do...implosion of the multiverse?  We avoid that be creating tweens/timelines and then creating effects from those tweens/timelines.

/**
 * Sets the specified section up for a transition.
 */
gsap.registerEffect({
    name: "setSection",
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
const fade = (targets: Element[],
    config: FadeEffectConfig = { out: false, direction: 1, fromConfig: {}, toConfig: {} })  => {
    const media = getMatchMediaInstance()
    const tl = gsap.timeline()
    media.add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context: gsap.Context) => {
        const { out, direction, fromConfig, toConfig } = config
        const fadeVars = getFadeVars(out, fromConfig.yPercent || toConfig.yPercent || 50, direction || null)
        const fromVars = { ...fadeVars.from, ...fromConfig }
        const toVars = { ...fadeVars.to, ...toConfig }
        const { reducedMotion } = context.conditions as ReducedMotionCondition
        if (reducedMotion) {
            const modifiedVars = [fromVars, toVars].map((vars) => {
                let modified = { ...vars }
                delete modified.yPercent
                modified.duration ? modified.duration *= 2 : null
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
    })
    return tl
}

// Register the fade effect with GSAP for fadeIn and fadeOut.
gsap.registerEffect({
    name: "fadeIn",
    extendTimeline: true,
    effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
        const { direction, fromConfig, toConfig } = config
        return fade(targets, { out: false, direction, fromConfig, toConfig })
    }
})

gsap.registerEffect({
    name: "fadeOut",
    defaults: { extendTimeline: true },
    effect: (targets: Element[], config: FadeEffectConfig) => {
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
    targets: Element[],
    config: gsap.TweenVars = {},
) => {
    return gsap.to(targets, { autoAlpha: 0, duration: 0.5, ease: "power4.in", ...config})
}

/**
 * Jumps the specified targets.
 * @param targets - The targets.
 * @param config - The jump configuration.
 * @returns The jump effect.
 */
const jump = (
    targets: Element[],
    config: gsap.TweenVars = {},
) => {
    config.y ? config.delete("y") : null
    return gsap.to(targets, {
        y: (_index: number, target: Element, _targets: Element[]) => {
              const distance = Math.abs(getDistanceToViewport(target))
            return -(gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25) as number)
        },
        duration: 0.5,
        yoyoEase: "bounce",
        ease: "elastic",
        ...config
    }
    )}

/**
 * Scales up the specified targets.
 * @param targets - The targets.
 * @param config - The scale up configuration.
 * @returns The scale up effect.
 */
const scaleUp = (
    targets: Element[],
    config: gsap.TweenVars = {},
) => {
    return gsap.to(targets, { scale: 1.5, duration: 0.5, ease: "elastic", ...config })
}

/**
 * Emphasizes the specified targets.
 * @param targets - The targets.
 * @param config - The emphasis configuration.
 * @returns The emphasis effect.
 */
gsap.registerEffect({
    name: "emphasize",
    defaults: { repeat: - 1, yoyo: true, extendTimeline: true },
    effect: (targets: gsap.TweenTarget, config: EmphasisConfig) => {
        const { blinkConfig, jumpConfig, scaleUpConfig } = config
        const emphasisTimeline = gsap.timeline()
        getMatchMediaInstance().add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context: gsap.Context) => {
            const { reducedMotion } = context.conditions as ReducedMotionCondition
            if (reducedMotion) {
                const doubleDuration = (config: gsap.TweenVars) => {
                    return { ...config, duration: config.duration ? config.duration * 2 : 1 }
                }
                emphasisTimeline.add(blink(targets, { ...doubleDuration(blinkConfig), ease: "power1.inOut" }))
                emphasisTimeline.add(scaleUp(targets, { ...doubleDuration(scaleUpConfig) }))
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
