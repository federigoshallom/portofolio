document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- GitHub connection ----------
  const ghOwner = document.getElementById('ghOwner');
  const ghRepo = document.getElementById('ghRepo');
  const ghBranch = document.getElementById('ghBranch');
  const ghToken = document.getElementById('ghToken');
  const connStatus = document.getElementById('connStatus');
  const githubPanel = document.getElementById('githubPanel');

  function loadGhConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('portfolio_gh_config') || 'null');
      if (saved) {
        ghOwner.value = saved.owner || '';
        ghRepo.value = saved.repo || '';
        ghBranch.value = saved.branch || 'main';
        ghToken.value = saved.token || '';
      }
      updateConnStatus();
    } catch (e) { /* ignore */ }
  }

  function updateConnStatus() {
    const cfg = getGhConfig();
    if (cfg.owner && cfg.repo && cfg.token) {
      connStatus.textContent = `— connected to ${cfg.owner}/${cfg.repo}`;
    } else {
      connStatus.textContent = '— not connected';
      githubPanel.open = true;
    }
  }

  function getGhConfig() {
    return {
      owner: ghOwner.value.trim(),
      repo: ghRepo.value.trim(),
      branch: (ghBranch.value.trim() || 'main'),
      token: ghToken.value.trim()
    };
  }

  document.getElementById('saveGh').addEventListener('click', () => {
    const cfg = getGhConfig();
    localStorage.setItem('portfolio_gh_config', JSON.stringify(cfg));
    updateConnStatus();
    githubPanel.open = false;
  });

  loadGhConfig();

  // ---------- image mode toggle ----------
  const imgUploadWrap = document.getElementById('imgUploadWrap');
  const imgUrlWrap = document.getElementById('imgUrlWrap');
  document.querySelectorAll('input[name="imgMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isUpload = document.querySelector('input[name="imgMode"]:checked').value === 'upload';
      imgUploadWrap.style.display = isUpload ? 'block' : 'none';
      imgUrlWrap.style.display = isUpload ? 'none' : 'block';
    });
  });

  // ---------- unicode-safe base64 helpers ----------
  function b64Encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64Decode(str) { return decodeURIComponent(escape(atob(str))); }

  function slugify(str) {
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- GitHub Contents API ----------
  async function ghGetFile(cfg, path) {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`, {
      headers: { Authorization: `token ${cfg.token}`, Accept: 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`Could not fetch ${path} (${res.status}). Check owner/repo/branch/token.`);
    return res.json();
  }

  async function ghPutFile(cfg, path, contentB64, sha, message) {
    const body = { message, content: contentB64, branch: cfg.branch };
    if (sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub rejected the write to ${path} (${res.status}): ${errText.slice(0, 200)}`);
    }
    return res.json();
  }

  // ---------- form submit ----------
  const form = document.getElementById('projectForm');
  const statusEl = document.getElementById('status');
  const fallbackEl = document.getElementById('fallback');
  const fallbackCode = document.getElementById('fallbackCode');

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + (type || '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Working…', 'pending');
    fallbackEl.style.display = 'none';

    const title = document.getElementById('fTitle').value.trim();
    const description = document.getElementById('fDescription').value.trim();
    const details = document.getElementById('fDetails').value.trim();
    const tools = document.getElementById('fTools').value.trim();
    const link = document.getElementById('fLink').value.trim();
    const imgMode = document.querySelector('input[name="imgMode"]:checked').value;
    const id = slugify(title);

    let imagePath = '';
    let imageFile = null;
    let imageDataUrl = '';

    if (imgMode === 'upload') {
      const fileInput = document.getElementById('fImageFile');
      if (fileInput.files[0]) {
        imageFile = fileInput.files[0];
        imageDataUrl = await fileToDataUrl(imageFile);
        const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase();
        imagePath = `images/${id}.${ext}`;
      }
    } else {
      imagePath = document.getElementById('fImageUrl').value.trim();
    }

    const entry = { id, title, description, details, tools, image: imagePath, link };

    const cfg = getGhConfig();
    const canPublish = cfg.owner && cfg.repo && cfg.token;

    if (!canPublish) {
      showFallback(entry, imageFile);
      setStatus('GitHub isn\u2019t connected — showing the entry to add manually instead.', 'info');
      return;
    }

    try {
      // 1. update projects.json
      const file = await ghGetFile(cfg, 'projects.json');
      const currentJson = JSON.parse(b64Decode(file.content));
      currentJson.push(entry);
      const newContentB64 = b64Encode(JSON.stringify(currentJson, null, 2));
      await ghPutFile(cfg, 'projects.json', newContentB64, file.sha, `Add project: ${title}`);

      // 2. upload image if a file was chosen
      if (imageFile && imageDataUrl) {
        const imgB64 = imageDataUrl.split(',')[1];
        let existingSha;
        try {
          const existing = await ghGetFile(cfg, imagePath);
          existingSha = existing.sha;
        } catch (e) { /* file doesn't exist yet, fine */ }
        await ghPutFile(cfg, imagePath, imgB64, existingSha, `Add image for: ${title}`);
      }

      setStatus(`Published "${title}". It should appear on your site within a minute or two once GitHub Pages rebuilds.`, 'success');
      form.reset();
      imgUploadWrap.style.display = 'block';
      imgUrlWrap.style.display = 'none';
    } catch (err) {
      setStatus(`Publish failed: ${err.message}`, 'error');
      showFallback(entry, imageFile);
    }
  });

  function showFallback(entry, imageFile) {
    fallbackEl.style.display = 'block';
    fallbackCode.value = JSON.stringify(entry, null, 2) + ',';
    if (imageFile) {
      fallbackCode.value += `\n\n(Save the uploaded file as: ${entry.image})`;
    }
  }
});
