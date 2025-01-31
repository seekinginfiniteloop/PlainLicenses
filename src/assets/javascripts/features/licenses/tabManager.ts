/**
 * @module TabManager
 *
 * @description Coordinates tab interactions with corresponding link icons and labels
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import {
  Observable,
  Subscription,
  debounceTime,
  filter,
  fromEvent,
  map,
  merge,
  share,
  tap,
} from "rxjs"
import { ChildTabs, TabElement, TabState, TabStateType } from "./types"
import { logger, preventDefault } from "~/utils"

/**
 * @description
 * - Dynamically initializes and manages tab elements
 * - Handles complex interaction states (hover, focus, selection) for tabs, linking behaviors to ARIA roles and states between elements
 * - Provides reactive event handling using RxJS
 *
 * @property {TabElement[]} tabs - Collection of initialized tab elements
 * @property {Subscription} subscription - RxJS subscription for managing tab interactions
 *
 * @method init - Initializes tab styles and sets up interaction streams
 * @method cleanup - Unsubscribes from event streams and performs cleanup
 *
 * @see {@link https://rxjs.dev/} RxJS Documentation
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role} ARIA Tab Role
 */
export class TabManager {
  private readonly tabs: TabElement[]

  private readonly childTabs: ChildTabs[]

  private readonly selectors = {
    inputs: '.tabbed-set input[type="radio"]',
    iconPrefix: "#icon-",
  }

  private readonly disclaimerTabSelectors = {
    inputs: "#not-advice-warning-checkbox, #not-official-warning-checkbox",
    labelAnchors: "#not-advice-warning-label, #not-official-warning-label",
  }

  public subscription: Subscription = new Subscription()

  /**
   * @description Initializes tab elements and sets up interactions
   */
  public constructor() {
    this.tabs = this.initializeTabs()
    this.childTabs = this.initializeChildTabs()
    this.init()
  }

  /**
   * @returns {TabElement[]} Collection of initialized tab elements
   * @description Initializes tab elements by querying the DOM for input, label, and icon elements
   */
  private initializeTabs(): TabElement[] {
    const inputs = Array.from(document.querySelectorAll(this.selectors.inputs))

    return inputs
      .map((input) => {
        const { id } = input
        const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement
        const elements = {
          input: input as HTMLInputElement,
          label,
          labelAnchor: label.querySelector("a") as HTMLAnchorElement,
          iconAnchor: document.querySelector(
            `${this.selectors.iconPrefix}${id}`,
          ) as HTMLAnchorElement,
          iconSVG: document
            .querySelector(`${this.selectors.iconPrefix}${id}`)
            ?.querySelector("svg") as SVGElement,
          contentElement: document.querySelector(`#${id}`) as HTMLDivElement,
          tablistElement: document.querySelector(".tabbed-set") as HTMLDivElement,
        }

        // Only include if all elements are found
        return Object.values(elements).every((el) => el) ? elements : null
      })
      .filter((tab): tab is TabElement => tab !== null)
  }

  private initializeChildTabs(): ChildTabs[] {
    const inputs = Array.from(document.querySelectorAll(this.disclaimerTabSelectors.inputs))
    const labels = Array.from(document.querySelectorAll(this.disclaimerTabSelectors.labelAnchors))

    return inputs
      .map((input) => {
        const { id } = input
        const idPrefix = id.split("-")[1] // either 'advice' or 'official'
        const label = labels.find((label) => label.id.includes(idPrefix)) as HTMLAnchorElement
        const elements = {
          labelAnchor: label,
          input: input as HTMLInputElement,
        }

        return Object.values(elements).every((el) => el) ? elements : null
      })
      .filter((tab): tab is ChildTabs => tab !== null)
  }

  private setAria() {
    this.tabs.forEach((tab) => {
      const { contentElement, input, labelAnchor, label, iconAnchor, iconSVG, tablistElement } = tab
      tablistElement.setAttribute("role", "tablist")
      contentElement.setAttribute("role", "tabpanel")
      contentElement.setAttribute(
        "aria-labelledby",
        `${label.id || labelAnchor.id} ${iconAnchor.id}`,
      )
      input.setAttribute("aria-hidden", "true")
      labelAnchor.setAttribute("role", "tab")
      labelAnchor.setAttribute("aria-selected", input.checked ? "true" : "false")
      labelAnchor.setAttribute("aria-controls", contentElement.id)
      labelAnchor.setAttribute("tabindex", labelAnchor.href === "#reader" ? "0" : "-1")
      iconSVG.setAttribute("role", "button")
      iconAnchor.setAttribute("role", "tab")
      iconAnchor.setAttribute("aria-selected", input.checked ? "true" : "false")
      iconAnchor.setAttribute("aria-controls", contentElement.id)
    })
  }

  private toggleAriaSelected(tabEls: TabElement[] | ChildTabs[]) {
    const checkedState = tabEls.map((tab) => tab.input.checked)
    const anchors = tabEls.map((tab) => {
      if ("iconAnchor" in tab) {
        return [tab.labelAnchor, tab.iconAnchor]
      }
      return [tab.labelAnchor]
    })
    checkedState.forEach((checked, index) => {
      anchors[index].forEach((anchor) => {
        anchor.setAttribute("aria-selected", checked ? "true" : "false")
      })
    })
  }

  /**
   * @param {TabElement} tab - Tab element to style
   * @param {TabState} state - Tab state object
   * @description Styles tab elements based on state
   */
  private styleTab(tab: TabElement, { isSelected, state }: TabState): void {
    const { label, iconAnchor, iconSVG } = tab
    const fillColor = state === "normal" ? "" : "var(--hover-color)"
    const selectedColor = "var(--selected-color)"

    // Update icon state
    iconAnchor.classList.toggle("selected", isSelected)
    // Update colors
    iconSVG.style.fill = isSelected ? selectedColor : fillColor
    label.style.color = isSelected ? selectedColor : fillColor
  }

  /**
   * @returns {Observable<void>} Observable for tab interactions
   * @description Sets up interaction streams for tab elements
   */
  private setupInteractions(): Observable<void> {
    // Create event streams
    const createEventStream = (elements: TabElement[], eventName: string) => {
      const streams = elements.flatMap(({ label, iconAnchor }) => [
        fromEvent(label, eventName).pipe(
          map(() => ({ id: label.getAttribute("for")!, event: eventName })),
        ),
        fromEvent(iconAnchor, eventName).pipe(
          map(() => ({ id: iconAnchor.id.replace("icon-", ""), event: eventName })),
        ),
      ])
      return merge(...streams).pipe(share())
    }

    // Map events to states
    const eventStateMap: Record<string, TabStateType> = {
      mouseenter: "hover",
      mouseleave: "normal",
      focus: "focus",
      "focus-visible": "focus-visible",
      blur: "normal",
    }

    // Setup event streams
    const events = ["mouseenter", "mouseleave", "focus", "focus-visible", "blur"]
    const interactionStreams = events.map((event) => createEventStream(this.tabs, event))

    // Handle icon clicks
    const iconClicks = this.tabs.map(({ iconAnchor, input, labelAnchor }) =>
      merge(fromEvent(labelAnchor, "click"), fromEvent(iconAnchor, "click")).pipe(
        tap(() => {
          preventDefault
          if (!input.checked) {
            input.checked = true
            this.toggleAriaSelected(this.tabs)

            input.dispatchEvent(new Event("change"))
          }
        }),
        map(() => ({ id: input.id, event: "click" })),
      ),
    )

    const childClicks = this.childTabs.map(({ input, labelAnchor }) =>
      fromEvent(labelAnchor, "click").pipe(
        tap(() => {
          preventDefault
          if (!input.checked) {
            input.checked = true
            this.toggleAriaSelected(this.childTabs)
            input.dispatchEvent(new Event("change"))
          }
        }),
        map(() => ({ id: input.id, event: "click" })),
      ),
    )

    // Handle tab selection
    const selections = this.tabs.map(({ input }) =>
      fromEvent(input, "change").pipe(
        map(() => input.id),
        filter((id) => !!id),
      ),
    )

    // Combine all streams ... but don't cross them
    return merge(...interactionStreams, ...iconClicks, ...childClicks, ...selections).pipe(
      filter(
        (event): event is { id: string; event: string } =>
          typeof event === "object" && "id" in event && "event" in event,
      ),
      debounceTime(30),
      tap((event: { id: string; event: string }) => {
        const { id, event: eventName } = event
        const tab = this.tabs.find((t) => t.input.id === id)
        if (tab) {
          this.styleTab(tab, {
            isSelected: tab.input.checked,
            state: eventStateMap[eventName] || "normal",
          })
        }
      }),
      map(() => void 0),
    )
  }

  /**
   * @description Initializes tab styles and sets up interaction streams
   */
  private init() {
    logger.info("Initializing license tabs")
    this.setAria()
    // Set initial styles
    this.tabs.forEach((tab) => {
      this.styleTab(tab, { isSelected: tab.input.checked, state: "normal" })
    })
    this.subscription = this.setupInteractions().subscribe({
      error: (err) => logger.error("Error setting up license tabs:", err),
    })
    const allAnchors: HTMLAnchorElement[] = []
    this.tabs.forEach((tab) => {
      allAnchors.push(tab.labelAnchor, tab.iconAnchor)
    })
    this.childTabs.forEach((tab) => {
      allAnchors.push(tab.labelAnchor)
    })
    allAnchors.forEach((anchor) => {
      anchor.addEventListener("click", preventDefault)
    })
  }

  /**
   * @description Unsubscribes from event streams and performs cleanup
   */
  public cleanup(): void {
    logger.info("Cleaning up license tabs")
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
