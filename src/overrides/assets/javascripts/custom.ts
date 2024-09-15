import { hero_action, hero_shuffle } from "./hero"

const { pathname } = window.location

/**
 * Initiates the hero landing image shuffle process asynchronously.
 *
 * @returns A promise that resolves when the shuffle operation is complete.
 */
async function thereGoesMyHero() {
  void hero_shuffle.shuffle()
}

/**
 * Handles easter egg and other smaller actions on the hero landing image asynchronously.
 *
 * @returns A promise that resolves when the action operation is complete.
 */
async function lastActionHero() {
  void hero_action.action()
}

if (pathname === "/index.html" || pathname === "/") {
  void thereGoesMyHero()
  void lastActionHero()
}
