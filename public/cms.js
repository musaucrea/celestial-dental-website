(function () {
  const mountId = 'celestial-dynamic-content';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createSection(items) {
    const section = document.createElement('section');
    section.id = mountId;
    section.innerHTML = `
      <style>
        #${mountId} {
          background: #f7fbfa;
          border-top: 1px solid rgba(15, 118, 110, 0.14);
          padding: 64px 20px;
          font-family: inherit;
        }
        #${mountId} .cms-wrap {
          max-width: 1180px;
          margin: 0 auto;
        }
        #${mountId} .cms-eyebrow {
          color: #0f766e;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin: 0 0 14px;
        }
        #${mountId} h2 {
          color: #111827;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.04;
          margin: 0 0 28px;
          max-width: 760px;
        }
        #${mountId} .cms-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }
        #${mountId} article {
          background: #ffffff;
          border: 1px solid rgba(15, 118, 110, 0.14);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
        }
        #${mountId} img {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
          background: #e5f5f3;
        }
        #${mountId} .cms-card-body {
          padding: 24px;
        }
        #${mountId} h3 {
          color: #111827;
          font-size: 24px;
          line-height: 1.18;
          margin: 0 0 12px;
        }
        #${mountId} p {
          color: #4b6363;
          font-size: 16px;
          line-height: 1.7;
          margin: 0;
        }
        #${mountId} a {
          color: #0f766e;
          display: inline-flex;
          font-weight: 800;
          margin-top: 18px;
          text-decoration: none;
        }
      </style>
      <div class="cms-wrap">
        <p class="cms-eyebrow">Clinic Updates</p>
        <h2>Latest from Celestial Dental Centre</h2>
        <div class="cms-grid">
          ${items
            .map(
              (item) => `
                <article>
                  ${
                    item.imageUrl
                      ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">`
                      : ''
                  }
                  <div class="cms-card-body">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.body)}</p>
                    ${
                      item.ctaUrl && item.ctaLabel
                        ? `<a href="${escapeHtml(item.ctaUrl)}">${escapeHtml(item.ctaLabel)}</a>`
                        : ''
                    }
                  </div>
                </article>
              `,
            )
            .join('')}
        </div>
      </div>
    `;
    return section;
  }

  async function boot() {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) return;
      const data = await response.json();
      const items = (data.items || []).filter((item) => item.status === 'published');
      if (!items.length || document.getElementById(mountId)) return;
      const footer = document.querySelector('footer') || document.body.lastElementChild;
      footer
        ? footer.parentNode.insertBefore(createSection(items), footer)
        : document.body.appendChild(createSection(items));
    } catch (error) {
      console.warn('Could not load website content', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
