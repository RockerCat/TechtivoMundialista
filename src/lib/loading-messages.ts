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
  "Cargando Chiste malo de Zorro...",
  "Maurice Organizando Papeles...",
  "Despertando a Augusto...",
  "Brindando con Hardouin...",
  "Hasta el Sol de los Venaos...",
  "Para dormir queda la eternidad...",
  "Buscandole novia a Zorro...",
  "Comprando en Fox Original Sports...",
  "Un Burrito de Chipotle?...",
  "En La Superior nos vemos!...",
  "Y si mejor jugamos Padelazzo?...",
  "Que buenos recuerdos de La Penúltima...",
  "Papaje?...",
  "Buscando Excusas para Maurice...",
  "Donde entre es GOL!...",
  "Como dice Hardouin: 'Es con su plata?'...",
];

/** Returns a random message from the list. */
export function getRandomLoadingMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}
