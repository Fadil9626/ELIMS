// src/utils/currencyService.js
export const getExchangeRates = async (base = 'LE') => {
    const response = await fetch(`https://api.exchangerate.host/latest?base=${base}`);
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    return response.json();
  };
  
  export const getCurrencyFlag = (code) => {
    const flags = {
      Le: '🇸🇱', // Sierra Leone
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
      NGN: '🇳🇬',
      GHS: '🇬🇭',
      CFA: '🇨🇮',
      KES: '🇰🇪',
    };
    return flags[code] || '💱';
  };
  