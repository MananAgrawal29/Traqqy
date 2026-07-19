export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const currencies: Currency[] = [
  { code: "USD", symbol: "$",   name: "US Dollar",           flag: "🇺🇸" },
  { code: "EUR", symbol: "€",   name: "Euro",                flag: "🇪🇺" },
  { code: "GBP", symbol: "£",   name: "British Pound",       flag: "🇬🇧" },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",        flag: "🇯🇵" },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",     flag: "🇨🇦" },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar",   flag: "🇦🇺" },
  { code: "CHF", symbol: "Fr",  name: "Swiss Franc",         flag: "🇨🇭" },
  { code: "CNY", symbol: "¥",   name: "Chinese Yuan",        flag: "🇨🇳" },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",        flag: "🇮🇳" },
  { code: "BRL", symbol: "R$",  name: "Brazilian Real",      flag: "🇧🇷" },
  { code: "MXN", symbol: "Mex$",name: "Mexican Peso",        flag: "🇲🇽" },
  { code: "KRW", symbol: "₩",   name: "South Korean Won",    flag: "🇰🇷" },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar",    flag: "🇸🇬" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar",    flag: "🇭🇰" },
  { code: "SEK", symbol: "kr",  name: "Swedish Krona",       flag: "🇸🇪" },
  { code: "NOK", symbol: "kr",  name: "Norwegian Krone",     flag: "🇳🇴" },
  { code: "DKK", symbol: "kr",  name: "Danish Krone",        flag: "🇩🇰" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar",  flag: "🇳🇿" },
  { code: "ZAR", symbol: "R",   name: "South African Rand",  flag: "🇿🇦" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham",          flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼",   name: "Saudi Riyal",         flag: "🇸🇦" },
  { code: "QAR", symbol: "﷼",   name: "Qatari Riyal",        flag: "🇶🇦" },
  { code: "ILS", symbol: "₪",   name: "Israeli Shekel",      flag: "🇮🇱" },
  { code: "TRY", symbol: "₺",   name: "Turkish Lira",        flag: "🇹🇷" },
  { code: "RUB", symbol: "₽",   name: "Russian Ruble",       flag: "🇷🇺" },
  { code: "PLN", symbol: "zł",  name: "Polish Zloty",        flag: "🇵🇱" },
  { code: "CZK", symbol: "Kč",  name: "Czech Koruna",        flag: "🇨🇿" },
  { code: "HUF", symbol: "Ft",  name: "Hungarian Forint",    flag: "🇭🇺" },
  { code: "RON", symbol: "lei", name: "Romanian Leu",        flag: "🇷🇴" },
  { code: "BGN", symbol: "лв",  name: "Bulgarian Lev",       flag: "🇧🇬" },
  { code: "HRK", symbol: "kn",  name: "Croatian Kuna",       flag: "🇭🇷" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar",       flag: "🇹🇼" },
  { code: "THB", symbol: "฿",   name: "Thai Baht",           flag: "🇹🇭" },
  { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit",   flag: "🇲🇾" },
  { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah",   flag: "🇮🇩" },
  { code: "PHP", symbol: "₱",   name: "Philippine Peso",     flag: "🇵🇭" },
  { code: "VND", symbol: "₫",   name: "Vietnamese Dong",     flag: "🇻🇳" },
  { code: "PKR", symbol: "₨",   name: "Pakistani Rupee",     flag: "🇵🇰" },
  { code: "BDT", symbol: "৳",   name: "Bangladeshi Taka",    flag: "🇧🇩" },
  { code: "LKR", symbol: "₨",   name: "Sri Lankan Rupee",    flag: "🇱🇰" },
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira",      flag: "🇳🇬" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling",     flag: "🇰🇪" },
  { code: "GHS", symbol: "₵",   name: "Ghanaian Cedi",       flag: "🇬🇭" },
  { code: "EGP", symbol: "E£",  name: "Egyptian Pound",      flag: "🇪🇬" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham",     flag: "🇲🇦" },
  { code: "DZD", symbol: "دج",  name: "Algerian Dinar",      flag: "🇩🇿" },
  { code: "TND", symbol: "د.ت",name: "Tunisian Dinar",       flag: "🇹🇳" },
  { code: "CLP", symbol: "$",   name: "Chilean Peso",        flag: "🇨🇱" },
  { code: "COP", symbol: "$",   name: "Colombian Peso",      flag: "🇨🇴" },
  { code: "PEN", symbol: "S/",  name: "Peruvian Sol",        flag: "🇵🇪" },
  { code: "ARS", symbol: "$",   name: "Argentine Peso",      flag: "🇦🇷" },
  { code: "UYU", symbol: "$U",  name: "Uruguayan Peso",      flag: "🇺🇾" },
  { code: "BOB", symbol: "Bs.", name: "Bolivian Boliviano",  flag: "🇧🇴" },
  { code: "PYG", symbol: "₲",   name: "Paraguayan Guaraní", flag: "🇵🇾" },
  { code: "VEF", symbol: "Bs.F",name: "Venezuelan Bolívar",  flag: "🇻🇪" },
  { code: "UAH", symbol: "₴",   name: "Ukrainian Hryvnia",   flag: "🇺🇦" },
  { code: "GEL", symbol: "₾",   name: "Georgian Lari",       flag: "🇬🇪" },
  { code: "AMD", symbol: "֏",   name: "Armenian Dram",       flag: "🇦🇲" },
  { code: "KZT", symbol: "₸",   name: "Kazakhstani Tenge",   flag: "🇰🇿" },
  { code: "UZS", symbol: "so'm",name: "Uzbekistani Som",     flag: "🇺🇿" },
  { code: "IRR", symbol: "﷼",   name: "Iranian Rial",        flag: "🇮🇷" },
  { code: "JOD", symbol: "JD",  name: "Jordanian Dinar",     flag: "🇯🇴" },
  { code: "KWD", symbol: "KD",  name: "Kuwaiti Dinar",       flag: "🇰🇼" },
  { code: "BHD", symbol: "BD",  name: "Bahraini Dinar",      flag: "🇧🇭" },
  { code: "OMR", symbol: "﷼",   name: "Omani Rial",          flag: "🇴🇲" },
];

export const COMMON_CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL", "KRW", "SGD"];

export function getCurrency(code: string): Currency | undefined {
  return currencies.find(c => c.code === code);
}

export function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const c = getCurrency(currencyCode);
    return `${c?.symbol ?? currencyCode}${amount.toFixed(2)}`;
  }
}
