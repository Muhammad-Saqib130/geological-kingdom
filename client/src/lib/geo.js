// Countries (ISO 3166-1 alpha-2) named in English via Intl, Pakistan first.
const CODES = 'AE AF AL AM AO AR AT AU AZ BA BD BE BG BH BN BR BY CA CH CL CN CO CY CZ DE DK DZ EE EG ES ET FI FJ FR GB GE GH GR HK HR HU ID IE IL IN IQ IR IS IT JO JP KE KG KH KR KW KZ LB LK LT LU LV MA MM MN MO MT MU MV MX MY NG NL NO NP NZ OM PE PH PK PL PT QA RO RS RU SA SE SG SI SK TH TJ TM TN TR TW TZ UA UG US UZ VN YE ZA ZW'.split(' ')

const names = new Intl.DisplayNames(['en'], { type: 'region' })
export const countryName = (code) => {
  try {
    return names.of(code) ?? code
  } catch {
    return code
  }
}

export const COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
  ...CODES.filter((c) => c !== 'PK')
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name)),
]

export const PK_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
]
