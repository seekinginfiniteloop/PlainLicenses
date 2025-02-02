/**
 * @copyright No rights reserved
 * @license Plain Unlicense (Public Domain)
 */

import gsap from "gsap"
import type { Observable, Subject } from "rxjs"
import { ImageTransformCalculator, ScaleCalculator } from "./vectorcalc"
import { extend } from "tablesort"

declare global {
  /* ----------------------------------------------------------------------------
   * Types
   * ------------------------------------------------------------------------- */

  type T = Type["T"]
  type R = Type["R"]

  type PageLocation = "all" | "home" | "licenses" | "helpingIndex"

  type Component<T extends {} = {}, U extends HTMLElement = HTMLElement> = T & {
    ref: U /* Component reference */
  }
  type KeyboardMode = "global" /* Global */ | "search" /* Search is open */

  /* ----------------------------------------------------------------------------
   * Interfaces
   * ------------------------------------------------------------------------- */

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
    particlePool?: HTMLDivElement[]
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
