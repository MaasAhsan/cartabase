const UIHelpers = (() => {
  function toast(message, type = 'info') {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function confidenceLabel(confidence) {
    if (confidence === null || confidence === undefined) return { text: '—', cls: 'confidence-unknown' };
    const pct = Math.round(confidence * 100);
    if (pct >= 80) return { text: `${pct}%`, cls: 'confidence-high' };
    if (pct >= 50) return { text: `${pct}%`, cls: 'confidence-mid' };
    return { text: `${pct}%`, cls: 'confidence-low' };
  }

  function displayValue(value) {
    return value === null || value === undefined || value === '' ? 'Unknown' : value;
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  return { toast, confidenceLabel, displayValue, formatDateTime, escapeHtml };
})();
