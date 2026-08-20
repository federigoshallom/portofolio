document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const container = document.getElementById('detail-content');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  fetch('projects.json')
    .then(res => res.json())
    .then(projects => {
      const project = projects.find(p => p.id === id);
      if (!project) {
        container.innerHTML = `<p>Project not found.</p><p class="muted">It may have been renamed or removed.</p>`;
        return;
      }

      document.title = `${project.title} — Federigo Mamahit`;

      const detailParagraphs = (project.details || project.description || '')
        .split(/\n\s*\n/)
        .map(p => `<p>${p.trim()}</p>`)
        .join('');

      container.innerHTML = `
        ${project.image ? `<img class="detail-image" src="${project.image}" alt="${project.title}">` : ''}
        <h1 class="detail-title">${project.title}</h1>
        ${project.tools ? `<span class="detail-tools">${project.tools}</span>` : ''}
        <div class="detail-body">${detailParagraphs}</div>
        ${project.link ? `<a class="detail-link" href="${project.link}" target="_blank" rel="noopener">Visit project →</a>` : ''}
      `;
    })
    .catch(() => {
      container.innerHTML = `<p>Couldn't load this project.</p><p class="muted">Make sure projects.json is in the same folder (this only works when served over http, not opened directly as a file).</p>`;
    });
});
