// Client-side vehicle color detection via Canvas pixel sampling.
// Same approach as the original server-side Jimp implementation,
// ported to the browser's native Canvas API — no dependency needed.

const ColorDetect = (() => {
  const UNKNOWN = { value: null, confidence: 0 };

  const NAMED_COLORS = {
    Black: [20, 20, 20],
    White: [245, 245, 245],
    Silver: [190, 190, 190],
    Gray: [130, 130, 130],
    Red: [180, 30, 30],
    Blue: [30, 60, 160],
    Green: [30, 120, 60],
    Yellow: [230, 210, 40],
    Orange: [220, 120, 30],
    Brown: [110, 70, 40]
  };

  function colorDistance(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }

  // Accepts an already-loaded HTMLImageElement or HTMLCanvasElement.
  function detectFromImageSource(imgEl) {
    const canvas = document.createElement('canvas');
    // Downscale for speed — we only need an average, not full resolution.
    const targetW = 60;
    const scale = targetW / imgEl.naturalWidth || targetW / imgEl.width;
    const w = Math.max(1, Math.round((imgEl.naturalWidth || imgEl.width) * scale));
    const h = Math.max(1, Math.round((imgEl.naturalHeight || imgEl.height) * scale));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, w, h);

    const x0 = Math.floor(w * 0.2);
    const x1 = Math.floor(w * 0.8);
    const y0 = Math.floor(h * 0.25);
    const y1 = Math.floor(h * 0.85);
    if (x1 <= x0 || y1 <= y0) return { ...UNKNOWN };

    const { data } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (!count) return { ...UNKNOWN };
    r /= count; g /= count; b /= count;

    let best = null;
    let bestDist = Infinity;
    for (const [name, rgb] of Object.entries(NAMED_COLORS)) {
      const dist = colorDistance([r, g, b], rgb);
      if (dist < bestDist) { bestDist = dist; best = name; }
    }
    const confidence = Math.max(0, Math.min(1, 1 - bestDist / 260));
    return { value: best, confidence };
  }

  function detectFromBlob(blob) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const result = detectFromImageSource(img);
        URL.revokeObjectURL(url);
        resolve(result);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ ...UNKNOWN });
      };
      img.src = url;
    });
  }

  return { detectFromBlob, UNKNOWN };
})();
