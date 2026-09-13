// VehicleAnalyzer (client-side) — mirrors the structure of the
// original server-side analyzer, but runs entirely in the browser.
//
// - License plate: real OCR via self-hosted tesseract.js.
// - Color: real pixel analysis via Canvas.
// - Brand / model / vehicle type: no offline model is bundled, so
//   these honestly come back "Unknown" unless you've configured an
//   optional cloud vision API key in Settings.

const VehicleAnalyzer = (() => {
  const UNKNOWN = { value: null, confidence: 0 };

  async function analyzeOffline(blob) {
    const [licensePlate, color] = await Promise.all([
      PlateOCR.recognize(blob),
      ColorDetect.detectFromBlob(blob)
    ]);
    return {
      licensePlate,
      color,
      brand: { ...UNKNOWN },
      model: { ...UNKNOWN },
      vehicleType: { ...UNKNOWN }
    };
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const VISION_PROMPT = `You are a vehicle-recognition assistant. Look at the photo and identify the vehicle.
Respond with ONLY a JSON object (no markdown, no commentary) in exactly this shape:
{
  "licensePlate": {"value": string|null, "confidence": number},
  "color": {"value": string|null, "confidence": number},
  "brand": {"value": string|null, "confidence": number},
  "model": {"value": string|null, "confidence": number},
  "vehicleType": {"value": string|null, "confidence": number}
}
Rules:
- confidence is a number between 0 and 1.
- If you are not confident about a field, set its value to null and confidence to a low number. Do not guess.
- color must be one of: Black, White, Silver, Gray, Red, Blue, Green, Yellow, Orange, Brown, Other.
- vehicleType must be one of: Sedan, Hatchback, SUV, MPV, Pickup, Truck, Bus, Motorcycle, Other.`;

  function normalize(field) {
    if (!field || typeof field !== 'object') return { ...UNKNOWN };
    return {
      value: field.value ?? null,
      confidence: typeof field.confidence === 'number' ? field.confidence : 0
    };
  }

  async function analyzeWithVisionAPI(blob, settings) {
    const base64 = await blobToBase64(blob);
    const body = {
      model: settings.model || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
        ]
      }],
      max_tokens: 500
    };

    const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Vision API request failed (${res.status})`);
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Vision API response missing content');
    const parsed = JSON.parse(content);

    return {
      licensePlate: normalize(parsed.licensePlate),
      color: normalize(parsed.color),
      brand: normalize(parsed.brand),
      model: normalize(parsed.model),
      vehicleType: normalize(parsed.vehicleType)
    };
  }

  async function analyze(blob) {
    const settings = CartabaseSettings.getVisionSettings();
    if (settings.enabled && settings.apiKey) {
      try {
        return await analyzeWithVisionAPI(blob, settings);
      } catch (err) {
        console.error('[VehicleAnalyzer] vision API failed, falling back to offline detection:', err);
        const offline = await analyzeOffline(blob);
        offline.visionFailed = true;
        return offline;
      }
    }
    return analyzeOffline(blob);
  }

  return { analyze };
})();
