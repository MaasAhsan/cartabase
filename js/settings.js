// CartabaseSettings — stores the optional vision-API configuration
// in localStorage, on this device only.
//
// IMPORTANT TRADE-OFF, disclosed to the user in the Settings panel
// too: because this app has no server, there is nowhere to hide an
// API key. If you enable the optional vision provider, the key is
// stored in this browser's localStorage and sent directly from your
// phone to the API over HTTPS. Anyone with access to this browser/
// device could read it from localStorage. This is fundamentally
// different from (and weaker than) a server-side key. Leave it
// disabled if that trade-off doesn't work for you — the offline
// OCR/color detection still works fully without it.

const CartabaseSettings = (() => {
  const KEY = 'cartabase.visionSettings';

  function getVisionSettings() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { enabled: false, apiKey: '', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' };
      return JSON.parse(raw);
    } catch {
      return { enabled: false, apiKey: '', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' };
    }
  }

  function setVisionSettings(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  return { getVisionSettings, setVisionSettings };
})();
