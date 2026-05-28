/**
 * SMILE – News Page Frontend Script
 * Drop this into: jsFrontEnd/newsJS.js
 * Add  <script src="../jsFrontEnd/newsJS.js"></script>  before </body> in news.html
 */

document.addEventListener("DOMContentLoaded" , ()=>{

  const spanInitials = document.getElementById("initials");

  const initialStored = localStorage.getItem("initials");


  if(initialStored){
    spanInitials.textContent = initialStored;
  }else{
    spanInitials.textContent = "?";
  }

  (function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    category: 'all',
    sortBy:   'publishedAt',
    page:     1,
    pageSize: 6,
    loading:  false,
    hasMore:  true,
  };

  // ─── Element refs ─────────────────────────────────────────────────────────
  const newsGrid      = document.getElementById('newsGrid');
  const loadMoreBtn   = document.getElementById('loadMoreNews');
  const categoryBtns  = document.querySelectorAll('.news-category');

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-ZA', {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    });
  }

  function getCategoryLabel(url, sourceName) {
    // Derive a display category from source or URL heuristics
    const text = (url + sourceName).toLowerCase();
    if (text.includes('scholar') || text.includes('bursary'))  return 'Scholarships';
    if (text.includes('employ') || text.includes('job'))        return 'Employment';
    if (text.includes('event') || text.includes('expo'))        return 'Events';
    if (text.includes('gov') || text.includes('nsfas'))         return 'Government';
    return 'Education';
  }

  // Fallback image bank (used when article has no image)
  const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=220&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=220&fit=crop',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=220&fit=crop',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=220&fit=crop',
  ];
  let fallbackIndex = 0;
  function getFallback() {
    return FALLBACK_IMAGES[fallbackIndex++ % FALLBACK_IMAGES.length];
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function renderCard(article) {
    const imgSrc   = article.urlToImage || getFallback();
    const label    = getCategoryLabel(article.url, article.source?.name || '');
    const date     = formatDate(article.publishedAt);
    const excerpt  = article.description
      ? article.description.slice(0, 120) + (article.description.length > 120 ? '…' : '')
      : 'Click to read the full article.';
    const title    = article.title.slice(0, 80) + (article.title.length > 80 ? '…' : '');

    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-card__image">
        <img
          src="${imgSrc}"
          alt="${title}"
          crossorigin="anonymous"
          onerror="this.src='${getFallback()}'"
        >
        <span class="news-card__category">${label}</span>
      </div>
      <div class="news-card__content">
        <h3 class="news-card__title">${title}</h3>
        <p class="news-card__excerpt">${excerpt}</p>
        <div class="news-card__footer">
          <span class="news-card__date">${date}</span>
          <a
            href="${article.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="news-card__link"
          >Read More</a>
        </div>
      </div>
    `;
    return card;
  }

  function renderSkeleton() {
    // Show placeholder cards while loading
    const grid = newsGrid;
    for (let i = 0; i < 3; i++) {
      const skeleton = document.createElement('article');
      skeleton.className = 'news-card news-card--skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      skeleton.innerHTML = `
        <div class="news-card__image" style="background:var(--color-border-tertiary,#e5e7eb);height:180px;border-radius:8px 8px 0 0;"></div>
        <div class="news-card__content" style="padding:1rem;display:flex;flex-direction:column;gap:10px;">
          <div style="height:14px;background:var(--color-border-tertiary,#e5e7eb);border-radius:4px;width:40%;"></div>
          <div style="height:18px;background:var(--color-border-tertiary,#e5e7eb);border-radius:4px;width:90%;"></div>
          <div style="height:14px;background:var(--color-border-tertiary,#e5e7eb);border-radius:4px;width:70%;"></div>
        </div>
      `;
      grid.appendChild(skeleton);
    }
  }

  function clearSkeletons() {
    document.querySelectorAll('.news-card--skeleton').forEach(el => el.remove());
  }

  function showError(message) {
    clearSkeletons();
    const err = document.createElement('p');
    err.style.cssText = 'grid-column:1/-1;text-align:center;color:#888;padding:2rem;';
    err.textContent = message;
    newsGrid.appendChild(err);
  }

  // ─── Fetch & display ──────────────────────────────────────────────────────

  async function loadNews(reset = false) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
      newsGrid.innerHTML = '';
      state.page = 1;
      state.hasMore = true;
      fallbackIndex = 0;
    }

    if (!state.hasMore) {
      state.loading = false;
      return;
    }

    // Show skeletons on initial load
    if (state.page === 1) renderSkeleton();

    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading…';

    try {
      const params = new URLSearchParams({
        category: state.category,
        sortBy:   state.sortBy,
        page:     state.page,
        pageSize: state.pageSize,
      });

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Unknown error');

      clearSkeletons();

      if (!data.articles.length) {
        if (state.page === 1) showError('No news articles found for this category.');
        state.hasMore = false;
      } else {
        data.articles.forEach(article => {
          newsGrid.appendChild(renderCard(article));
        });

        // Check if more pages exist
        const fetched = state.page * state.pageSize;
        state.hasMore = fetched < data.totalResults;
        state.page++;
      }

      // Update Load More button
      if (state.hasMore) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = `Load More News
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>`;
      } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'No more articles';
      }

    } catch (err) {
      clearSkeletons();
      console.error('[SMILE News]', err);
      showError('Could not load news. Please try again later.');
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Retry';
    } finally {
      state.loading = false;
    }
  }

  // ─── Event listeners ──────────────────────────────────────────────────────

  // Category filter buttons
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('news-category--active'));
      btn.classList.add('news-category--active');
      state.category = btn.dataset.category;
      loadNews(true);
    });
  });

  // Load More button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadNews());
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  // Clear the static placeholder cards and load live data
  newsGrid.innerHTML = '';
  loadNews();

})();


  const logoutTag = document.getElementById("logout");
      logoutTag.addEventListener("click" , ()=>{
          localStorage.removeItem("token");
          localStorage.removeItem("accountType");
          localStorage.removeItem("userName");
          localStorage.removeItem("initials");
      })

})


