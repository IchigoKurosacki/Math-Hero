/**
 * Shared randomness helpers.
 *
 * `list.sort(() => Math.random() - 0.5)` reads like a shuffle but is not one:
 * the comparator is inconsistent, so the sort leaves a strong positional bias
 * (measured on V8: a four-element array puts its first item in slot 1 or 4 in
 * about two thirds of runs). Anything whose order the player can see — answer
 * options, encounter tables — must go through `shuffled`.
 */

/** Unbiased Fisher–Yates copy. */
export function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index--) {
    const pick = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}
