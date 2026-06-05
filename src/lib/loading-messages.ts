/**
 * Centralized football-themed loading messages.
 *
 * Used by:
 *   - LoginForm: cycles through the array every 3 s during auth
 *   - Button:    picks one at random for generic loading states
 *
 * To add more messages, append to LOADING_MESSAGES. Everything else updates automatically.
 */

export const LOADING_MESSAGES: readonly string[] = [
  "Pagandole al Arbitro..",
];

/** Returns a random message from the list. */
export function getRandomLoadingMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}
