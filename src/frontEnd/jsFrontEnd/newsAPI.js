/**
 * SMILE – News Page Frontend Script
 * Updated for newsdata.io API (cursor-based pagination + smart image fallback)
 */

document.addEventListener("DOMContentLoaded", () => {

  (function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────────────────────
    const state = {
      category:   'all',
      nextPage:   null,
      pageSize:   10,
      loading:    false,
      hasMore:    true,
    };

    // ─── Element refs ────────────────────────────────────────────────────────
    const newsGrid     = document.getElementById('newsGrid');
    const loadMoreBtn  = document.getElementById('loadMoreNews');
    const categoryBtns = document.querySelectorAll('.news-category');

    // ─── Image cache (avoid duplicate Unsplash calls for same keyword) ───────
    const imageCache = {};

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-ZA', {
        day:   'numeric',
        month: 'long',
        year:  'numeric',
      });
    }

    function getCategoryLabel(url, sourceName, rawCategory) {
      if (rawCategory) {
        const map = {
          education:    'Education',
          business:     'Employment',
          politics:     'Government',
          entertainment:'Events',
          technology:   'Technology',
          science:      'Science',
          tourism:      'Tourism',
        };
        if (map[rawCategory.toLowerCase()]) return map[rawCategory.toLowerCase()];
      }
      const text = (url + sourceName).toLowerCase();
      if (text.includes('scholar') || text.includes('bursary'))  return 'Scholarships';
      if (text.includes('employ')  || text.includes('job'))       return 'Employment';
      if (text.includes('event')   || text.includes('expo'))      return 'Events';
      if (text.includes('gov')     || text.includes('nsfas'))     return 'Government';
      return 'Education';
    }

    // Extract 2-3 meaningful keywords from the article title for image search
    function extractKeywords(title, category) {
      // Strip common filler words
      const stopWords = new Set([
        'the','a','an','and','or','but','in','on','at','to','for','of',
        'with','by','from','as','is','was','are','were','be','been',
        'has','have','had','will','would','could','should','may','might',
        'that','this','these','those','it','its','new','says','say',
        'after','before','over','under','about','into','out','up','down',
        'south','africa','african','sa','how','why','what','when','who',
      ]);

      const words = title
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

      // Take top 2 meaningful words + category as context
      const keywords = words.slice(0, 2);
      if (category && category !== 'all') keywords.push(category);

      return keywords.join(' ') || category || 'south africa news';
    }

    // Fetch a relevant image from Unsplash Source (no API key needed)
    async function getSmartImage(title, category) {
      const keyword = extractKeywords(title, category);
      const cacheKey = keyword.replace(/\s+/g, '-');

      if (imageCache[cacheKey]) return imageCache[cacheKey];

      // Unsplash Source gives a random relevant image — we add a unique seed
      // per article so cards don't all show the same image
      const seed = Math.random().toString(36).slice(2, 7);
      const url  = `https://source.unsplash.com/400x220/?${encodeURIComponent(keyword)}&sig=${seed}`;

      imageCache[cacheKey] = url;
      return url;
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    async function renderCard(article) {
      const label   = getCategoryLabel(article.url, article.source?.name || '', article.category);
      const date    = formatDate(article.publishedAt);
      const excerpt = article.description
        ? article.description.slice(0, 120) + (article.description.length > 120 ? '…' : '')
        : 'Click to read the full article.';
      const title   = article.title.slice(0, 80) + (article.title.length > 80 ? '…' : '');

      // Use API image if available, otherwise fetch a smart contextual one
      const imgSrc = article.urlToImage
        ? article.urlToImage
        : await getSmartImage(article.title, article.category || label.toLowerCase());

      const card = document.createElement('article');
      card.className = 'news-card';
      card.innerHTML = `
        <div class="news-card__image">
          <img
            src="${imgSrc}"
            alt="${title}"
            crossorigin="anonymous"
            onerror="this.onerror=null; this.src='https://source.unsplash.com/400x220/?news,southafrica&sig=${Math.random().toString(36).slice(2,7)}'"
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
        newsGrid.appendChild(skeleton);
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
        state.nextPage = null;
        state.hasMore  = true;
      }

      if (!state.hasMore) {
        state.loading = false;
        return;
      }

      if (!state.nextPage) renderSkeleton();

      loadMoreBtn.disabled    = true;
      loadMoreBtn.textContent = 'Loading…';

      try {
        const params = new URLSearchParams({
          category: state.category,
          pageSize: state.pageSize,
        });

        if (state.nextPage) {
          params.set('page', state.nextPage);
        }

        const response = await fetch(`/api/news?${params}`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Unknown error');

        clearSkeletons();

        if (!data.articles.length) {
          if (!state.nextPage) showError('No news articles found for this category.');
          state.hasMore = false;
        } else {
          // Render cards with smart images (async, but renders each card as ready)
          const cardPromises = data.articles.map(article => renderCard(article));
          const cards = await Promise.all(cardPromises);
          cards.forEach(card => newsGrid.appendChild(card));

          state.nextPage = data.nextPage || null;
          state.hasMore  = !!data.nextPage;
        }

        if (state.hasMore) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = `Load More News
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>`;
        } else {
          loadMoreBtn.disabled    = true;
          loadMoreBtn.textContent = 'No more articles';
        }

      } catch (err) {
        clearSkeletons();
        console.error('[SMILE News]', err);
        showError('Could not load news. Please try again later.');
        loadMoreBtn.disabled    = false;
        loadMoreBtn.textContent = 'Retry';
      } finally {
        state.loading = false;
      }
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('news-category--active'));
        btn.classList.add('news-category--active');
        state.category = btn.dataset.category;
        loadNews(true);
      });
    });

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => loadNews());
    }

    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = newsletterForm.querySelector('.newsletter__input');
        const email = input.value.trim();
        const btn   = newsletterForm.querySelector('button[type="submit"]');

        if (!email) return;

        btn.disabled    = true;
        btn.textContent = 'Subscribing...';

        try {
          const res  = await fetch('/api/newsletter/subscribe', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email })
          });
          const data = await res.json();

          if (data.success) {
            showToastNotification('🎉 Successfully subscribed to our newsletter!');
            newsletterForm.reset();
          } else {
            showToastNotification('⚠️ ' + (data.message || 'Subscription failed.'), 'error');
          }
        } catch (err) {
          console.error('Newsletter subscribe error:', err);
          showToastNotification('❌ A network error occurred. Please try again.', 'error');
        } finally {
          btn.disabled    = false;
          btn.textContent = 'Subscribe';
        }
      });
    }

    function showToastNotification(message, type = 'success') {
      const existing = document.getElementById('news-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'news-toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    newsGrid.innerHTML = '';
    loadNews();

  })();


  const logoutTag = document.getElementById("logout");
  if (logoutTag) {
    logoutTag.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof logout === "function") {
        logout();
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("accountType");
        localStorage.removeItem("userName");
        localStorage.removeItem("initials");
        window.location.href = "/login-page";
      }
    });
  }

});