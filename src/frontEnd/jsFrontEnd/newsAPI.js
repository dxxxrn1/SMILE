/**
 * SMILE – News Page Frontend Script
 * Updated for newsdata.io API (cursor-based pagination + Picsum image fallback)
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

    // ─── Category → consistent Picsum seed bank ──────────────────────────────
    // Each category maps to a fixed pool of Picsum image IDs that are visually
    // relevant. Picsum never has CORS issues and needs no API key.
    const CATEGORY_IMAGES = {
      education:    [167, 256, 301, 373, 412, 447, 513, 580, 610, 668],
      business:     [0,   20,  48,  99,  180, 239, 274, 317, 395, 431],
      politics:     [10,  43,  76,  119, 165, 210, 288, 330, 450, 500],
      entertainment:[15,  55,  88,  142, 193, 260, 310, 380, 420, 490],
      technology:   [7,   36,  69,  102, 160, 220, 270, 340, 400, 460],
      science:      [25,  58,  91,  134, 175, 230, 295, 355, 415, 475],
      tourism:      [11,  44,  77,  120, 166, 211, 289, 331, 451, 501],
      default:      [1,   14,  29,  65,  110, 155, 200, 245, 290, 335],
    };

    // Give each article a unique but consistent image from its category pool
    const categoryCounters = {};
    function getFallbackImage(category) {
      const key    = category?.toLowerCase() || 'default';
      const pool   = CATEGORY_IMAGES[key] || CATEGORY_IMAGES.default;
      const idx    = (categoryCounters[key] || 0) % pool.length;
      categoryCounters[key] = idx + 1;
      const id     = pool[idx];
      return `https://picsum.photos/id/${id}/400/220`;
    }

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

    // ─── Render ──────────────────────────────────────────────────────────────

    function renderCard(article) {
      const label   = getCategoryLabel(article.url, article.source?.name || '', article.category);
      const date    = formatDate(article.publishedAt);
      const excerpt = article.description
        ? article.description.slice(0, 120) + (article.description.length > 120 ? '…' : '')
        : 'Click to read the full article.';
      const title   = article.title.slice(0, 80) + (article.title.length > 80 ? '…' : '');

      // Use the article's own image if available, else a category-matched Picsum photo
      const categoryKey = article.category?.toLowerCase() || label.toLowerCase();
      const fallbackSrc = getFallbackImage(categoryKey);
      const imgSrc      = article.urlToImage || fallbackSrc;

      const card = document.createElement('article');
      card.className = 'news-card';
      card.innerHTML = `
        <div class="news-card__image">
          <img
            src="${imgSrc}"
            alt="${title}"
            onerror="this.onerror=null; this.src='${fallbackSrc}'"
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
        // Reset counters so images start fresh on category switch
        Object.keys(categoryCounters).forEach(k => delete categoryCounters[k]);
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
          data.articles.forEach(article => newsGrid.appendChild(renderCard(article)));

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
            showToastNotification('Successfully subscribed to our newsletter!');
            newsletterForm.reset();
          } else {
            showToastNotification('' + (data.message || 'Subscription failed.'), 'error');
          }
        } catch (err) {
          console.error('Newsletter subscribe error:', err);
          showToastNotification(' A network error occurred. Please try again.', 'error');
        } finally {
          btn.disabled    = false;
          btn.textContent = 'Subscribe';
        }
      });

      const btnUnsubscribe = document.getElementById('btnUnsubscribe');
      if (btnUnsubscribe) {
        btnUnsubscribe.addEventListener('click', async () => {
          const input = newsletterForm.querySelector('.newsletter__input');
          const email = input.value.trim();

          if (!email) {
            showToastNotification('Please enter your email address to unsubscribe.', 'error');
            return;
          }

          btnUnsubscribe.disabled = true;
          const originalText = btnUnsubscribe.textContent;
          btnUnsubscribe.textContent = 'Unsubscribing...';

          try {
            const res = await fetch('/api/newsletter/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.success) {
              showToastNotification('Successfully unsubscribed from our newsletter!');
              newsletterForm.reset();
            } else {
              showToastNotification('' + (data.message || 'Unsubscription failed.'), 'error');
            }
          } catch (err) {
            console.error('Newsletter unsubscribe error:', err);
            showToastNotification('A network error occurred. Please try again.', 'error');
          } finally {
            btnUnsubscribe.disabled = false;
            btnUnsubscribe.textContent = originalText;
          }
        });
      }
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