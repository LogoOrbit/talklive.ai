// ISO 3166-1 alpha-2 country list (code -> English name) used by the country
// filter, the owner dashboard and everywhere a geo lookup yields only a code.
//
// This is the complete list on purpose. It used to hold 42 countries, which
// meant most of the world could neither be preferred nor avoided in the match
// filters - Finland, Switzerland, Austria, Belgium, Czechia, Chile, Morocco,
// Nepal and Vietnam among them - and anyone the server geolocated outside
// those 42 was shown a bare two-letter code instead of a country name.
//
// In the browser, i18n.js prefers Intl.DisplayNames so names appear in the
// user's own language; this list is the fallback and the search index. On the
// server it is the only source, so dashboard rows and report emails read
// "Nepal" rather than "NP".
const COUNTRIES = {
  AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan",
  AG: "Antigua & Barbuda", AI: "Anguilla", AL: "Albania", AM: "Armenia",
  AO: "Angola", AQ: "Antarctica", AR: "Argentina", AS: "American Samoa",
  AT: "Austria", AU: "Australia", AW: "Aruba", AX: "Åland Islands",
  AZ: "Azerbaijan", BA: "Bosnia & Herzegovina", BB: "Barbados",
  BD: "Bangladesh", BE: "Belgium", BF: "Burkina Faso", BG: "Bulgaria",
  BH: "Bahrain", BI: "Burundi", BJ: "Benin", BL: "St. Barthélemy",
  BM: "Bermuda", BN: "Brunei", BO: "Bolivia", BQ: "Caribbean Netherlands",
  BR: "Brazil", BS: "Bahamas", BT: "Bhutan", BV: "Bouvet Island",
  BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada",
  CC: "Cocos (Keeling) Islands", CD: "Congo - Kinshasa",
  CF: "Central African Republic", CG: "Congo - Brazzaville",
  CH: "Switzerland", CI: "Côte d’Ivoire", CK: "Cook Islands", CL: "Chile",
  CM: "Cameroon", CN: "China", CO: "Colombia", CQ: "Sark", CR: "Costa Rica",
  CU: "Cuba", CV: "Cape Verde", CW: "Curaçao", CX: "Christmas Island",
  CY: "Cyprus", CZ: "Czechia", DE: "Germany", DJ: "Djibouti", DK: "Denmark",
  DM: "Dominica", DO: "Dominican Republic", DY: "Benin", DZ: "Algeria",
  EC: "Ecuador", EE: "Estonia", EG: "Egypt", EH: "Western Sahara",
  ER: "Eritrea", ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji",
  FK: "Falkland Islands", FM: "Micronesia", FO: "Faroe Islands", FR: "France",
  GA: "Gabon", GB: "United Kingdom", GD: "Grenada", GE: "Georgia",
  GF: "French Guiana", GG: "Guernsey", GH: "Ghana", GI: "Gibraltar",
  GL: "Greenland", GM: "Gambia", GN: "Guinea", GP: "Guadeloupe",
  GQ: "Equatorial Guinea", GR: "Greece",
  GS: "South Georgia & South Sandwich Islands", GT: "Guatemala", GU: "Guam",
  GW: "Guinea-Bissau", GY: "Guyana", HK: "Hong Kong SAR China",
  HM: "Heard & McDonald Islands", HN: "Honduras", HR: "Croatia", HT: "Haiti",
  HU: "Hungary", HV: "Burkina Faso", ID: "Indonesia", IE: "Ireland",
  IL: "Israel", IM: "Isle of Man", IN: "India",
  IO: "British Indian Ocean Territory", IQ: "Iraq", IR: "Iran", IS: "Iceland",
  IT: "Italy", JE: "Jersey", JM: "Jamaica", JO: "Jordan", JP: "Japan",
  KE: "Kenya", KG: "Kyrgyzstan", KH: "Cambodia", KI: "Kiribati",
  KM: "Comoros", KN: "St. Kitts & Nevis", KP: "North Korea",
  KR: "South Korea", KW: "Kuwait", KY: "Cayman Islands", KZ: "Kazakhstan",
  LA: "Laos", LB: "Lebanon", LC: "St. Lucia", LI: "Liechtenstein",
  LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania",
  LU: "Luxembourg", LV: "Latvia", LY: "Libya", MA: "Morocco", MC: "Monaco",
  MD: "Moldova", ME: "Montenegro", MF: "St. Martin", MG: "Madagascar",
  MH: "Marshall Islands", MK: "North Macedonia", ML: "Mali",
  MM: "Myanmar (Burma)", MN: "Mongolia", MO: "Macao SAR China",
  MP: "Northern Mariana Islands", MQ: "Martinique", MR: "Mauritania",
  MS: "Montserrat", MT: "Malta", MU: "Mauritius", MV: "Maldives",
  MW: "Malawi", MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia",
  NC: "New Caledonia", NE: "Niger", NF: "Norfolk Island", NG: "Nigeria",
  NH: "Vanuatu", NI: "Nicaragua", NL: "Netherlands", NO: "Norway",
  NP: "Nepal", NR: "Nauru", NU: "Niue", NZ: "New Zealand", OM: "Oman",
  PA: "Panama", PE: "Peru", PF: "French Polynesia", PG: "Papua New Guinea",
  PH: "Philippines", PK: "Pakistan", PL: "Poland",
  PM: "St. Pierre & Miquelon", PN: "Pitcairn Islands", PR: "Puerto Rico",
  PS: "Palestinian Territories", PT: "Portugal", PW: "Palau", PY: "Paraguay",
  QA: "Qatar", RE: "Réunion", RH: "Zimbabwe", RO: "Romania", RS: "Serbia",
  RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands",
  SC: "Seychelles", SD: "Sudan", SE: "Sweden", SG: "Singapore",
  SH: "St. Helena", SI: "Slovenia", SJ: "Svalbard & Jan Mayen",
  SK: "Slovakia", SL: "Sierra Leone", SM: "San Marino", SN: "Senegal",
  SO: "Somalia", SR: "Suriname", SS: "South Sudan", ST: "São Tomé & Príncipe",
  SV: "El Salvador", SX: "Sint Maarten", SY: "Syria", SZ: "Eswatini",
  TC: "Turks & Caicos Islands", TD: "Chad", TF: "French Southern Territories",
  TG: "Togo", TH: "Thailand", TJ: "Tajikistan", TK: "Tokelau",
  TL: "Timor-Leste", TM: "Turkmenistan", TN: "Tunisia", TO: "Tonga",
  TR: "Türkiye", TT: "Trinidad & Tobago", TV: "Tuvalu", TW: "Taiwan",
  TZ: "Tanzania", UA: "Ukraine", UG: "Uganda", UM: "U.S. Outlying Islands",
  UN: "United Nations", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VA: "Vatican City", VC: "St. Vincent & Grenadines", VD: "Vietnam",
  VE: "Venezuela", VG: "British Virgin Islands", VI: "U.S. Virgin Islands",
  VN: "Vietnam", VU: "Vanuatu", WF: "Wallis & Futuna", WS: "Samoa",
  YE: "Yemen", YT: "Mayotte", ZA: "South Africa", ZM: "Zambia",
  ZW: "Zimbabwe"
};

// Loaded as a plain script in the browser (where COUNTRIES becomes a global)
// and required by the Node server, so both sides share exactly one list.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COUNTRIES };
}
