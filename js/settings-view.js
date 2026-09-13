const SettingsView = (() => {
  function init() {
    const enabledEl = document.getElementById('s-enabled');
    const keyEl = document.getElementById('s-key');
    const modelEl = document.getElementById('s-model');
    const baseEl = document.getElementById('s-base');

    const current = CartabaseSettings.getVisionSettings();
    enabledEl.checked = !!current.enabled;
    keyEl.value = current.apiKey || '';
    modelEl.value = current.model || 'gpt-4o-mini';
    baseEl.value = current.baseUrl || 'https://api.openai.com/v1';

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      CartabaseSettings.setVisionSettings({
        enabled: enabledEl.checked,
        apiKey: keyEl.value.trim(),
        model: modelEl.value.trim() || 'gpt-4o-mini',
        baseUrl: baseEl.value.trim() || 'https://api.openai.com/v1'
      });
      UIHelpers.toast('Settings saved.', 'success');
    });

    document.getElementById('btn-export').addEventListener('click', async () => {
      try {
        const all = await CartabaseDB.exportAll();
        const exportable = await Promise.all(all.map(async (v) => {
          const { imageBlob, ...rest } = v;
          let imageBase64 = null;
          if (imageBlob) {
            imageBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(imageBlob);
            });
          }
          return { ...rest, image: imageBase64 };
        }));
        const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cartabase-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UIHelpers.toast('Export downloaded.', 'success');
      } catch (e) {
        UIHelpers.toast(e.message || 'Export failed.', 'error');
      }
    });
  }

  return { init };
})();
