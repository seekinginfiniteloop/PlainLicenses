import gsap from 'gsap'
import { getDistanceToViewport, getMatchMediaInstance } from './utils'

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
    y: number = 5,
    duration: number = 0.5,
    yoyo: boolean = true,
    repeat: number = -1,
    delay: number = 2,
    ease: gsap.EaseString | gsap.EaseFunction = "elastic"
) => {
    return gsap.to(targets, {
        delay, duration, ease, repeat, yoyo,
        modifiers: { y }
     })
}

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
        const emphasisTimeline = gsap.timeline({ repeat: config.repeat, yoyo: config.yoyo, delay: config.delay, extendTimeline: true })
        const targetsArray = Array.isArray(targets) ? targets : [targets]
        const distances = targetsArray.map((target) => {
            const tgt = target instanceof Element ? target : document.querySelector(target)
            const distance = tgt ? getDistanceToViewport(tgt) : 10
            return gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25);})
        const lowerMotion = emphasisTimeline
            emphasisTimeline.vars = { ... emphasisTimeline.vars, delay: 7, repeat: 2, yoyo: false }
            emphasisTimeline.add(["reducedMotionBlink", blink(targets, 2, true, 1, 1, "power4.in")], 0)
                .add(["reducedMotionJump", jump(targets, 5, 2, true, 1, 5, "elastic")], ">")
        const locoMotion = emphasisTimeline
            .add(["blinkEmphasis", blink(targets, 3, true, 0.2, 0.2, "power4.in")], 0)
            .add(["jumpEmphasis", jump(targets, , 0.5, true, 1, 0.5, "elastic")], ">")


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
