/** A piece of a name, in bold when it is the part typed (Ecrans › E-02, saisie). */
export interface NamePart {
  text: string;
  isMatch: boolean;
}

/** One character, case and accents aside: « É » and « e » are one. */
const loose = (character: string) =>
  character.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');

/**
 * `name` cut around the first place it holds `typed`, case and accents aside, so that the part
 * typed reads in bold; the whole name, plain, when it does not hold it.
 */
export function highlightParts(name: string, typed: string): NamePart[] {
  const needle = [...typed.trim()].map(loose).join('');
  const characters = [...name];
  const looseCharacters = characters.map(loose);
  if (needle) {
    for (let start = 0; start < characters.length; start += 1) {
      let matched = '';
      let end = start;
      while (end < characters.length && matched.length < needle.length) {
        matched += looseCharacters[end];
        end += 1;
      }
      if (matched === needle) {
        return [
          { text: characters.slice(0, start).join(''), isMatch: false },
          { text: characters.slice(start, end).join(''), isMatch: true },
          { text: characters.slice(end).join(''), isMatch: false },
        ].filter((part) => part.text.length > 0);
      }
    }
  }
  return [{ text: name, isMatch: false }];
}
