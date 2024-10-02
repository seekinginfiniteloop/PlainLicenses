import { Observable, Subject } from "rxjs"

declare global {
  interface ViewPortOffset {
    top: number
    left: number
  }
  interface ViewPortSize {
    width: number
    height: number
  }
  interface ViewPort {
    offset: ViewPortOffset
    size: ViewPortSize
  }
  type KeyboardMode = "global" /* Global */ | "search" /* Search is open */

  interface Keyboard {
    mode: KeyboardMode
    type: string
    claim(): void
  }

  export type ComponentType =
    | "announce" /* Announcement bar */
    | "container" /* Container */
    | "consent" /* Consent */
    | "content" /* Content */
    | "dialog" /* Dialog */
    | "header" /* Header */
    | "header-title" /* Header title */
    | "header-topic" /* Header topic */
    | "main" /* Main area */
    | "outdated" /* Version warning */
    | "palette" /* Color palette */
    | "progress" /* Progress indicator */
    | "search" /* Search */
    | "search-query" /* Search input */
    | "search-result" /* Search results */
    | "search-share" /* Search sharing */
    | "search-suggest" /* Search suggestions */
    | "sidebar" /* Sidebar */
    | "skip" /* Skip link */
    | "source" /* Repository information */
    | "tabs" /* Navigation tabs */
    | "toc" /* Table of contents */
    | "top" /* Back-to-top button */

  /**
   * Component
   *
   * @template T - Component type
   * @template U - Reference type
   */
  export type Component<
    T extends {} = {},
    U extends HTMLElement = HTMLElement
  > = T & {
    ref: U /* Component reference */
  }

  /* ----------------------------------------------------------------------------
   * Helper types
   * ------------------------------------------------------------------------- */

  /**
   * Component type map
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

/** NOTE ON COMPONENTS (Window.component$)
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
    viewport$: Observable<ViewPort>
    tablet$: Observable<boolean> // (min-width: 960px)
    screen$: Observable<boolean> // (min-width: 1220px)
    print$: Observable<boolean>
    alert$: Subject<string> // clipboard.js integration
    progress$: Subject<number> // progress indicator
    component$: Observable<CustomEvent>
  }

  interface ScriptOptions {
    src: string
    type?:
      | "module"
      | "importmap"
      | "speculationrules"
      | "text/javascript"
      | string
    fetchPriority?: "high" | "low" | "auto"
    async?: boolean
    blocking?: boolean
    crossorigin?: "" | "anonymous" | "use-credentials"
    defer?: boolean
    integrity?: string
    noModule?: boolean
    attributionSource?: string
    referrerPolicy?:
      | ""
      | "no-referrer"
      | "no-referrer-when-downgrade"
      | "origin"
      | "origin-when-cross-origin"
      | "same-origin"
      | "strict-origin"
      | "strict-origin-when-cross-origin"
      | "unsafe-url"
  }
}
