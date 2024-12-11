/* eslint-disable no-unused-vars */

/**
 * @copyright No rights reserved
 * @license Plain Unlicense (Public Domain)
 */

import type { Observable, Subject } from "rxjs"
import { ImageTransformCalculator, ScaleCalculator } from "./utils/vectorcalc"
import { extend } from "tablesort"

declare global {

  /* ----------------------------------------------------------------------------
   * Types
   * ------------------------------------------------------------------------- */

  type PageConfig = {
    matcher: (url: URL) => boolean
    location: PageLocation
    observables: Observable<any>[]
  }

  type T = Type["T"]
  type R = Type["R"]

  type PageLocation = "all" | "home" | "licenses" | "helpingIndex"

  type Component<
    T extends {} = {},
    U extends HTMLElement = HTMLElement
  > = T & {
    ref: U /* Component reference */
  }
  type KeyboardMode = "global" /* Global */ | "search" /* Search is open */

  /* ----------------------------------------------------------------------------
   * Interfaces
   * ------------------------------------------------------------------------- */

  // Image state management
  interface HeroState {
    status: 'loading' | 'cycling' | 'paused' | 'error'
    isVisible: boolean
    currentTimeline: Observable<gsap.core.Timeline>
    currentImage: HTMLImageElement | null
    isAtHome: boolean
    headerHeight: number
    viewportDimensions: { width: number, height: number }
    activeImageIndex: number
    orientation: 'portrait' | 'landscape'
    readonly optimalWidth: number
    lastActiveTime: number
    preloadedImage: boolean
  }

  interface ScrollTargets {
    target: Element
    wayPoint: Element
    wayPointPause: number
    duration: number
  }

  interface ImageMetadata {
    readonly loadTime: number
    displayCount: number
    readonly width: number
    readonly actualWidth: number
  }

  interface ImageCycler {
    loadImages$?: Observable<void>
    cycle$: Observable<void>
    heroState: HeroStateManager
    start: () => Subscription
    stop: () => void
  }

  interface AssetTypeConfig {
    cacheable: boolean
    contentType?: string
  }

  interface CacheConfig {
    CACHE_NAME: string
    ROOT_URL: string
    ASSET_TYPES: Record<string, AssetTypeConfig>
  }

  interface TabElement {
    input: HTMLInputElement
    label: HTMLLabelElement
    iconAnchor: HTMLAnchorElement
    iconSVG: SVGElement
  }

  interface Keyboard {
    mode: KeyboardMode
    type: string
    claim(): void
  }

  /**
   * ======================
   ** FUN WITH POINT
   ** ...or, how to make a
   ** ...or, how to make a
   **       `point`
   *========================*
   */

  interface Point {
    x: number
    y: number
  }

  interface ImageSize {
    width: number
    height: number
  }

  interface ViewportOffset {
    x: number
    y: number
  }

  interface ViewportSize {
    width: number
    height: number
  }

  interface TranslationBounds {
    x: { min: number, max: number }
    y: { min: number, max: number }
  }

  interface FocalPoint {
    x: number
    y: number
  }

  interface FocalPoints {
    main: {
      x: number
      y: number
    }
    secondary: {
      x: number
      y: number
    }
  }

  interface FocalPointBounds {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }

  interface OverflowRects {
    top: DOMRect
    right: DOMRect
    bottom: DOMRect
    left: DOMRect
  }

  interface TranslationPotential {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }

  interface SafeZone {
    x: { min: number, max: number }
    y: { min: number, max: number }
    scale?: number
  }

  interface Viewport {
    offset: ViewportOffset
    size: ViewportSize
  }

  interface CssCalculations {
    scale: number
    scaledDimensions: {
      width: number // min-width
      height: number // min-height
    }
    actualOverflow: {
      horizontal: number
      vertical: number
    }
  }

  interface ComputedImageDimensions {
    width: number
    height: number
    aspectRatio: number
    orientation: 'portrait' | 'landscape' | 'square'
  }

  interface ImageDimensions {
    // computedStyle is a key-value pair of CSS properties and their values
    // it is NOT a CSSStyleDeclaration object because it is not live
    computedStyle: { [key: string]: string }
    naturalWidth: number
    naturalHeight: number
    boundingRect: DOMRect
  }

  interface AnimationWaypoint {
    position: Point
    transform: Mat3
    duration: number  // portion of total duration
  }

  interface ScaleResults {
    scale: number
    scaledDimensions: ImageSize
    actualOverflow: ImageSize
    bounds: TranslationBounds
    transforms:
    {
      start: Mat3
      end: Mat3
    }
  }


  /**
   *! NOTE ON COMPONENTS (Window.component$)
   * see ComponentTypeMap for available components
   * can be used to mount and observe components
   * By default, they're all mounted in Material bundle.ts and available in component$
   * You can add components by using the data-md-component attribute on
   * the HTML element and then use  getComponentElements("componentName") from ~/external/components with your ObservationFunctions to create a custom observable.
   *
   * bundle.ts gives plenty of examples on how to use component$ to mount and observe components
   */

  interface CustomWindow extends Window {
    document$: Observable<Document>
    location$: Subject<URL>
    target$: Observable<HTMLElement>
    keyboard$: Observable<Keyboard>
    viewport$: Observable<Viewport>
    tablet$: Observable<boolean> // (min-width: 960px)
    screen$: Observable<boolean> // (min-width: 1220px)
    print$: Observable<boolean>
    alert$: Subject<string> // clipboard.js integration
    progress$: Subject<number> // progress indicator
    component$: Observable<CustomEvent>
  }

  /**
   * Components that can be observed under the component$ observable
   */
  interface ComponentTypeMap {
    announce: HTMLElement /* Announcement bar */
    container: HTMLElement /* Container */
    consent: HTMLElement /* Consent */
    content: HTMLElement /* Content */
    dialog: HTMLElement /* Dialog */
    header: HTMLElement /* Header */
    "header-title": HTMLElement /* Header title */
    "header-topic": HTMLElement /* Header topic */
    main: HTMLElement /* Main area */
    outdated: HTMLElement /* Version warning */
    palette: HTMLElement /* Color palette */
    progress: HTMLElement /* Progress indicator */
    search: HTMLElement /* Search */
    "search-query": HTMLInputElement /* Search input */
    "search-result": HTMLElement /* Search results */
    "search-share": HTMLAnchorElement /* Search sharing */
    "search-suggest": HTMLElement /* Search suggestions */
    sidebar: HTMLElement /* Sidebar */
    skip: HTMLAnchorElement /* Skip link */
    source: HTMLAnchorElement /* Repository information */
    tabs: HTMLElement /* Navigation tabs */
    toc: HTMLElement /* Table of contents */
    top: HTMLAnchorElement /* Back-to-top button */
  }
}
