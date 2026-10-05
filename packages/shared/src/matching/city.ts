/** Canonical city names for Profile Setup. The dialog's quick-pick chips, free
 *  text and trainers' `home_area` all go through here so "台中", "臺中市" and
 *  "Taichung City" are one city, whatever language the user's UI is in. */

export type CitySlug =
  | 'taichung'
  | 'taipei'
  | 'newTaipei'
  | 'taoyuan'
  | 'hsinchu'
  | 'tainan'
  | 'kaohsiung';

/** The value stored in `users.home_area` for a known city. */
export const CITY_CANONICAL: Record<CitySlug, string> = {
  taichung: 'Taichung',
  taipei: 'Taipei',
  newTaipei: 'New Taipei',
  taoyuan: 'Taoyuan',
  hsinchu: 'Hsinchu',
  tainan: 'Tainan',
  kaohsiung: 'Kaohsiung',
};

export const CITY_SLUGS = Object.keys(CITY_CANONICAL) as CitySlug[];

/** Lower-case, space-free aliases. "New Taipei" is listed before "Taipei" so the
 *  longer name wins. */
const ALIASES: ReadonlyArray<readonly [CitySlug, readonly string[]]> = [
  ['newTaipei', ['newtaipei', '新北']],
  ['taichung', ['taichung', '台中', '臺中']],
  ['taipei', ['taipei', '台北', '臺北']],
  ['taoyuan', ['taoyuan', '桃園']],
  ['hsinchu', ['hsinchu', '新竹']],
  ['tainan', ['tainan', '台南', '臺南']],
  ['kaohsiung', ['kaohsiung', '高雄']],
];

function squash(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/** The known city a free-text place mentions ("台北市信義區", "Da'an, Taipei"),
 *  or null. */
export function cityKey(text: string | null | undefined): CitySlug | null {
  if (!text) return null;
  const s = squash(text);
  for (const [slug, aliases] of ALIASES) {
    if (aliases.some((a) => s.includes(a))) return slug;
  }
  return null;
}

/** What to save as the user's city: a known city becomes its canonical name;
 *  anything else is only tidied (whitespace collapsed, words capitalised). */
export function normalizeCity(input: string | null | undefined): string {
  const tidy = (input ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!tidy) return '';
  const key = cityKey(tidy);
  if (key) return CITY_CANONICAL[key];
  return tidy.replace(/\b([a-z])([a-z]*)/g, (_, f: string, rest: string) => f.toUpperCase() + rest);
}
