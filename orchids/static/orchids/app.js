(() => {
  const isPreorders = window.location.pathname.startsWith('/preorders');
  const isWishlist = window.location.pathname.startsWith('/wishlist');
  const list = document.querySelector('#orchid-list');
  const preorderList = document.querySelector('#preorder-list');
  const status = document.querySelector('#status');
  const emptyState = document.querySelector('#empty-state');
  const dialog = document.querySelector('#orchid-dialog');
  const detailDialog = document.querySelector('#detail-dialog');
  const photoLogDialog = document.querySelector('#photo-log-dialog');
  const photoPreviewDialog = document.querySelector('#photo-preview-dialog');
  const eventTypeDialog = document.querySelector('#event-type-dialog');
  const eventDialog = document.querySelector('#event-dialog');
  const eventForm = document.querySelector('#event-form');
  const authScreen = document.querySelector('#auth-screen');
  const appShell = document.querySelector('#app-shell');
  const authDialog = document.querySelector('#auth-dialog');
  const authForm = document.querySelector('#auth-form');
  const form = document.querySelector('#orchid-form');
  const errorBox = document.querySelector('#form-error');
  const saveButton = document.querySelector('#save-orchid');
  const nextButton = document.querySelector('#next-step');
  const backButton = document.querySelector('#back-step');
  const search = document.querySelector('#search');
  const filters = document.querySelector('#filters');
  let orchids = [];
  let photos = [];
  let events = [];
  let currentStep = 1;
  let editing = null;
  let selectedOrchid = null;
  let photoLogOrchid = null;
  const expandedEventIds = new Set();
  let preorders = [];

  const valueOf = (item, key) => Array.isArray(item[key]) ? item[key].filter(Boolean).join(', ') : (item[key] ?? '');
  const firstValue = (item, key) => Array.isArray(item[key]) ? item[key][0] || '' : item[key] || '';
  function csrfToken() {
    const cookie = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
  }
  async function refreshTokens() {
    const response = await fetch('/api/auth/refresh/', {method: 'POST', credentials: 'same-origin', headers: {'X-CSRFToken': csrfToken()}});
    return response.ok;
  }
  async function api(path, options = {}, retried = false) {
    const headers = {...options.headers};
    if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) headers['X-CSRFToken'] = csrfToken();
    const response = await fetch(path, {...options, credentials: 'same-origin', headers});
    if (response.status === 401 && !retried && path !== '/api/auth/refresh/') {
      if (await refreshTokens()) return api(path, options, true);
      showAuthScreen();
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (!response.ok) {
      let message = 'Something went wrong. Please try again.';
      try { const body = await response.json(); message = body.detail || Object.values(body).flat().join(' '); } catch (_) { /* empty response */ }
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }

  function showAuthScreen() {
    appShell.hidden = true;
    authScreen.hidden = false;
  }
  function openAuth(mode) {
    authForm.reset();
    document.querySelector('#auth-error').textContent = '';
    authDialog.dataset.mode = mode;
    const isRegister = mode === 'register';
    document.querySelector('#auth-kicker').textContent = isRegister ? 'NEW ACCOUNT' : 'WELCOME BACK';
    document.querySelector('#auth-title').textContent = isRegister ? 'Create account' : 'Log in';
    document.querySelector('#auth-description').textContent = isRegister ? 'Create your account with an email and password.' : 'Use your email and password to open your collection.';
    document.querySelector('#auth-password').autocomplete = isRegister ? 'new-password' : 'current-password';
    document.querySelector('#auth-password').minLength = isRegister ? 7 : 1;
    document.querySelector('#auth-submit').textContent = isRegister ? 'Create account' : 'Log in';
    document.querySelector('#auth-switch').textContent = isRegister ? 'Already have an account? Log in' : 'Create an account';
    authDialog.showModal();
    document.querySelector('#auth-email').focus();
  }
  function showApp(user) {
    authScreen.hidden = true;
    appShell.hidden = false;
    document.querySelector('#profile-email').textContent = user.email;
    document.querySelector('#profile-initial').textContent = (user.email || '?').charAt(0).toUpperCase();
    initializeCollectionView();
  }
  async function startApp() {
    try { showApp(await api('/api/auth/me/')); }
    catch (_) { showAuthScreen(); }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function formatDate(date) {
    if (!date) return '—';
    const value = new Date(`${date}T00:00:00`);
    return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat('en', {day: 'numeric', month: 'short', year: 'numeric'}).format(value);
  }
  function imageUrl(path) {
    if (!path) return '';
    return path.startsWith('http') ? path : new URL(path, window.location.origin).href;
  }
  function photosFor(id) { return photos.filter(photo => Number(photo.orchid) === Number(id) && !photo.is_deleted).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')); }
  function eventsFor(id) { return events.filter(event => Number(event.orchid) === Number(id)).sort((a, b) => b.event_date.localeCompare(a.event_date)); }

  function fillSelect(select, values, placeholder) {
    const current = select.value;
    select.replaceChildren(new Option(placeholder, ''));
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en')).forEach(value => select.add(new Option(value, value)));
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }
  function updateFilterChoices() {
    fillSelect(document.querySelector('#filter-genus'), orchids.flatMap(item => Array.isArray(item.genus) ? item.genus : []), 'All genera');
    fillSelect(document.querySelector('#filter-farm'), orchids.flatMap(item => Array.isArray(item.farm) ? item.farm : []), 'All farms');
    fillSelect(document.querySelector('#filter-seller'), orchids.flatMap(item => Array.isArray(item.seller) ? item.seller : []), 'All sellers');
  }
  function filteredOrchids() {
    const query = search.value.trim().toLocaleLowerCase('en');
    const genus = document.querySelector('#filter-genus').value;
    const farm = document.querySelector('#filter-farm').value;
    const seller = document.querySelector('#filter-seller').value;
    const found = orchids.filter(item => {
      const searchable = [item.name, item.comment, valueOf(item, 'genus'), valueOf(item, 'farm'), valueOf(item, 'seller')].join(' ').toLocaleLowerCase('en');
      return (!query || searchable.includes(query)) && (!genus || (item.genus || []).includes(genus)) &&
        (!farm || (item.farm || []).includes(farm)) && (!seller || (item.seller || []).includes(seller));
    });
    const sort = document.querySelector('#sort-by').value;
    const [key, direction] = sort.split('_');
    const compare = (a, b) => {
      if (key === 'price') return (Number(a.price_usd || 0) - Number(b.price_usd || 0)) * (direction === 'desc' ? -1 : 1);
      const av = key === 'date' ? (a.date_arrived || '') : valueOf(a, key).toLocaleLowerCase('en');
      const bv = key === 'date' ? (b.date_arrived || '') : valueOf(b, key).toLocaleLowerCase('en');
      return av.localeCompare(bv, 'en') * (direction === 'desc' ? -1 : 1);
    };
    return found.sort(compare);
  }

  function renderOrchids() {
    const items = filteredOrchids();
    list.replaceChildren();
    document.querySelector('#result-count').textContent = `${items.length} ${items.length === 1 ? 'orchid' : 'orchids'}`;
    items.forEach(item => {
      const itemWrap = el('section', 'orchid-item');
      const row = el('div', 'orchid-row');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `View ${item.name || 'orchid'}`);
      const photoCell = el('span', 'row-photo-group');
      if (item.main_photo) {
        const mainThumb = el('button', 'row-main-photo'); mainThumb.type = 'button'; mainThumb.setAttribute('aria-label', `Open main photo for ${item.name}`);
        const img = el('img'); img.src = imageUrl(item.main_photo); img.alt = ''; mainThumb.append(img);
        mainThumb.addEventListener('click', event => { event.stopPropagation(); openPhotoPreview(item.main_photo, `${item.name || 'Orchid'} — main photo`); });
        photoCell.append(mainThumb);
      } else photoCell.append(el('span', 'row-photo photo-placeholder', '✿'));
      row.append(photoCell);
      row.append(el('span', 'row-number', `#${String(item.id).padStart(3, '0')}`));
      row.append(el('span', 'row-name', item.name || 'Untitled orchid'));
      row.append(el('span', 'row-genus', valueOf(item, 'genus') || '—'));
      row.append(el('span', 'row-date', formatDate(item.date_arrived)));
      const actions = el('span', 'row-actions');
      const photoActions = el('span', 'row-photo-actions');
      const eventButton = el('button', 'row-event-button row-add-event-button', '＋ Add Event'); eventButton.type = 'button';
      eventButton.addEventListener('click', event => { event.stopPropagation(); openEventChooser(item); });
      const photoLogButton = el('button', 'row-event-button row-photo-log-button', 'Photo Log'); photoLogButton.type = 'button';
      photoLogButton.addEventListener('click', event => { event.stopPropagation(); openPhotoLog(item); });
      const recentPhotos = el('span', 'row-photo-log-thumbs');
      photosFor(item.id).slice(0, 3).forEach(photo => {
        const thumb = el('button', 'row-photo-thumb'); thumb.type = 'button';
        const img = el('img'); img.src = imageUrl(photo.image); img.alt = '';
        const date = photo.created_at ? formatDate(photo.created_at.slice(0, 10)) : 'Date unknown';
        thumb.title = `Open photo${photo.created_at ? ` added ${date}` : ''}`;
        thumb.setAttribute('aria-label', `Open photo${photo.created_at ? ` added ${date}` : ''} for ${item.name}`);
        thumb.append(img);
        thumb.addEventListener('click', event => { event.stopPropagation(); openPhotoPreview(photo.image, `${item.name || 'Orchid'} — ${date}`); });
        recentPhotos.append(thumb);
      });
      photoActions.append(eventButton, photoLogButton, recentPhotos);
      const disclosure = el('button', 'row-disclosure', ''); disclosure.type = 'button';
      disclosure.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5"/></svg>';
      disclosure.setAttribute('aria-expanded', String(expandedEventIds.has(Number(item.id)))); disclosure.setAttribute('aria-label', `${expandedEventIds.has(Number(item.id)) ? 'Hide' : 'Show'} events for ${item.name || 'orchid'}`);
      actions.append(photoActions, disclosure);
      row.append(actions);
      row.addEventListener('click', () => showDetails(item));
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetails(item); } });
      const panel = el('div', 'orchid-event-panel'); panel.hidden = !expandedEventIds.has(Number(item.id));
      const panelTop = el('div', 'orchid-event-panel-top');
      panelTop.append(el('strong', '', 'Events'));
      const eventList = el('div', 'inline-event-list');
      renderEventEntries(item, eventList);
      panel.append(panelTop, eventList);
      disclosure.addEventListener('click', event => {
        event.stopPropagation(); panel.hidden = !panel.hidden;
        if (panel.hidden) expandedEventIds.delete(Number(item.id)); else expandedEventIds.add(Number(item.id));
        disclosure.setAttribute('aria-expanded', String(!panel.hidden));
        disclosure.setAttribute('aria-label', `${panel.hidden ? 'Show' : 'Hide'} events for ${item.name || 'orchid'}`);
      });
      itemWrap.append(row, panel);
      list.append(itemWrap);
    });
    document.querySelector('#collection-count').textContent = orchids.length;
    emptyState.hidden = items.length > 0 || orchids.length > 0;
    if (orchids.length && items.length === 0) { status.textContent = 'No orchids match these filters.'; status.className = 'status'; }
    else status.textContent = '';
  }

  async function loadOrchids() {
    status.textContent = 'Loading your collection…'; status.className = 'status';
    try {
      const result = await Promise.all([api('/api/orchids/'), api('/api/photos/'), api('/api/events/')]);
      orchids = result[0]; photos = result[1]; events = result[2];
      updateFilterChoices(); renderOrchids();
    } catch (error) { status.textContent = error.message; status.className = 'status error'; }
  }

  function showDetails(item) {
    selectedOrchid = item;
    document.querySelector('#detail-title').textContent = item.name || 'Untitled orchid';
    const body = document.querySelector('#detail-body'); body.replaceChildren();
    const mainSection = el('section', 'detail-section');
    const sectionHeader = el('div', 'detail-section-header');
    sectionHeader.append(el('h3', '', 'Main photo'));
    const replaceMain = el('button', 'text-button', 'Change photo'); replaceMain.type = 'button';
    replaceMain.addEventListener('click', () => document.querySelector('#main-photo-from-detail').click());
    sectionHeader.append(replaceMain); mainSection.append(sectionHeader);
    if (item.main_photo) { const img = el('img', 'detail-main-image'); img.src = imageUrl(item.main_photo); img.alt = `${item.name} main photo`; mainSection.append(img); }
    else mainSection.append(el('div', 'detail-no-photo main-photo-placeholder', '✿'));
    body.append(mainSection);

    const details = el('div', 'detail-fields');
    [['Genus', valueOf(item, 'genus')], ['Farm', valueOf(item, 'farm')], ['Seller', valueOf(item, 'seller')], ['Purchase date', formatDate(item.date_arrived)], ['Price (USD)', item.price_usd ? `$${Number(item.price_usd).toFixed(2)}` : '—'], ['Notes', item.comment || '—']].forEach(([label, value]) => {
      const field = el('div', 'detail-field'); field.append(el('span', '', label), el('strong', '', value)); details.append(field);
    });
    body.append(details);

    if (!detailDialog.open) detailDialog.showModal();
  }

  function openPhotoLog(item) {
    photoLogOrchid = item;
    document.querySelector('#photo-log-orchid-name').textContent = item.name || 'Untitled orchid';
    renderPhotoLog();
    photoLogDialog.showModal();
  }

  function renderPhotoLog() {
    const gallery = document.querySelector('#photo-log-gallery');
    gallery.replaceChildren();
    if (!photoLogOrchid) return;
    const photosForOrchid = photosFor(photoLogOrchid.id);
    photosForOrchid.forEach(photo => {
      const tile = el('button', 'photo-tile'); tile.type = 'button';
      const img = el('img'); img.src = imageUrl(photo.image); img.alt = photo.description || `${photoLogOrchid.name} progress photo`;
      const stamp = photo.created_at ? formatDate(photo.created_at.slice(0, 10)) : 'Date unknown';
      tile.title = photo.created_at ? `Added ${stamp}` : stamp;
      tile.setAttribute('aria-label', `Open progress photo, ${stamp}`);
      tile.addEventListener('click', () => openPhotoPreview(photo.image, `${photoLogOrchid.name || 'Orchid'} — ${stamp}`));
      tile.append(img, el('span', 'photo-date-overlay', stamp)); gallery.append(tile);
    });
    if (!photosForOrchid.length) gallery.append(el('div', 'gallery-empty', 'No progress photos yet. Add the first one above.'));
  }

  function openPhotoPreview(path, caption) {
    document.querySelector('#photo-preview-image').src = imageUrl(path);
    document.querySelector('#photo-preview-image').alt = caption;
    document.querySelector('#photo-preview-caption').textContent = caption;
    photoPreviewDialog.showModal();
  }

  function eventTypeLabel(type) {
    return ({repotting: 'Repotting', pest_treatment: 'Pest treatment', disease_treatment: 'Disease treatment', division: 'Division', unwell: 'Plant was unwell'})[type] || type;
  }
  function eventTypeIcon(type) {
    return ({repotting: '🪴', pest_treatment: '🐛', disease_treatment: '🩺', division: '✂️', unwell: '🌿'})[type] || '✿';
  }
  function openEventChooser(item) {
    selectedOrchid = item;
    document.querySelector('#event-picker-orchid-name').textContent = item.name || 'Untitled orchid';
    eventTypeDialog.showModal();
  }
  function openEventForm(item, type) {
    selectedOrchid = item;
    eventForm.reset();
    document.querySelector('#event-error').textContent = '';
    document.querySelector('#event-date').value = localToday();
    document.querySelector('#event-orchid-name').textContent = item.name || 'Untitled orchid';
    document.querySelector('#event-type').value = type;
    document.querySelector('#event-form-type').textContent = eventTypeLabel(type);
    document.querySelector('#event-form-icon').textContent = eventTypeIcon(type);
    if (eventTypeDialog.open) eventTypeDialog.close();
    eventDialog.showModal();
  }
  function renderEventEntries(item, target) {
    target.replaceChildren();
    const entries = eventsFor(item.id);
    entries.forEach(entry => {
      const row = el('article', 'inline-event-entry');
      row.append(el('span', 'event-log-icon', eventTypeIcon(entry.event_type)));
      const copy = el('div', 'event-log-copy');
      const heading = el('div', 'event-log-heading');
      heading.append(el('strong', '', eventTypeLabel(entry.event_type)), el('time', '', formatDate(entry.event_date)));
      copy.append(heading);
      if (entry.notes) copy.append(el('p', '', entry.notes));
      row.append(copy); target.append(row);
    });
    if (!entries.length) target.append(el('p', 'event-log-empty', 'No events recorded yet.'));
  }

  function showStep(step) {
    currentStep = step;
    document.querySelectorAll('.form-step').forEach(section => section.classList.toggle('active', Number(section.dataset.step) === step));
    document.querySelectorAll('[data-step-dot]').forEach(dot => { const n = Number(dot.dataset.stepDot); dot.classList.toggle('current', n === step); dot.classList.toggle('done', n < step); });
    document.querySelector('#step-caption').textContent = `Step ${step} of 2`;
    backButton.hidden = step === 1; nextButton.hidden = step === 2; saveButton.hidden = step !== 2;
  }
  function resetForm() {
    form.reset(); editing = null; errorBox.textContent = ''; document.querySelector('#genus-custom').hidden = true;
    document.querySelector('#date_arrived').value = new Date().toISOString().slice(0, 10);
    document.querySelector('#existing-photo').hidden = true;
    document.querySelector('#photo-label').textContent = 'Choose a main photo';
    document.querySelector('#form-title').textContent = 'Add an orchid';
    document.querySelector('#form-kicker').textContent = 'NEW ORCHID';
    saveButton.innerHTML = 'Save orchid <span>→</span>';
    showStep(1);
  }
  function openNew() { resetForm(); dialog.showModal(); document.querySelector('#name').focus(); }
  function openEdit(item) {
    resetForm(); editing = item;
    document.querySelector('#form-title').textContent = 'Edit orchid';
    document.querySelector('#form-kicker').textContent = `RECORD #${String(item.id).padStart(3, '0')}`;
    saveButton.innerHTML = 'Save changes <span>→</span>';
    document.querySelector('#name').value = item.name || '';
    document.querySelector('#comment').value = item.comment || '';
    const genus = firstValue(item, 'genus');
    const select = document.querySelector('#genus-select');
    if ([...select.options].some(option => option.value === genus)) select.value = genus;
    else if (genus) { select.value = '__custom'; document.querySelector('#genus-custom').hidden = false; document.querySelector('#genus-custom').value = genus; }
    document.querySelector('#farm').value = firstValue(item, 'farm');
    document.querySelector('#seller').value = firstValue(item, 'seller');
    document.querySelector('#date_arrived').value = item.date_arrived || '';
    document.querySelector('#price_usd').value = item.price_usd || '';
    if (item.main_photo) { const box = document.querySelector('#existing-photo'); box.replaceChildren(); const img = el('img'); img.src = imageUrl(item.main_photo); img.alt = 'Current main photo'; box.append(img, el('span', '', 'Current main photo')); box.hidden = false; }
    dialog.showModal(); document.querySelector('#name').focus();
  }

  async function uploadGalleryPhoto(orchidId, file) {
    if (!file) return;
    const body = new FormData(); body.append('orchid', orchidId); body.append('image', file);
    await api('/api/photos/', {method: 'POST', body});
  }
  async function uploadMainPhoto(orchidId, file) {
    if (!file) return;
    const body = new FormData(); body.append('main_photo', file);
    return api(`/api/orchids/${orchidId}/`, {method: 'PATCH', body});
  }
  function arrayValue(value) { return value.trim() ? [value.trim()] : []; }
  function localToday() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }
  document.querySelectorAll('[data-open-form]').forEach(button => button.addEventListener('click', openNew));
  document.querySelectorAll('[data-close-form]').forEach(button => button.addEventListener('click', () => dialog.close()));
  document.querySelectorAll('[data-close-detail]').forEach(button => button.addEventListener('click', () => detailDialog.close()));
  document.querySelectorAll('[data-close-photo-log]').forEach(button => button.addEventListener('click', () => photoLogDialog.close()));
  document.querySelectorAll('[data-close-photo-preview]').forEach(button => button.addEventListener('click', () => photoPreviewDialog.close()));
  document.querySelectorAll('[data-close-event-picker]').forEach(button => button.addEventListener('click', () => eventTypeDialog.close()));
  document.querySelectorAll('[data-close-event]').forEach(button => button.addEventListener('click', () => eventDialog.close()));
  document.querySelectorAll('[data-event-type]').forEach(button => button.addEventListener('click', () => openEventForm(selectedOrchid, button.dataset.eventType)));
  document.querySelector('#add-photo-log').addEventListener('click', () => document.querySelector('#gallery-photo').click());
  document.querySelector('#edit-orchid').addEventListener('click', () => { detailDialog.close(); openEdit(selectedOrchid); });
  document.querySelector('#genus-select').addEventListener('change', event => {
    const custom = document.querySelector('#genus-custom');
    custom.hidden = event.target.value !== '__custom';
    if (!custom.hidden) custom.focus();
  });
  document.querySelector('#photo').addEventListener('change', event => { document.querySelector('#photo-label').textContent = event.target.files[0]?.name || 'Choose a main photo'; });
  document.querySelector('#main-photo-from-detail').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file || !selectedOrchid) return;
    try {
      const updated = await uploadMainPhoto(selectedOrchid.id, file);
      await loadOrchids();
      const current = orchids.find(item => Number(item.id) === Number(updated.id));
      if (current) showDetails(current);
    } catch (error) { status.textContent = error.message; status.className = 'status error'; }
  });
  document.querySelector('#gallery-photo').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file || !photoLogOrchid) return;
    try {
      await uploadGalleryPhoto(photoLogOrchid.id, file);
      await loadOrchids();
      photoLogOrchid = orchids.find(item => Number(item.id) === Number(photoLogOrchid.id)) || photoLogOrchid;
      renderPhotoLog();
    } catch (error) { status.textContent = error.message; status.className = 'status error'; }
  });
  nextButton.addEventListener('click', () => {
    errorBox.textContent = '';
    if (!document.querySelector('#name').value.trim()) { errorBox.textContent = 'Please enter a name for this orchid.'; document.querySelector('#name').focus(); return; }
    if (document.querySelector('#genus-select').value === '__custom' && !document.querySelector('#genus-custom').value.trim()) { errorBox.textContent = 'Please enter the custom genus.'; document.querySelector('#genus-custom').focus(); return; }
    showStep(2);
  });
  backButton.addEventListener('click', () => { errorBox.textContent = ''; showStep(1); });
  document.querySelectorAll('#filters select, #filters input, #search').forEach(control => control.addEventListener('input', renderOrchids));
  document.querySelectorAll('#filters select').forEach(control => control.addEventListener('change', renderOrchids));
  form.addEventListener('submit', async event => {
    event.preventDefault(); errorBox.textContent = ''; saveButton.disabled = true;
    const genusSelect = document.querySelector('#genus-select').value;
    const genus = genusSelect === '__custom' ? document.querySelector('#genus-custom').value.trim() : genusSelect;
    const payload = {
      name: document.querySelector('#name').value.trim(), genus: arrayValue(genus),
      comment: document.querySelector('#comment').value.trim(), farm: arrayValue(document.querySelector('#farm').value),
      seller: arrayValue(document.querySelector('#seller').value), date_arrived: document.querySelector('#date_arrived').value || null,
      price_usd: document.querySelector('#price_usd').value || null
    };
    const mainPhotoFile = document.querySelector('#photo').files[0];
    let saved = null;
    try {
      if (editing) saved = await api(`/api/orchids/${editing.id}/`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      else saved = await api('/api/orchids/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      await uploadMainPhoto(saved.id, mainPhotoFile);
      dialog.close(); resetForm(); await loadOrchids();
    } catch (error) {
      if (saved) {
        dialog.close(); resetForm(); await loadOrchids();
        status.textContent = `Orchid saved, but the main photo could not be uploaded: ${error.message}`;
        status.className = 'status error';
      } else errorBox.textContent = error.message;
    }
    finally { saveButton.disabled = false; }
  });

  eventForm.addEventListener('submit', async event => {
    event.preventDefault();
    const eventError = document.querySelector('#event-error');
    const saveEvent = document.querySelector('#save-event');
    eventError.textContent = '';
    saveEvent.disabled = true;
    try {
      await api('/api/events/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
        orchid: selectedOrchid.id,
        event_type: document.querySelector('#event-type').value,
        event_date: document.querySelector('#event-date').value,
        notes: document.querySelector('#event-notes').value.trim()
      })});
      eventDialog.close();
      await loadOrchids();
      const current = orchids.find(item => Number(item.id) === Number(selectedOrchid.id));
      if (current) { selectedOrchid = current; renderOrchids(); }
    } catch (error) { eventError.textContent = error.message; }
    finally { saveEvent.disabled = false; }
  });

  async function loadPreorders() {
    status.textContent = 'Loading your pre-orders…'; status.className = 'status';
    try {
      preorders = await api('/api/preorders/');
      const target = preorderList; target.replaceChildren();
      preorders.forEach((item, index) => {
        const row = el('div', 'preorder-row');
        row.append(el('span', 'row-number', `#${String(item.id).padStart(3, '0')}`));
        row.append(el('strong', 'row-name', item.name || 'Untitled pre-order'));
        row.append(el('span', 'row-genus', valueOf(item, 'genus') || '—'));
        row.append(el('span', 'preorder-farm', valueOf(item, 'farm') || '—'));
        row.append(el('span', 'preorder-status', item.arrived ? 'Arrived' : 'On the way'));
        row.append(el('span', 'row-date', formatDate(item.expected_arrival)));
        target.append(row);
      });
      document.querySelector('#preorder-count').textContent = preorders.length;
      document.querySelector('#result-count').textContent = `${preorders.length} ${preorders.length === 1 ? 'pre-order' : 'pre-orders'}`;
      emptyState.hidden = preorders.length > 0;
      if (!preorders.length) { document.querySelector('#empty-title').textContent = 'No pre-orders yet'; document.querySelector('#empty-copy').textContent = 'Your upcoming orchid arrivals will appear here.'; }
      status.textContent = '';
    } catch (error) { status.textContent = error.message; status.className = 'status error'; }
  }

  function initializeCollectionView() {
    document.querySelector('[data-nav="orchids"]').classList.toggle('active', !isPreorders && !isWishlist);
    document.querySelector('[data-nav="preorders"]').classList.toggle('active', isPreorders);
    document.querySelector('[data-nav="wishlist"]').classList.toggle('active', isWishlist);
    if (isWishlist) {
    document.querySelector('#page-title').textContent = 'Whish List';
    document.querySelector('#breadcrumb').textContent = 'Whish List';
    document.querySelector('.intro-row .primary-button').hidden = true;
    document.querySelector('.side-action').hidden = true;
    document.querySelector('.search-box').hidden = true;
    filters.hidden = true; document.querySelector('#list-header').hidden = true;
    list.hidden = true; preorderList.hidden = true;
    document.querySelector('#empty-title').textContent = 'Your wish list is empty';
    document.querySelector('#empty-copy').textContent = 'Orchids you want to find will appear here.';
    emptyState.hidden = false;
    emptyState.querySelector('[data-open-form]').hidden = true;
    status.textContent = '';
    } else if (isPreorders) {
    document.querySelector('#page-title').textContent = 'Pre-orders';
    document.querySelector('#breadcrumb').textContent = 'Pre-orders';
    document.querySelector('#list-header').innerHTML = '<span>RECORD</span><span>NAME</span><span>GENUS</span><span>FARM</span><span>STATUS</span><span>EXPECTED</span>';
    document.querySelector('#list-header').classList.add('preorder-header');
    document.querySelector('.intro-row .primary-button').hidden = true;
    document.querySelector('.side-action').hidden = true;
    document.querySelector('.search-box').hidden = true;
    filters.hidden = true; document.querySelector('#list-header').hidden = true; list.hidden = true; preorderList.hidden = false; emptyState.querySelector('[data-open-form]').hidden = true;
    document.querySelector('#search').value = '';
    loadPreorders();
    } else { loadOrchids(); }
  }

  document.querySelector('#open-login').addEventListener('click', () => openAuth('login'));
  document.querySelector('#open-register').addEventListener('click', () => openAuth('register'));
  document.querySelector('#close-auth').addEventListener('click', () => authDialog.close());
  document.querySelector('#auth-switch').addEventListener('click', () => openAuth(authDialog.dataset.mode === 'register' ? 'login' : 'register'));
  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const mode = authDialog.dataset.mode;
    const submit = document.querySelector('#auth-submit');
    const error = document.querySelector('#auth-error');
    error.textContent = '';
    submit.disabled = true;
    try {
      const response = await fetch(`/api/auth/${mode}/`, {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrfToken()},
        body: JSON.stringify({
          email: document.querySelector('#auth-email').value.trim(),
          password: document.querySelector('#auth-password').value,
          ...(mode === 'register' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localStorage.getItem('orchid-device-id') || '') ? {legacy_device_id: localStorage.getItem('orchid-device-id')} : {})
        })
      });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        const messages = data?.detail ? [data.detail] : Object.values(data || {}).flat();
        throw new Error(messages.join(' ') || 'Could not sign in. Please try again.');
      }
      authDialog.close();
      authForm.reset();
      localStorage.removeItem('orchid-access-token');
      if (mode === 'register') localStorage.removeItem('orchid-device-id');
      showApp({user_id: data.user_id, email: data.email});
    } catch (error) { document.querySelector('#auth-error').textContent = error.message; }
    finally { submit.disabled = false; }
  });
  document.querySelector('#profile-menu-button').addEventListener('click', event => {
    event.stopPropagation();
    const dropdown = document.querySelector('#profile-dropdown');
    dropdown.hidden = !dropdown.hidden;
    document.querySelector('#profile-menu-button').setAttribute('aria-expanded', String(!dropdown.hidden));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.profile-menu-wrap')) {
      document.querySelector('#profile-dropdown').hidden = true;
      document.querySelector('#profile-menu-button').setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelector('#logout-button').addEventListener('click', async () => {
    try { await api('/api/auth/logout/', {method: 'POST'}); }
    catch (_) { /* The session may already have expired; still return to the sign-in screen. */ }
    document.querySelector('#profile-dropdown').hidden = true;
    orchids = []; photos = []; events = [];
    showAuthScreen();
  });
  startApp();
})();
