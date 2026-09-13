// PlateOCR — wraps tesseract.js, pointed at self-hosted files under
// /vendor/tesseract and /tessdata so this works fully offline once
// the service worker has cached them (no jsdelivr/CDN dependency,
// which is tesseract.js's default and would break offline use).

const PlateOCR = (() => {
  const UNKNOWN = { value: null, confidence: 0 };

  const PLATE_PATTERNS = [
    /\b([A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3})\b/,
    /\b(\d{1,4}\s?[A-Z]{1,3})\b/
  ];

  let workerPromise = null;

  function getWorker() {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker('eng', 1, {
        workerPath: 'vendor/tesseract/worker.min.js',
        corePath: 'vendor/tesseract/',
        langPath: 'tessdata',
        gzip: false
      });
    }
    return workerPromise;
  }

  function cleanPlateText(raw) {
    return raw
      .replace(/\n+/g, ' ')
      .replace(/[^A-Z0-9 ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function extractPlateCandidate(text) {
    for (const pattern of PLATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  async function recognize(imgEl) {
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(imgEl);
      const cleaned = cleanPlateText(data.text || '');
      const candidate = extractPlateCandidate(cleaned);
      if (!candidate) return { ...UNKNOWN };

      const words = Array.isArray(data.words) ? data.words : [];
      const relevant = words.filter((w) => candidate.includes(String(w.text || '').toUpperCase()));
      const source = relevant.length ? relevant : words;
      const avgConfidence = source.length
        ? source.reduce((sum, w) => sum + (w.confidence || 0), 0) / source.length
        : (data.confidence || 0);

      return { value: candidate, confidence: Math.max(0, Math.min(1, avgConfidence / 100)) };
    } catch (err) {
      console.error('[PlateOCR] recognition failed:', err);
      return { ...UNKNOWN };
    }
  }

  return { recognize, UNKNOWN };
})();
