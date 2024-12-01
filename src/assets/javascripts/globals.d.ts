/* eslint-disable no-unused-vars */

/**
 * @copyright No rights reserved
 * @license Plain Unlicense (Public Domain)
 */

import type { Observable, Subject } from "rxjs"

declare global {

  /* ----------------------------------------------------------------------------
   * Types
   * ------------------------------------------------------------------------- */


  type T = Type["T"]
  type R = Type["R"]

  /** Type representing user interaction events. */
  type InteractionEvent = MouseEvent | TouchEvent

  /** Type representing an interaction handler function. */
  type InteractionHandler<T, R> = (event: Observable<T>) => Observable<R>

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
    readonly status: 'loading' | 'cycling' | 'paused' | 'error'
    readonly isVisible: boolean
    readonly currentTimeline: gsap.core.Timeline
    readonly currentImage: HTMLImageElement | null
    readonly isAtHome: boolean
    readonly activeImageIndex: number
    readonly orientation: 'portrait' | 'landscape'
    readonly optimalWidth: number
    readonly lastActiveTime: number
  }

  interface ImageDimensions {
    computedStyle: CSSStyleDeclaration
    naturalWidth: number
    naturalHeight: number
    boundingRect: DOMRect
  }

  interface Point {
    x: number
    y: number
  }

  interface TranslatableAreas {
    yTopRect: DOMRect
    yBottomRect: DOMRect
    xLeftRect: DOMRect
    xRightRect: DOMRect
    overflow: { left: number, right: number, top: number, bottom: number }
    visibleRect: DOMRect
    containerRect: DOMRect
    imageDimensions: ImageDimensions
    imageWidth: number
    imageHeight: number
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
    loadImages$: Observable<Promise<void>>
    cycle$: Observable<void>
    heroState: HeroStateManager
    start: () => Subscription
    stop: () => void
  }


  interface AssetTypeConfig {
    cacheable: boolean
    skipOnHome?: boolean
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

  interface ViewportOffset {
    x: number
    y: number
  }
  interface ViewportSize {
    width: number
    height: number
  }
  interface Viewport {
    offset: ViewportOffset
    size: ViewportSize
  }
  interface Keyboard {
    mode: KeyboardMode
    type: string
    claim(): void
  }

  /**
   * NOTE ON COMPONENTS (Window.component$)
   * see ComponentTypeMap for available components
   * can be used to mount and observe components
   * By default, they're all mounted in Material bundle.ts and available in component$
   * You can add components by using the data-md-component attribute on
   * the HTML element and then use  getComponentElements("componentName") from ~/external/components with your ObservationFunctions to create a custom observable.
   * bundle.ts gives plenty of examples on how to use component$ to mount and observe components
   */

  interface Window {
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
    subscriptionManager: SubscriptionManager
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

  // Transformation settings for images (not yet implemented)
  interface TransformationSettings {
    transition?: string // The CSS transition property for smooth changes.
    transitionBehavior?: string // The behavior of the transition (e.g., ease, linear).
    transform?: string // The CSS transform property to apply transformations.
    transformOrigin?: string // The origin point for the transformation.
    transformStyle?: string // The style of the transformation (e.g., flat, preserve-3d).
  }

}
