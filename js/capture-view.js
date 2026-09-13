const CaptureView = (() => {
  const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Other'];
  const TYPES = ['Sedan', 'Hatchback', 'SUV', 'MPV', 'Pickup', 'Truck', 'Bus', 'Motorcycle', 'Other'];
  const COMMON_BRANDS = ['Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Suzuki', 'Daihatsu', 'Mazda', 'Hyundai', 'Kia', 'Isuzu'];

  let video, canvas, cameraPlaceholder, btnCapture, cameraFallback, cameraFallbackToggle,
    fileInput, btnShowUpload, captureStep, analyzingStep, reviewStep, reviewImage,
    reviewFields, btnRetake, btnSave, analyzingLabel;

  let stream = null;
  let lastBlob = null;
  let lastAnalysis = null;
  let started = false;

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showUploadFallback('Camera access isn\u2019t supported in this browser.');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = stream;
      video.style.display = 'block';
      cameraPlaceholder.style.display = 'none';
      btnCapture.disabled = false;
    } catch (err) {
      let message = 'Could not access the camera. You can upload a photo instead.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. You can upload a photo instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera was found on this device. You can upload a photo instead.';
      } else if (!window.isSecureContext) {
        message = 'Camera access requires a secure (HTTPS) connection. You can upload a photo instead.';
      }
      showUploadFallback(message);
    }
  }

  function showUploadFallback(message) {
    cameraPlaceholder.textContent = message;
    cameraPlaceholder.style.display = 'flex';
    cameraPlaceholder.style.alignItems = 'center';
    cameraPlaceholder.style.justifyContent = 'center';
    btnCapture.disabled = true;
    cameraFallback.style.display = 'block';
    cameraFallbackToggle.style.display = 'none';
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  async function analyzeBlob(blob, previewUrl) {
    captureStep.style.display = 'none';
    analyzingStep.style.display = 'block';
    reviewStep.style.display = 'none';
    lastBlob = blob;

    try {
      const result = await VehicleAnalyzer.analyze(blob);
      lastAnalysis = { ...result, previewUrl };
      if (lastAnalysis.visionFailed) {
        UIHelpers.toast('Cloud detection failed — used offline detection instead.', 'error');
      }
      showReview();
    } catch (e) {
      console.error(e);
      UIHelpers.toast('Analysis failed. You can still enter details manually.', 'error');
      lastAnalysis = {
        previewUrl,
        licensePlate: { value: null, confidence: 0 },
        color: { value: null, confidence: 0 },
        brand: { value: null, confidence: 0 },
        model: { value: null, confidence: 0 },
        vehicleType: { value: null, confidence: 0 }
      };
      showReview();
    } finally {
      analyzingStep.style.display = 'none';
    }
  }

  function selectOptions(values, selected) {
    return `<option value="">Unknown</option>` + values.map((v) =>
      `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`
    ).join('');
  }

  function fieldBlock(label, id, confidence, inputHtml) {
    const conf = UIHelpers.confidenceLabel(confidence);
    return `
      <div class="field">
        <label for="${id}">${label} <span class="confidence ${conf.cls}" style="margin-left:6px;">${conf.text}</span></label>
        ${inputHtml}
      </div>`;
  }

  function showReview() {
    reviewStep.style.display = 'block';
    reviewImage.src = lastAnalysis.previewUrl;

    const brandDatalist = `<datalist id="brand-options">${COMMON_BRANDS.map((b) => `<option value="${b}">`).join('')}</datalist>`;

    reviewFields.innerHTML = `
      ${fieldBlock('License plate', 'rf-plate', lastAnalysis.licensePlate.confidence,
        `<input type="text" id="rf-plate" class="plate-text" style="text-transform:uppercase;" value="${UIHelpers.escapeHtml(lastAnalysis.licensePlate.value || '')}" placeholder="Unknown" />`)}
      ${fieldBlock('Color', 'rf-color', lastAnalysis.color.confidence,
        `<select id="rf-color">${selectOptions(COLORS, lastAnalysis.color.value)}</select>`)}
      ${fieldBlock('Brand', 'rf-brand', lastAnalysis.brand.confidence,
        `<input type="text" id="rf-brand" list="brand-options" value="${UIHelpers.escapeHtml(lastAnalysis.brand.value || '')}" placeholder="Unknown" />${brandDatalist}`)}
      ${fieldBlock('Model', 'rf-model', lastAnalysis.model.confidence,
        `<input type="text" id="rf-model" value="${UIHelpers.escapeHtml(lastAnalysis.model.value || '')}" placeholder="Unknown" />`)}
      ${fieldBlock('Vehicle type', 'rf-type', lastAnalysis.vehicleType.confidence,
        `<select id="rf-type">${selectOptions(TYPES, lastAnalysis.vehicleType.value)}</select>`)}
    `;

    btnSave.disabled = false;
    btnSave.textContent = 'Add to database';
  }

  function resetToCapture() {
    reviewStep.style.display = 'none';
    captureStep.style.display = 'block';
    fileInput.value = '';
    if (!stream) startCamera();
  }

  function wireEvents() {
    btnShowUpload.addEventListener('click', () => {
      cameraFallback.style.display = 'block';
      cameraFallbackToggle.style.display = 'none';
    });

    btnCapture.addEventListener('click', () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        UIHelpers.toast('Camera is not ready yet.', 'error');
        return;
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) {
          UIHelpers.toast('Could not capture the photo. Please try again.', 'error');
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        analyzeBlob(blob, previewUrl);
      }, 'image/jpeg', 0.92);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      analyzeBlob(file, previewUrl);
    });

    btnRetake.addEventListener('click', resetToCapture);

    btnSave.addEventListener('click', async () => {
      if (!lastBlob) return;
      btnSave.disabled = true;
      btnSave.textContent = 'Saving…';

      const record = {
        imageBlob: lastBlob,
        licensePlate: document.getElementById('rf-plate').value.trim().toUpperCase() || null,
        plateConfidence: lastAnalysis.licensePlate.confidence,
        color: document.getElementById('rf-color').value || null,
        colorConfidence: lastAnalysis.color.confidence,
        brand: document.getElementById('rf-brand').value.trim() || null,
        brandConfidence: lastAnalysis.brand.confidence,
        model: document.getElementById('rf-model').value.trim() || null,
        modelConfidence: lastAnalysis.model.confidence,
        vehicleType: document.getElementById('rf-type').value || null,
        vehicleTypeConfidence: lastAnalysis.vehicleType.confidence,
        capturedAt: new Date().toISOString()
      };

      try {
        await CartabaseDB.addVehicle(record);
        UIHelpers.toast('Vehicle added to database.', 'success');
        window.CartabaseApp.switchView('database-view');
        DatabaseView.refresh();
        resetToCapture();
      } catch (e) {
        UIHelpers.toast(e.message || 'Could not save this vehicle.', 'error');
        btnSave.disabled = false;
        btnSave.textContent = 'Add to database';
      }
    });
  }

  function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    cameraPlaceholder = document.getElementById('camera-placeholder');
    btnCapture = document.getElementById('btn-capture');
    cameraFallback = document.getElementById('camera-fallback');
    cameraFallbackToggle = document.getElementById('camera-fallback-toggle');
    fileInput = document.getElementById('file-input');
    btnShowUpload = document.getElementById('btn-show-upload');
    captureStep = document.getElementById('capture-step');
    analyzingStep = document.getElementById('analyzing-step');
    reviewStep = document.getElementById('review-step');
    reviewImage = document.getElementById('review-image');
    reviewFields = document.getElementById('review-fields');
    btnRetake = document.getElementById('btn-retake');
    btnSave = document.getElementById('btn-save');

    wireEvents();
    window.addEventListener('beforeunload', stopCamera);
  }

  // Only start the camera once the Capture tab is actually opened —
  // avoids asking for camera permission before the user asks for it.
  function activate() {
    if (!started) {
      started = true;
      startCamera();
    }
  }

  function deactivate() {
    // Keep the stream alive across tab switches within the same
    // session for a snappier experience; only stopped on unload.
  }

  return { init, activate, deactivate };
})();
