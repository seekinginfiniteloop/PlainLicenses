export type VideoWidth = 426 | 640 | 854 | 1280 | 1920 | 2560 | 3840

/**
 * @exports @type {VideoKey}
 * @description Image key for the Hero feature.
 * @type {string}
 */
export type VideoKey = typeof heroVideos[number]["imageName"]

/**
 * @exports @type {AnimationType}
 * @description Animation types for the Hero feature.
 * @type {string}
 */
export type AnimationType = "video" | "scrollTrigger"

/**
 * @exports @type {Animations}
 * @description Animations for the Hero feature.
 * @type {Map<symbol, gsap.core.Timeline>}
 */
export type Animations = Map<symbol, gsap.core.Timeline>

/**
 * @exports @type {HeroKey}
 * @description Hero key for the Hero feature.
 * @type {keyof HeroState}
 */
export type HeroKey = keyof HeroState

/**
 * @exports @type {HeroValue}
 * @description Hero value for the Hero feature.
 * @type {HeroState[HeroKey]}
 */
export type HeroValue = HeroState[HeroKey]
