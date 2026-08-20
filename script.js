document.addEventListener('DOMContentLoaded', () => {

  // ---- footer year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- mobile nav toggle ----
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- projects grid (loaded from projects.json) ----
  const body = document.getElementById('projects-body');
  if (!body) return;

  fetch('projects.json')
    .then(res => {
      if (!res.ok) throw new Error('projects.json not found');
      return res.json();
    })
    .then(projects => {
      if (!Array.isArray(projects) || projects.length === 0) {
        body.innerHTML = `
          <div class="table-empty">
            <p>No records yet.</p>
            <p class="muted">New analyses get logged here once they're done.</p>
          </div>`;
        return;
      }
      body.innerHTML = '';
      projects.forEach(p => {
        const card = document.createElement('a');
        card.className = 'project-card';
        card.href = `project.html?id=${encodeURIComponent(p.id || '')}`;
        card.innerHTML = `
          ${p.image ? `<img class="thumb" src="${p.image}" alt="${p.title || ''}">` : ''}
          <div class="card-body">
            <span class="cell-title">${p.title || ''}</span>
            <span class="cell-desc">${p.description || ''}</span>
            <span class="cell-tools">${p.tools || ''}</span>
            <span class="cell-link">View project →</span>
          </div>
        `;
        body.appendChild(card);
      });
    })
    .catch(() => {
      body.innerHTML = `
        <div class="table-empty">
          <p>Couldn't load projects.</p>
          <p class="muted">Make sure projects.json is in the same folder as this page (this only works when served over http, not opened directly as a file).</p>
        </div>`;
    });
});
