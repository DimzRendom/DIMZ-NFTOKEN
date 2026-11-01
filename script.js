(() => {
      const touchDevice = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (touchDevice) {
        const viewport = document.querySelector('#viewport-meta');
        if (viewport) viewport.setAttribute('content', 'width=980, initial-scale=1, maximum-scale=5, user-scalable=yes');
      }
    })();

const $ = (id) => document.getElementById(id);

const btnGenerate = $('btn-generate');
const btnBatch = $('btn-batch');
const batchCount = $('batch-count');
const statusEl = $('status');
const resultsEl = $('results');

function setLoading(btn, loading) {
  const spinner = btn.querySelector('.spinner');
  const label = btn.querySelector('.label') || btn;
  btn.disabled = loading;
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function showStatus(msg, type = 'success') {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  }
}

const API_BASE = 'https://obinmds-netfix.vercel.app';

async function readApiResponse(res) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      `Server mengembalikan respons non-JSON (HTTP ${res.status})${preview ? `: ${preview}` : '.'}`
    );
  }
}

function renderCard(result, index) {
  if (!result.success) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="card-head">
        <h3>❌ Gagal #${index + 1}</h3>
        <span class="badge bad">ERROR</span>
      </div>
      <div class="meta-item">
        <div class="meta-label">Pesan</div>
        <div class="meta-value">${escapeHtml(serverErrorMessage(result.error, index + 1))}</div>
      </div>
    `;
    return div;
  }

  const { token, expiry, profile: rawProfile, links: rawLinks, allLinks: rawAllLinks, valid, lifetimeFormatted, type } = result;
  const profile = rawProfile || {};
  const links = rawLinks || {};
  const allLinks = rawAllLinks || {};

  const card = document.createElement('div');
  card.className = 'card';

  const netflixChromeUrl = links.pc || links.android || `https://www.netflix.com/?nftoken=${encodeURIComponent(token)}`;
  const androidUrl = netflixChromeUrl.includes('/unsupported')
    ? netflixChromeUrl.replace('/unsupported', '/browse')
    : netflixChromeUrl.replace('://netflix.com/', '://www.netflix.com/');
  const linksArr = [
    { icon: '🖥️', label: 'PC / Browser', url: netflixChromeUrl },
    { icon: '📱', label: 'Chrome Android', url: androidUrl },
    { icon: '📺', label: 'TV (6 digit)', url: links.tv || '' },
    { icon: '📺', label: 'TV (8 digit)', url: allLinks?.tv8 || '' }
  ].filter((l) => l.url);

  card.innerHTML = `
    <div class="card-head">
      <h3>🎬 Token #${index + 1}</h3>
      <span class="badge ${valid ? 'ok' : 'bad'}">${valid ? '✓ VALID' : '✗ EXPIRED'}</span>
    </div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Expired</div>
        <div class="meta-value">${escapeHtml(expiry)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Sisa Waktu</div>
        <div class="meta-value">${escapeHtml(lifetimeFormatted || '-')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Country</div>
        <div class="meta-value">${escapeHtml(profile.country || 'Tidak diketahui')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Plan</div>
        <div class="meta-value">${escapeHtml(profile.plan || 'Tidak diketahui')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Type</div>
        <div class="meta-value">${escapeHtml(type)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Generated</div>
        <div class="meta-value">${new Date(result.generatedAt).toLocaleTimeString('id-ID')}</div>
      </div>
    </div>
    <div class="links"></div>
    <div class="meta-label" style="margin-bottom:6px;">🔑 Token</div>
    <div class="token-copy-row">
      <div class="token-box" tabindex="0"></div>
      <button class="copy-btn token-copy-btn" type="button">📋 Copy</button>
    </div>
  `;

  const linksBox = card.querySelector('.links');
  linksArr.forEach((l) => {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <span class="label">${l.icon} ${l.label}</span>
      <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.url)}</a>
      <button class="copy-btn">📋 Copy</button>
    `;
    row.querySelector('.copy-btn').addEventListener('click', async (e) => {
      await copyText(l.url);
      const b = e.currentTarget;
      const old = b.textContent;
      b.textContent = '✓ Copied!';
      setTimeout(() => (b.textContent = old), 1200);
    });
    linksBox.appendChild(row);
  });

  const tokenBox = card.querySelector('.token-box');
  tokenBox.textContent = token;

  tokenBox.style.cursor = 'pointer';
  tokenBox.title = 'Klik untuk copy token';
  tokenBox.addEventListener('click', async () => {
    await copyText(token);
    const old = tokenBox.textContent;
    tokenBox.textContent = '✓ Token copied!';
    setTimeout(() => (tokenBox.textContent = old), 1000);
  });
  card.querySelector('.token-copy-btn').addEventListener('click', async (event) => {
    await copyText(token);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = '✓ Copied!';
    setTimeout(() => (button.textContent = old), 1200);
  });

  if (settingAutocopy?.checked && netflixChromeUrl) {
    copyText(netflixChromeUrl);
  }

  saveGeneratedLink(result);
  return card;
}

let automaticServerNumber = 1;

function serverErrorMessage(error, fallbackNumber = 1) {
  const message = String(error || '');
  const explicitNumber = message.match(/server\s*(?:#|nomor\s*)?\s*(\d+)/i)?.[1];
  const serverNumber = explicitNumber || fallbackNumber;
  automaticServerNumber = (Number(serverNumber) % 10) + 1;
  return `MAAF SERVER #${serverNumber} SEDANG ERROR.`;
}

async function doGenerate() {
  setLoading(btnGenerate, true);
  hideStatus();
  resultsEl.innerHTML = '';

  try {
    showStatus('⏳ Sedang generate token...', 'success');

    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await readApiResponse(res);

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal generate token');
    }

    showStatus('✅ Token berhasil di-generate!', 'success');
    resultsEl.appendChild(renderCard(data, 0));
  } catch (err) {
    showStatus(serverErrorMessage(err, automaticServerNumber), 'error');
  } finally {
    setLoading(btnGenerate, false);
  }
}

async function doBatch() {
  const count = Math.min(Math.max(parseInt(batchCount.value) || 1, 1), 10);
  setLoading(btnBatch, true);
  hideStatus();
  resultsEl.innerHTML = '';

  try {
    showStatus(`🔄 Sedang generate ${count} token...`, 'success');

    const res = await fetch(`${API_BASE}/api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, delay: 1500 })
    });

    const data = await readApiResponse(res);

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal batch generate');
    }

    showStatus(
      `✅ Berhasil: ${data.successCount}/${data.total} token di-generate`,
      data.successCount > 0 ? 'success' : 'error'
    );

    data.results.forEach((r, i) => {
      resultsEl.appendChild(renderCard(r, i));
    });
  } catch (err) {
    showStatus(serverErrorMessage(err, automaticServerNumber), 'error');
  } finally {
    setLoading(btnBatch, false);
  }
}

const menuButton = $('menu-button');
const menuOverlay = $('menu-overlay');
const closeMenu = $('close-menu');
const settingBatch = $('setting-batch');
const settingAutocopy = $('setting-autocopy');
const settingAccent = $('setting-accent');
const saveSettings = $('save-settings');
const btnClear = $('btn-clear');
const scrollTopButton = $('scroll-top');
const scrollBottomButton = $('scroll-bottom');

scrollTopButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
scrollBottomButton?.addEventListener('click', () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
  document.body.classList.add(`theme-${theme}`);
  const selected = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (selected) selected.checked = true;
}

function openMenu() {
  menuOverlay.classList.add('open');
  menuOverlay.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMenuPanel() {
  menuOverlay.classList.remove('open');
  menuOverlay.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('dimzGeneratorSettings') || '{}');
  const defaultCount = Math.min(Math.max(parseInt(settings.batchCount) || 3, 1), 10);
  settingBatch.value = defaultCount;
  batchCount.value = defaultCount;
  settingAutocopy.checked = Boolean(settings.autoCopy);
  settingAccent.value = settings.accentColor || '#3157d9';
  applyAccent(settings.accentColor || '#3157d9');
  applyTheme(['light', 'dark', 'auto'].includes(settings.theme) ? settings.theme : 'dark');
}

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-bright', color);
}

settingAccent.addEventListener('input', () => applyAccent(settingAccent.value));

menuButton.addEventListener('click', openMenu);
closeMenu.addEventListener('click', closeMenuPanel);
menuOverlay.addEventListener('click', (event) => {
  if (event.target === menuOverlay) closeMenuPanel();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenuPanel();
});
document.querySelectorAll('input[name="theme"]').forEach((option) => {
  option.addEventListener('change', () => applyTheme(option.value));
});
saveSettings.addEventListener('click', () => {
  const settings = {
    batchCount: Math.min(Math.max(parseInt(settingBatch.value) || 1, 1), 10),
    autoCopy: settingAutocopy.checked,
    accentColor: settingAccent.value,
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'auto'
  };
  localStorage.setItem('dimzGeneratorSettings', JSON.stringify(settings));
  applyAccent(settings.accentColor);
  batchCount.value = settings.batchCount;
  saveSettings.textContent = '✓ Pengaturan tersimpan';
  setTimeout(() => { saveSettings.textContent = 'Simpan pengaturan'; }, 1200);
});

function detectOS() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    const version = ua.match(/Android\s([0-9.]+)/)?.[1];
    return `Android ${version || ''}`;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) return /iPad/i.test(ua) ? 'iPadOS' : 'iOS';
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'OS tidak diketahui';
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/EdgA|EdgiOS|Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Chrome|CriOS/i.test(ua)) return 'Chrome';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Browser tidak diketahui';
}

function getGPUName() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'Tidak tersedia';
  } catch {
    return 'Tidak tersedia';
  }
}

function measureFPS() {
  const fpsEl = $('device-fps');
  if (!fpsEl) return;
  let frames = 0;
  const started = performance.now();
  function count(now) {
    frames += 1;
    const elapsed = now - started;
    if (elapsed >= 2000) {
      fpsEl.textContent = `${Math.round(frames * 1000 / elapsed)} FPS`;
    } else {
      requestAnimationFrame(count);
    }
  }
  requestAnimationFrame(count);
}

function connectionProvider() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return 'Provider tidak tersedia';
  const type = connection.effectiveType ? connection.effectiveType.toUpperCase() : 'Tidak diketahui';
  const downlink = Number(connection.downlink || 0);
  return downlink > 0 ? `${type} • perkiraan ${downlink} Mbps` : type;
}

async function detectProvider() {
  const providerEl = $('device-provider');
  if (!providerEl) return;
  try {
    const response = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!response.ok) throw new Error('Provider tidak tersedia');
    const info = await response.json();
    providerEl.textContent = info.org || info.network || info.asn || 'Tidak dilaporkan browser';
  } catch {
    providerEl.textContent = 'Tidak dilaporkan browser';
  }
}

async function testNetwork() {
  const speedEl = $('device-speed');
  const streamEl = $('stream-status');
  const networkEl = $('device-network');
  if (!speedEl || !streamEl || !networkEl) return;
  speedEl.textContent = 'Sedang menguji...';
  streamEl.className = 'stream-status';
  streamEl.textContent = 'Menilai kestabilan jaringan...';
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  networkEl.textContent = `${connectionProvider()}${connection?.saveData ? ' • Hemat data aktif' : ''}`;

  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const testURL = `https://media.themoviedb.org/t/p/w1280/aMD179LsRq3oyFeAUSjij3dDtRX.jpg?speed=${Date.now()}`;
    const response = await fetch(testURL, { signal: controller.signal, cache: 'reload' });
    if (!response.ok) throw new Error('Gagal mengakses server');
    const blob = await response.blob();
    const elapsed = Math.max((performance.now() - start) / 1000, 0.25);
    const effectiveBytes = blob.size > 0 ? blob.size : 250000;
    const rawMbps = (effectiveBytes * 8 / 1000000) / elapsed;
    const mbps = rawMbps > 1000 ? rawMbps / 8 : rawMbps;
    speedEl.textContent = `${mbps.toFixed(1)} Mbps`;

    streamEl.className = mbps >= 15 ? 'stream-status stable' : mbps >= 5 ? 'stream-status warning' : 'stream-status unstable';
    streamEl.textContent = mbps >= 15
      ? 'BOT: JARINGAN MU STABIL UNTUK NONTON NETFLIX'
      : mbps >= 5
        ? 'BOT: JARINGAN CUKUP UNTUK NONTON, DISARANKAN HD'
        : 'BOT: JARINGAN MU BELUM STABIL UNTUK NONTON NETFLIX';
  } catch {
    speedEl.textContent = 'Tes gagal';
    streamEl.className = 'stream-status unstable';
    streamEl.textContent = 'BOT: JARINGAN TIDAK BISA DIUJI. COBA SAMBUNGAN LAIN';
  } finally {
    clearTimeout(timeout);
  }
}

function loadDeviceInfo() {
  if ($('device-name')) $('device-name').textContent = navigator.platform || 'Tidak diketahui';
  if ($('device-os')) $('device-os').textContent = `${detectOS()} • ${detectBrowser()}`;
  if ($('device-screen')) $('device-screen').textContent = `${screen.width} × ${screen.height}${devicePixelRatio ? ` • DPR ${devicePixelRatio}` : ''}`;
  if ($('device-cpu')) $('device-cpu').textContent = `${navigator.hardwareConcurrency || 'Tidak diketahui'} core`;
  if ($('device-gpu')) $('device-gpu').textContent = getGPUName();
  measureFPS();
  detectProvider();
  testNetwork();
}

function clearResults() {
  resultsEl.innerHTML = '';
  hideStatus();
  setLoading(btnGenerate, false);
  setLoading(btnBatch, false);
}

const SAVE_LINKS_KEY = 'dimzSavedDeviceLinks';

function getSavedLinkData() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_LINKS_KEY) || '{"slots":[],"manual":[]}');
  } catch {
    return { slots: [], manual: [] };
  }
}

function setSavedLinkData(data) {
  localStorage.setItem(SAVE_LINKS_KEY, JSON.stringify(data));
}

function simpleHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function currentDeviceProfile() {
  const gpu = getGPUName();
  const identity = [detectOS(), detectBrowser(), navigator.platform, screen.width, screen.height, devicePixelRatio, navigator.hardwareConcurrency || '', gpu, navigator.language].join('|');
  const fingerprint = simpleHash(identity);
  return {
    id: fingerprint,
    name: `${detectOS()} / ${detectBrowser()} / ${screen.width}x${screen.height}`,
    spec: `${navigator.hardwareConcurrency || '?'} core • DPR ${devicePixelRatio || 1}`
  };
}

function formatSaveDate(value) {
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function saveGeneratedLink(result) {
  if (!result?.success || !result?.token) return;
  const data = getSavedLinkData();
  const device = currentDeviceProfile();
  let slot = data.slots.find((item) => item.deviceId === device.id);
  if (!slot) {
    slot = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      deviceId: device.id,
      name: `Save ${data.slots.length + 1}`,
      deviceName: device.name,
      deviceSpec: device.spec,
      links: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.slots.push(slot);
  }
  slot.results = [...(slot.results || []), result].slice(-10);
  slot.links = [result.links?.pc, result.links?.android, result.links?.tv, result.allLinks?.tv8].filter(Boolean);
  slot.updatedAt = new Date().toISOString();
  setSavedLinkData(data);
  renderSavedLinks();
}

function renderSavedLinks() {
  const data = getSavedLinkData();
  const device = currentDeviceProfile();
  const currentLabel = $('current-device-save');
  if (currentLabel) currentLabel.textContent = `${device.name} • ID ${device.id.toUpperCase()}`;

  const slotsEl = $('saved-device-slots');
  if (slotsEl) {
    slotsEl.innerHTML = '';
    if (!data.slots.length) {
      const empty = document.createElement('small');
      empty.textContent = 'Belum ada Save Link otomatis dari device ini.';
      slotsEl.appendChild(empty);
    }
    data.slots.forEach((slot) => {
      const box = document.createElement('div');
      box.className = `saved-slot${slot.deviceId === device.id ? ' active' : ''}`;
      box.innerHTML = `
        <input class="saved-slot-name-input" value="${escapeHtml(slot.name)}" aria-label="Nama save link" maxlength="30">
        <small class="saved-slot-meta">${escapeHtml(slot.deviceName)} • ${escapeHtml(slot.deviceSpec)}</small>
        <small class="saved-slot-meta">Terakhir dibuka: ${escapeHtml(formatSaveDate(slot.updatedAt))}</small>
        <div class="saved-slot-actions">
          <button class="mini-action saved-open" type="button">Buka link</button>
          <button class="mini-action saved-delete" type="button">Hapus</button>
        </div>`;
      box.querySelector('.saved-slot-name-input').addEventListener('change', (event) => {
        const defaultName = `Save ${data.slots.indexOf(slot) + 1}`;
        const enteredName = event.target.value.trim();
        slot.customName = Boolean(enteredName && enteredName !== defaultName);
        slot.name = enteredName || defaultName;
        setSavedLinkData(data);
      });
      box.querySelector('.saved-open').addEventListener('click', () => restoreSavedSlot(slot));
      box.querySelector('.saved-delete').addEventListener('click', () => {
        data.slots = data.slots.filter((item) => item.id !== slot.id);
        data.slots.forEach((item, index) => {
          if (!item.customName) item.name = `Save ${index + 1}`;
        });
        setSavedLinkData(data);
        renderSavedLinks();
      });
      slotsEl.appendChild(box);
    });
  }

  const manualEl = $('manual-link-list');
  if (manualEl) {
    manualEl.innerHTML = '';
    data.manual.forEach((item) => {
      const box = document.createElement('div');
      box.className = 'manual-link-item';
      box.innerHTML = `
        <strong>${escapeHtml(item.name)}</strong>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
        <small>${escapeHtml(formatSaveDate(item.date))}</small>
        ${item.note ? `<small>Catatan: ${escapeHtml(item.note)}</small>` : ''}
        <div class="manual-link-actions"><button class="mini-action manual-delete" type="button">Hapus</button></div>`;
      box.querySelector('.manual-delete').addEventListener('click', () => {
        data.manual = data.manual.filter((entry) => entry.id !== item.id);
        setSavedLinkData(data);
        renderSavedLinks();
      });
      manualEl.appendChild(box);
    });
  }
}

function restoreSavedSlot(slot) {
  resultsEl.innerHTML = '';
  hideStatus();
  const savedResults = slot.results?.filter((result) => result?.success && result?.token) || [];
  if (savedResults.length) {
    savedResults.forEach((result, index) => {
      resultsEl.appendChild(renderCard(result, index));
    });
    showStatus(`✅ Memuat ${savedResults.length} link tersimpan dari ${slot.name}`, 'success');
  } else if (Array.isArray(slot.links) && slot.links.length) {
    slot.links.forEach((url, index) => {
      const tokenMatch = url.match(/[?&]nftoken=([^&#]+)/);
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';
      if (!token) return;
      resultsEl.appendChild(renderCard({
        success: true,
        token,
        expiry: 'Tanggal tersimpan',
        generatedAt: slot.updatedAt,
        profile: {},
        lifetimeFormatted: '-',
        type: 'saved',
        valid: true,
        links: { pc: slot.links[0] || '', android: slot.links[1] || '', tv: slot.links[2] || '' },
        allLinks: { tv8: slot.links[3] || '' }
      }, index));
    });
  }
  window.scrollTo({ top: resultsEl.offsetTop, behavior: 'smooth' });
}

function restoreCurrentDeviceSlot() {
  const device = currentDeviceProfile();
  const data = getSavedLinkData();
  const slot = [...data.slots].reverse().find((item) => item.deviceId === device.id);
  if (slot?.links?.length) restoreSavedSlot(slot);
}

loadSettings();
loadDeviceInfo();
renderSavedLinks();
restoreCurrentDeviceSlot();
$('toggle-saved-links')?.addEventListener('click', () => {
  const panel = $('saved-links-panel');
  panel?.classList.toggle('hidden');
  renderSavedLinks();
  if (!panel?.classList.contains('hidden')) panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
$('close-saved-links')?.addEventListener('click', () => {
  $('saved-links-panel')?.classList.add('hidden');
});
$('save-manual-link')?.addEventListener('click', () => {
  const name = $('manual-link-name').value.trim();
  const url = $('manual-link-url').value.trim();
  const note = $('manual-link-note').value.trim();
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !name) throw new Error('Invalid');
    const data = getSavedLinkData();
    data.manual.push({ id: `${Date.now()}`, name, url: parsed.href, note, date: new Date().toISOString() });
    setSavedLinkData(data);
    $('manual-link-name').value = '';
    $('manual-link-url').value = '';
    $('manual-link-note').value = '';
    renderSavedLinks();
  } catch {
    showStatus('MAAF NAMA DAN LINK MANUAL BELUM VALID.', 'error');
  }
});
$('test-network')?.addEventListener('click', testNetwork);
btnGenerate.addEventListener('click', doGenerate);
btnBatch.addEventListener('click', doBatch);
btnClear.addEventListener('click', clearResults);

const tutorialSteps = [
  {
    icon: '🎬',
    title: 'Cara memakai NFTOKEN Generator',
    text: 'Tekan Generate Token untuk membuat tautan Netflix NFToken secara otomatis.',
    target: '#btn-generate'
  },
  {
    icon: '⚡',
    title: 'Generate banyak sekaligus',
    text: 'Atur angka pada kolom batch, lalu tekan Batch Generate untuk membuat beberapa token sekaligus.',
    target: '#batch-count'
  },
  {
    icon: '🔗',
    title: 'Pilih dan salin tautan',
    text: 'Link dapat digeser ke kanan jika panjang. Gunakan tombol Copy di sampingnya untuk menyalin link atau token.',
    target: '#results'
  },
  {
    icon: '💾',
    title: 'Gunakan Save Link',
    text: 'Link hasil generate dapat disimpan otomatis ke perangkat melalui Save Link, lalu dibuka kembali kapan saja.',
    target: '#toggle-saved-links'
  },
  {
    icon: '➕',
    title: 'Simpan link manual',
    text: 'Gunakan Simpan Link Manual jika ingin menyimpan URL pilihan sendiri beserta nama dan catatan.',
    target: '#save-manual-link'
  },
  {
    icon: '⚙️',
    title: 'Atur aplikasi',
    text: 'Buka menu untuk mengubah tema, jumlah batch default, copy otomatis, serta warna efek 3D mouse.',
    target: '#menu-button'
  },
  {
    icon: '📶',
    title: 'Cek koneksi jaringan',
    text: 'Tekan Test Jaringan Lagi untuk melihat status internet dan memastikan Netflix dapat diuji dengan lancar.',
    target: '#test-network'
  }
];

const tutorialOverlay = $('tutorial-overlay');
const tutorialTitle = $('tutorial-title');
const tutorialText = $('tutorial-text');
const tutorialIcon = $('tutorial-icon');
const tutorialStepNumber = $('tutorial-step-number');
const tutorialNext = $('tutorial-next');
const tutorialDots = [...document.querySelectorAll('.tutorial-progress span')];
let tutorialStep = 0;

function closeTutorial() {
  tutorialOverlay?.classList.add('hidden');
  localStorage.setItem('nftokenTutorialCompleted', 'true');
  document.body.style.overflow = '';
}

function showTutorialStep() {
  const step = tutorialSteps[tutorialStep];
  tutorialIcon.textContent = step.icon;
  tutorialTitle.textContent = step.title;
  tutorialText.textContent = step.text;
  tutorialStepNumber.textContent = `${String(tutorialStep + 1).padStart(2, '0')} / ${String(tutorialSteps.length).padStart(2, '0')}`;
  if (tutorialDots.length !== tutorialSteps.length) {
    const progress = document.querySelector('.tutorial-progress');
    progress.innerHTML = tutorialSteps.map((_, index) => `<span${index === tutorialStep ? ' class="active"' : ''}></span>`).join('');
  }
  [...document.querySelectorAll('.tutorial-progress span')]
    .forEach((dot, index) => dot.classList.toggle('active', index === tutorialStep));
  tutorialNext.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Mulai' : 'Lanjut';
  positionTutorialTarget(step.target);
}

function positionTutorialTarget(selector) {
  const target = document.querySelector(selector);
  const highlight = $('tutorial-highlight');
  const badge = $('tutorial-badge');
  const arrow = $('tutorial-arrow');
  const modal = document.querySelector('.tutorial-modal');
  if (!target || !highlight || !arrow || !modal) return;

  if (selector === '#toggle-saved-links' || selector === '#save-manual-link' ||
      selector === '#test-network' || selector === '#menu-button') openMenu();
  if (selector === '#toggle-saved-links' || selector === '#save-manual-link') {
    $('saved-links-panel')?.classList.remove('hidden');
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    highlight.style.left = `${rect.left - 8}px`;
    highlight.style.top = `${rect.top - 8}px`;
    highlight.style.width = `${Math.max(rect.width + 16, 56)}px`;
    highlight.style.height = `${Math.max(rect.height + 16, 56)}px`;
    badge.textContent = String(tutorialStep + 1);
    badge.style.left = `${rect.left + rect.width - 5}px`;
    badge.style.top = `${rect.top - 14}px`;

    const modalRect = modal.getBoundingClientRect();
    if (window.innerWidth > 760) {
      const modalWidth = modalRect.width;
      if (rect.right + modalWidth + 40 < window.innerWidth) {
        modal.style.left = `${rect.right + 24}px`;
        modal.style.right = 'auto';
        modal.style.top = `${Math.min(window.innerHeight - modalRect.height - 20, Math.max(20, rect.top + rect.height / 2 - modalRect.height / 2))}px`;
      } else if (rect.left - modalWidth - 40 > 0) {
        modal.style.left = `${rect.left - modalWidth - 24}px`;
        modal.style.right = 'auto';
        modal.style.top = `${Math.min(window.innerHeight - modalRect.height - 20, Math.max(20, rect.top + rect.height / 2 - modalRect.height / 2))}px`;
      } else {
        modal.style.left = `${Math.max(20, Math.min(window.innerWidth - modalWidth - 20, window.innerWidth / 2 - modalWidth / 2))}px`;
        modal.style.right = 'auto';
        modal.style.top = rect.bottom + 24 + modalRect.height < window.innerHeight
          ? `${rect.bottom + 24}px`
          : `${Math.max(20, rect.top - modalRect.height - 24)}px`;
      }
    } else {
      modal.style.left = '20px';
      modal.style.right = '20px';
      modal.style.top = rect.bottom + modalRect.height + 40 < window.innerHeight
        ? `${rect.bottom + 20}px`
        : `${Math.max(20, window.innerHeight - modalRect.height - 20)}px`;
      modal.style.width = 'auto';
    }
    arrow.style.left = `${Math.min(window.innerWidth - 40, Math.max(20, rect.left + rect.width / 2 - 12))}px`;
    arrow.style.top = `${Math.max(10, rect.top < modalRect.top ? rect.bottom + 8 : rect.top - 44)}px`;
    arrow.classList.toggle('point-up', rect.top >= modalRect.top);
  });
}

function openTutorial() {
  tutorialOverlay?.classList.remove('hidden');
  tutorialStep = 0;
  showTutorialStep();
  document.body.style.overflow = 'hidden';
}

tutorialNext?.addEventListener('click', () => {
  if (tutorialStep < tutorialSteps.length - 1) {
    tutorialStep += 1;
    showTutorialStep();
  } else {
    closeTutorial();
  }
});

$('tutorial-skip')?.addEventListener('click', closeTutorial);
$('tutorial-close')?.addEventListener('click', closeTutorial);

if (!localStorage.getItem('nftokenTutorialCompleted')) {
  window.setTimeout(openTutorial, 0);
}

let uiAudioContext;

function playUiSound(type = 'click') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  uiAudioContext ||= new AudioContextClass();
  if (uiAudioContext.state === 'suspended') uiAudioContext.resume();

  const now = uiAudioContext.currentTime;
  const settings = {
    click: [560, 760, 0.045, 0.025],
    tap: [420, 610, 0.055, 0.03],
    move: [180, 150, 0.018, 0.012],
    success: [620, 920, 0.09, 0.035]
  };
  const [startFrequency, endFrequency, duration, volume] = settings[type] || settings.click;
  const oscillator = uiAudioContext.createOscillator();
  const gain = uiAudioContext.createGain();

  oscillator.type = type === 'move' ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(uiAudioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

document.addEventListener('click', () => playUiSound('click'), { passive: true });

let lastSwipeSound = 0;
document.addEventListener('touchmove', () => {
  const now = Date.now();
  if (now - lastSwipeSound > 180) {
    playUiSound('move');
    lastSwipeSound = now;
  }
}, { passive: true });

let scrollSoundTimer;
window.addEventListener('scroll', () => {
  clearTimeout(scrollSoundTimer);
  scrollSoundTimer = setTimeout(() => playUiSound('move'), 90);
}, { passive: true });

function enable3DTilt(target) {
  if (target.dataset.tiltEnabled === 'true') return;
  target.dataset.tiltEnabled = 'true';
  target.addEventListener('pointermove', (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    target.style.setProperty('--tilt-x', `${y * -7}deg`);
    target.style.setProperty('--tilt-y', `${x * 7}deg`);
  });

  target.addEventListener('pointerleave', () => {
    target.style.setProperty('--tilt-x', '0deg');
    target.style.setProperty('--tilt-y', '0deg');
  });
}

function enablePage3DTilt() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('header, .card, .controls, .side-menu, .btn, .saved-slot, .manual-save-box')
    .forEach(enable3DTilt);
}

enablePage3DTilt();
new MutationObserver(enablePage3DTilt).observe(document.body, { childList: true, subtree: true });
// Basic source and interaction protection.
(() => {
  const blockShortcut = (event) => {
    const key = event.key.toLowerCase();
    if (event.key === 'F12' || ((event.ctrlKey || event.metaKey) && ['s','u','p','a'].includes(key))) event.preventDefault();
  };
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => event.preventDefault());
  document.addEventListener('keydown', blockShortcut);
})();
