import gsap from 'gsap'
import { getDistanceToViewport, getMatchMediaInstance } from './utils'
import { ReducedMotionCondition } from './types'

const fade = (targets: gsap.TweenTarget,
    direction: number,
    duration: number = 0.5,
    delay: number = 0,
    stagger?: gsap.StaggerVars,
    ease: gsap.EaseString | gsap.EaseFunction = "power1.inOut",
    out = false) => {
    const media = getMatchMediaInstance()
    media.add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        const { reducedMotion } = context.conditions as ReducedMotionCondition
        if (reducedMotion) {
          return gsap.fromTo(targets, { autoAlpha: out ? 1 : 0 }, { autoAlpha: out ? 0 : 1, duration, delay, ease })
        } else {
          if (direction) {
            return gsap.fromTo(targets, {
                    autoAlpha: out ? 1 : 0,
                    yPercent: out ? 0 : direction * 50
                }, {
                    autoAlpha: out ? 0 : 1,
                    yPercent: out ? direction * 50 : 0,
                    duration, delay, stagger, ease
                })
          }
          return gsap.fromTo(targets, { autoAlpha: out ? 1 : 0, yPercent: out ? 0 : 50}, { autoAlpha: out ? 0 : 1, yPercent: out ? 50 : 0, duration, delay, stagger, ease })
        }
    })
}

const blink = (
    targets: gsap.TweenTarget,
    repeat: number = -1,
    yoyo: boolean = true,
    delay: number = 2,
    duration: number = 0.5,
    ease: gsap.EaseString | gsap.EaseFunction | undefined = "power4.in"
) => {
    return gsap.to(targets, { autoAlpha: 0, delay, duration, ease, repeat, yoyo})
}

const jump = (
    targets: gsap.TweenTarget,
    modifiers: {},
    duration: number = 0.5,
    yoyoEase: gsap.EaseString | gsap.EaseFunction = "bounce",
    repeat: number = -1,
    ease: gsap.EaseString | gsap.EaseFunction = "elastic",
) => {
    return gsap.to(targets, {
        y: -50,
        duration,
        ease,
        repeat,
        yoyo: true,
        yoyoEase,
        modifiers
    }
    )}

const scaleUp = (
    targets: gsap.TweenTarget,
    scale: number = 1.5,
    yoyo: boolean = true,
    repeat: number = -1,
    delay: number = 2,
    duration: number = 0.5,
    ease: gsap.EaseString | gsap.EaseFunction = "elastic"
) => {
    return gsap.to(targets, { scale, delay, duration, ease, repeat, yoyo })
}

gsap.registerEffect({
    name: "emphasisReminder",
    extendTimeline: true,
    effect: (targets: gsap.TweenTarget, config: gsap.TimelineVars) => {
        const emphasisTimeline = gsap.timeline(
            // default values... override by passing in the config object
            { repeat: -1, yoyo: true, delay: 3, extendTimeline: true, ...config })
        const targetsArray = gsap.utils.toArray(targets).map((target) => target instanceof Element ? target : (typeof target === "string" ? document.querySelector(target) : null)).filter((target) => target !== null)
        const distances = targetsArray.map((target) => {
              const distance = getDistanceToViewport(target)
              return gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25)
        })
        const media = getMatchMediaInstance().add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
            const { reducedMotion } = context.conditions as ReducedMotionCondition
            if (reducedMotion) {
              emphasisTimeline.add(blink(targets, -1, true, 5, 1, "power1.inOut"))
            }
        })


        return gsap.timeline({
            repeat: config.repeat,
            yoyo: config.yoyo,
            delay: config.delay
        })
            .add(blink(targets))
            .add(jump(targets))
            .add(scaleUp(targets))
    }
})
