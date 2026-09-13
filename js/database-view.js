const DatabaseView = (() => {
  const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Other'];
  const TYPES = ['Sedan', 'Hatchback', 'SUV', 'MPV', 'Pickup', 'Truck', 'Bus', 'Motorcycle', 'Other'];

  let tbody, table, emptyEl, resultCountEl, modalRegion, filterEls;
  const objectUrls = [];

  function revokeAllImageUrls() {
    while (objectUrls.length) URL.revokeObjectURL(objectUrls.pop());
  }

  function imageUrlFor(blob) {
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return url;
  }

  function populateSelect(select, values, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>` +
      values.map((v) => `<option value="${UIHelpers.escapeHtml(v)}">${UIHelpers.escapeHtml(v)}</option>`).join('');
  }

  async function loadFilterOptions() {
    let dbBrands = [], dbColors = [], dbTypes = [];
    try {
      dbBrands = await CartabaseDB.distinctValues('brand');
      dbColors = await CartabaseDB.distinctValues('color');
      dbTypes = await CartabaseDB.distinctValues('vehicleType');
    } catch { /* filters still work without the merge */ }

    populateSelect(filterEls.color, Array.from(new Set([...COLORS, ...dbColors])), 'Any color');
    populateSelect(filterEls.brand, dbBrands.length ? dbBrands : ['Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Suzuki'], 'Any brand');
    populateSelect(filterEls.vehicleType, Array.from(new Set([...TYPES, ...dbTypes])), 'Any type');
  }

  function currentFilters() {
    const f = {};
    if (filterEls.plate.value.trim()) f.plate = filterEls.plate.value.trim();
    if (filterEls.color.value) f.color = filterEls.color.value;
    if (filterEls.brand.value) f.brand = filterEls.brand.value;
    if (filterEls.model.value.trim()) f.model = filterEls.model.value.trim();
    if (filterEls.vehicleType.value) f.vehicleType = filterEls.vehicleType.value;
    if (filterEls.dateFrom.value) f.dateFrom = filterEls.dateFrom.value;
    if (filterEls.dateTo.value) f.dateTo = filterEls.dateTo.value;
    return f;
  }

  function overallConfidence(v) {
    const fields = [v.plateConfidence, v.colorConfidence, v.brandConfidence, v.modelConfidence, v.vehicleTypeConfidence];
    const known = fields.filter((c) => c !== null && c !== undefined);
    if (!known.length) return null;
    return known.reduce((sum, c) => sum + c, 0) / known.length;
  }

  function rowHtml(v) {
    const conf = UIHelpers.confidenceLabel(overallConfidence(v));
    const plate = UIHelpers.displayValue(v.licensePlate);
    const imgSrc = imageUrlFor(v.imageBlob);
    return `
      <tr class="vehicle-row" data-id="${v.id}" style="border-bottom:1px solid var(--border); cursor:pointer;">
        <td style="padding:8px 14px;">
          <img src="${imgSrc}" alt="Captured vehicle" style="width:64px; height:44px; object-fit:cover; border-radius:6px; border:1px solid var(--border);" />
        </td>
        <td style="padding:8px 14px;" class="plate-text">${UIHelpers.escapeHtml(plate)}</td>
        <td style="padding:8px 14px;">${UIHelpers.escapeHtml(UIHelpers.displayValue(v.brand))} <span style="color:var(--ink-faint);">${UIHelpers.escapeHtml(v.model || '')}</span></td>
        <td style="padding:8px 14px;">${UIHelpers.escapeHtml(UIHelpers.displayValue(v.color))}</td>
        <td style="padding:8px 14px;">${UIHelpers.escapeHtml(UIHelpers.displayValue(v.vehicleType))}</td>
        <td style="padding:8px 14px;"><span class="confidence ${conf.cls}">${conf.text}</span></td>
        <td style="padding:8px 14px; color:var(--ink-soft); font-size:13px;">${UIHelpers.formatDateTime(v.capturedAt)}</td>
        <td style="padding:8px 14px; text-align:right;"><button class="btn btn-sm btn-ghost view-btn" data-id="${v.id}">View</button></td>
      </tr>`;
  }

  async function refresh() {
    try {
      const vehicles = await CartabaseDB.listVehicles(currentFilters());
      revokeAllImageUrls();
      resultCountEl.textContent = vehicles.length
        ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`
        : '';
      if (!vehicles.length) {
        emptyEl.style.display = 'block';
        table.style.display = 'none';
        return;
      }
      tbody.innerHTML = vehicles.map(rowHtml).join('');
      table.style.display = 'table';
      emptyEl.style.display = 'none';
    } catch (e) {
      UIHelpers.toast(e.message || 'Could not load vehicles.', 'error');
    }
  }

  function selectOptions(values, selected) {
    return `<option value="">Unknown</option>` + values.map((v) =>
      `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`
    ).join('');
  }

  function fieldRow(label, value, confidence, inputHtml) {
    const conf = UIHelpers.confidenceLabel(confidence);
    return `
      <div class="field">
        <label>${label} <span class="confidence ${conf.cls}" style="margin-left:6px;">${conf.text}</span></label>
        ${inputHtml}
      </div>`;
  }

  function openDetailModal(v) {
    const imgSrc = imageUrlFor(v.imageBlob);
    modalRegion.innerHTML = `
      <div class="modal-backdrop" id="detail-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2>Vehicle #${v.id}</h2>
            <button class="btn btn-ghost btn-sm" id="close-modal" aria-label="Close">Close</button>
          </div>
          <div class="modal-body">
            <img src="${imgSrc}" alt="Captured vehicle" style="width:100%; max-height:280px; object-fit:cover; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;" />
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              ${fieldRow('License plate', v.licensePlate, v.plateConfidence,
                `<input type="text" id="edit-plate" value="${UIHelpers.escapeHtml(v.licensePlate || '')}" class="plate-text" style="text-transform:uppercase;" />`)}
              ${fieldRow('Color', v.color, v.colorConfidence,
                `<select id="edit-color">${selectOptions(COLORS, v.color)}</select>`)}
              ${fieldRow('Brand', v.brand, v.brandConfidence,
                `<input type="text" id="edit-brand" value="${UIHelpers.escapeHtml(v.brand || '')}" />`)}
              ${fieldRow('Model', v.model, v.modelConfidence,
                `<input type="text" id="edit-model" value="${UIHelpers.escapeHtml(v.model || '')}" />`)}
              ${fieldRow('Vehicle type', v.vehicleType, v.vehicleTypeConfidence,
                `<select id="edit-type">${selectOptions(TYPES, v.vehicleType)}</select>`)}
              <div class="field">
                <label>Captured at</label>
                <input type="text" id="edit-captured" value="${UIHelpers.escapeHtml(v.capturedAt || '')}" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" id="delete-btn">Delete</button>
            <span style="flex:1;"></span>
            <button class="btn btn-ghost" id="cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="save-btn">Save changes</button>
          </div>
        </div>
      </div>`;

    const close = () => { modalRegion.innerHTML = ''; };
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-btn').onclick = close;
    document.getElementById('detail-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'detail-backdrop') close();
    });

    document.getElementById('save-btn').onclick = async () => {
      const changes = {
        licensePlate: document.getElementById('edit-plate').value.trim().toUpperCase() || null,
        color: document.getElementById('edit-color').value || null,
        brand: document.getElementById('edit-brand').value.trim() || null,
        model: document.getElementById('edit-model').value.trim() || null,
        vehicleType: document.getElementById('edit-type').value || null,
        capturedAt: document.getElementById('edit-captured').value.trim() || v.capturedAt
      };
      try {
        await CartabaseDB.updateVehicle(v.id, changes);
        UIHelpers.toast('Vehicle updated.', 'success');
        close();
        refresh();
      } catch (e) {
        UIHelpers.toast(e.message || 'Could not save changes.', 'error');
      }
    };

    document.getElementById('delete-btn').onclick = async () => {
      if (!confirm('Delete this vehicle record? This cannot be undone.')) return;
      try {
        await CartabaseDB.deleteVehicle(v.id);
        UIHelpers.toast('Vehicle deleted.', 'success');
        close();
        refresh();
      } catch (e) {
        UIHelpers.toast(e.message || 'Could not delete this vehicle.', 'error');
      }
    };
  }

  function init() {
    tbody = document.getElementById('vehicle-tbody');
    table = document.getElementById('vehicle-table');
    emptyEl = document.getElementById('empty-state');
    resultCountEl = document.getElementById('result-count');
    modalRegion = document.getElementById('modal-region');
    filterEls = {
      plate: document.getElementById('f-plate'),
      color: document.getElementById('f-color'),
      brand: document.getElementById('f-brand'),
      model: document.getElementById('f-model'),
      vehicleType: document.getElementById('f-type'),
      dateFrom: document.getElementById('f-date-from'),
      dateTo: document.getElementById('f-date-to')
    };

    tbody.addEventListener('click', async (e) => {
      const row = e.target.closest('.vehicle-row');
      if (!row) return;
      try {
        const v = await CartabaseDB.getVehicle(row.dataset.id);
        openDetailModal(v);
      } catch (e2) {
        UIHelpers.toast(e2.message || 'Could not load this vehicle.', 'error');
      }
    });

    document.getElementById('btn-search').addEventListener('click', refresh);
    document.getElementById('btn-clear').addEventListener('click', () => {
      Object.values(filterEls).forEach((el) => { el.value = ''; });
      refresh();
    });
    [filterEls.plate, filterEls.model].forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') refresh(); });
    });
    document.getElementById('empty-capture-btn').addEventListener('click', () => {
      window.CartabaseApp.switchView('capture-view');
    });

    loadFilterOptions();
    refresh();
  }

  return { init, refresh };
})();
