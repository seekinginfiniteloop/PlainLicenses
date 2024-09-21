import { Observable } from "rxjs"

import { action$ } from "~/hero/animation"
import { shuffle } from "~/hero/imageshuffle"

/**
 * Initiates the hero landing image shuffle process asynchronously.
 *
 * @returns A promise that resolves when the shuffle operation is complete.An Observable that initiates the hero shuffle.
 */
function thereGoesMyHero(): Observable<void> {
  return shuffle()
}

/**
 * Handles easter egg and other smaller actions on the hero landing image asynchronously.
 *
 * @returns An Observable that initiates the hero action.
 */
function lastActionHero() {
  return action$()
}

export const initializeHero = (): void =>{
  lastActionHero().subscribe()
  thereGoesMyHero().subscribe()
}
