
import { ImageLoader } from "./imageLoader"
import { AnimationManager } from "./imageAnimationManager"
import { ImageCycler } from "./imageCycler"
import { isPageVisible$, watchMediaQuery } from "./utils/eventHandlers"
import { Transform2D, clamp, lerp } from "./transformUtils"
import { logger } from "~/log"
import { HeroImage, heroImages } from "./heroImageData"
import { getAssets } from "~/utils/cache"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

// Initialize GSAP plugins if any
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Select the parallax layer
const parallaxLayer = document.getElementById("parallax-hero-image-layer")
if (!parallaxLayer) {
  logger.error("Parallax layer not found")
  throw new Error("Parallax layer not found")
}

// Initialize ImageLoader and AnimationManager
const imageLoader = new ImageLoader(getAssets)
const animationManager = new AnimationManager(parallaxLayer)

// Initialize ImageCycler
const imageCycler = new ImageCycler(imageLoader, animationManager, parallaxLayer, 20000)

// Handle visibility changes
const visibilitySub = isPageVisible$.subscribe(isVisible => {
  if (isVisible) {
    imageCycler.startCycle()
  } else {
    imageCycler.stopCycle()
  }
})

// TODO
// Handle orientation and resize
const orientationSub = watchMediaQuery("(orientation: portrait)").subscribe(isPortrait => {
  // Adjust any necessary styles or parameters based on orientation
  // For example, recalculate transformations if needed
})

// Initial cycle start if the page is visible and at home
if (!document.hidden) {
  imageCycler.startCycle()
}

// Cleanup on unload
window.addEventListener("unload", () => {
  visibilitySub.unsubscribe()
  orientationSub.unsubscribe()
  imageCycler.dispose()
})
