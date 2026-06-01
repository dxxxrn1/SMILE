const libraryState = {
  query: "career development south africa youth",
  title: "Career Guides",
  startIndex: 0,
  maxResults: 12,
  totalItems: 0,
  books: [],
  sort: "relevance",
};

const careerCollections = [
  {
    title: "Engineering",
    description: "Maths, physics, design, and problem-solving careers",
    query: "engineering careers mathematics physics students",
  },
  {
    title: "Information Technology",
    description: "Coding, software, cybersecurity, and data skills",
    query: "computer science programming information technology careers beginner",
  },
  {
    title: "Health Sciences",
    description: "Nursing, medicine, biology, and community health",
    query: "health sciences nursing medicine careers students",
  },
  {
    title: "Business & Finance",
    description: "Accounting, entrepreneurship, economics, and management",
    query: "business finance accounting entrepreneurship careers students",
  },
  {
    title: "Law & Public Service",
    description: "Law, politics, public administration, and social justice",
    query: "law public service careers students",
  },
  {
    title: "Creative Careers",
    description: "Design, media, writing, music, and digital content",
    query: "creative careers design media writing students",
  },
];

const searchForm = document.querySelector("#librarySearchForm");
const searchInput = document.querySelector("#librarySearchInput");
const resultsEl = document.querySelector("#libraryResults");
const titleEl = document.querySelector("#libraryResultsTitle");
const metaEl = document.querySelector("#libraryResultsMeta");
const loadMoreBtn = document.querySelector("#libraryLoadMore");
const sortSelect = document.querySelector("#librarySort");
const categoryButtons = document.querySelectorAll(".library-chip");
const collectionsEl = document.querySelector("#careerCollections");

function getToken() {
  return localStorage.getItem("token") || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(value) {
  const div = document.createElement("div");
  div.innerHTML = value || "";
  return div.textContent || div.innerText || "";
}

function truncate(value, maxLength) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function renderCollections() {
  collectionsEl.innerHTML = careerCollections
    .map(
      (collection) => `
      <button class="library-collection-btn" data-query="${escapeHtml(collection.query)}" data-title="${escapeHtml(collection.title)}">
        ${escapeHtml(collection.title)}
        <span>${escapeHtml(collection.description)}</span>
      </button>
    `,
    )
    .join("");

  collectionsEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      categoryButtons.forEach((item) => item.classList.remove("active"));
      runSearch(button.dataset.query, button.dataset.title);
    });
  });
}

function setLoading() {
  resultsEl.innerHTML = Array(8)
    .fill(
      `<article class="library-book-card" style="opacity:.55;pointer-events:none;">
        <div class="library-book-cover"></div>
        <div class="library-book-body">
          <div style="height:10px;background:#e2e8f0;border-radius:4px;width:50%;"></div>
          <div style="height:16px;background:#e2e8f0;border-radius:4px;"></div>
          <div style="height:12px;background:#e2e8f0;border-radius:4px;width:70%;"></div>
        </div>
      </article>`,
    )
    .join("");
  metaEl.textContent = "Loading books...";
}

async function fetchBooks({ append = false } = {}) {
  if (!append) {
    libraryState.startIndex = 0;
    libraryState.books = [];
    setLoading();
  }

  const url = `/api/books?q=${encodeURIComponent(libraryState.query)}&maxResults=${libraryState.maxResults}&startIndex=${libraryState.startIndex}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Could not load books.");
  }

  libraryState.totalItems = data.totalItems || 0;
  libraryState.books = append ? [...libraryState.books, ...data.books] : data.books;
  libraryState.startIndex += data.books.length;
  renderBooks();
}

function sortBooks(books) {
  return [...books].sort((a, b) => {
    if (libraryState.sort === "newest") {
      return String(b.publishedDate || "").localeCompare(String(a.publishedDate || ""));
    }
    if (libraryState.sort === "pages") {
      return Number(b.pageCount || 0) - Number(a.pageCount || 0);
    }
    if (libraryState.sort === "rating") {
      return Number(b.rating || 0) - Number(a.rating || 0);
    }
    return 0;
  });
}

function renderBooks() {
  titleEl.textContent = libraryState.title;
  metaEl.textContent = `${libraryState.books.length} shown${libraryState.totalItems ? ` from ${libraryState.totalItems.toLocaleString()} Google Books results` : ""}`;

  if (!libraryState.books.length) {
    resultsEl.innerHTML = `<div class="library-empty">No books found. Try a different search term.</div>`;
    loadMoreBtn.disabled = true;
    return;
  }

  loadMoreBtn.disabled = libraryState.books.length >= libraryState.totalItems;
  resultsEl.innerHTML = sortBooks(libraryState.books)
    .map((book) => {
      const category = book.categories?.[0] || "Reference";
      const description = truncate(book.description, 140);
      const pageText = book.pageCount ? `${book.pageCount} pages` : "Preview available";
      const ratingText = book.rating ? `Rating ${book.rating}/5` : "No rating yet";
      const previewLink = book.previewLink || book.infoLink || "#";

      return `
        <article class="library-book-card">
          <div class="library-book-cover">
            ${
              book.thumbnail
                ? `<img src="${escapeHtml(book.thumbnail)}" alt="${escapeHtml(book.title)} cover">`
                : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`
            }
          </div>
          <div class="library-book-body">
            <span class="library-book-category">${escapeHtml(category)}</span>
            <h3 class="library-book-title">${escapeHtml(book.title)}</h3>
            <p class="library-book-meta">${escapeHtml(book.authors)} · ${escapeHtml(pageText)}</p>
            <p class="library-book-meta">${escapeHtml(book.publishedDate || "Date unknown")} · ${escapeHtml(ratingText)}</p>
            <p class="library-book-desc">${escapeHtml(description)}</p>
            <div class="library-book-actions">
              <a href="${escapeHtml(previewLink)}" target="_blank" rel="noopener noreferrer" style="width: 100%; text-align: center;">Read</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function saveBook(bookId) {
  const book = libraryState.books.find((item) => item.id === bookId);
  if (!book) return;

  const saved = JSON.parse(localStorage.getItem("smileSavedBooks") || "[]");
  const exists = saved.some((item) => item.id === book.id);

  if (!exists) {
    saved.unshift(book);
    localStorage.setItem("smileSavedBooks", JSON.stringify(saved.slice(0, 30)));
  }

  alert(exists ? "This book is already saved." : "Book saved on this device.");
}

async function runSearch(query, title = "Search results") {
  libraryState.query = query;
  libraryState.title = title;

  try {
    await fetchBooks();
  } catch (error) {
    resultsEl.innerHTML = `<div class="library-error">${escapeHtml(error.message)}</div>`;
    metaEl.textContent = "Could not load books.";
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  categoryButtons.forEach((item) => item.classList.remove("active"));
  runSearch(query, `Results for "${query}"`);
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    runSearch(button.dataset.query, button.textContent.trim());
  });
});

sortSelect.addEventListener("change", () => {
  libraryState.sort = sortSelect.value;
  renderBooks();
});

loadMoreBtn.addEventListener("click", async () => {
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Loading...";

  try {
    await fetchBooks({ append: true });
  } catch (error) {
    alert(error.message);
  } finally {
    loadMoreBtn.textContent = "Load more";
  }
});

renderCollections();
runSearch(libraryState.query, libraryState.title);
