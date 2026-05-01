/**
 * SMILE Dashboard JavaScript
 * Handles dashboard interactions, profile dropdown, and location services
 */

document.addEventListener("DOMContentLoaded", function () {
  initMobileNavigation();
  initProfileDropdown();
  initLocationButton();
  initOpportunityActions();
  loadEbooks();

  // Only run on pages that have these elements
  const spanID = document.getElementById("userName");
  const spanInitials = document.getElementById("initials");

  const userStored = localStorage.getItem("userName");
  const initialStored = localStorage.getItem("initials");

  if (spanID) {
    spanID.textContent = userStored || "User not Found!!!!";
  }

  if (spanInitials) {
    spanInitials.textContent = initialStored || "?";
  }
});

/**
 * Mobile Navigation Toggle
 */
function initMobileNavigation() {
  const mobileToggle = document.getElementById("mobileToggle");
  const navMenu = document.getElementById("navMenu");

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", function () {
      navMenu.classList.toggle("nav__menu--active");

      const isOpen = navMenu.classList.contains("nav__menu--active");
      mobileToggle.innerHTML = isOpen ? "&#10005;" : "&#9776;";
      mobileToggle.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", function (event) {
      if (
        !mobileToggle.contains(event.target) &&
        !navMenu.contains(event.target)
      ) {
        navMenu.classList.remove("nav__menu--active");
        mobileToggle.innerHTML = "&#9776;";
        mobileToggle.setAttribute("aria-expanded", "false");
      }
    });
  }
}

/**
 * Profile Dropdown Toggle
 */
function initProfileDropdown() {
  const profileBtn = document.querySelector(".nav__profile-btn");
  const profileMenu = document.getElementById("profileMenu");

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      profileMenu.classList.toggle("nav__profile-menu--active");
    });

    document.addEventListener("click", function (event) {
      if (
        !profileBtn.contains(event.target) &&
        !profileMenu.contains(event.target)
      ) {
        profileMenu.classList.remove("nav__profile-menu--active");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        profileMenu.classList.remove("nav__profile-menu--active");
      }
    });
  }
}

/**
 * Location Button Handler
 */
function initLocationButton() {
  const locationBtn = document.getElementById("enableLocation");

  if (!locationBtn) return;

  locationBtn.addEventListener("click", function () {
    if ("geolocation" in navigator) {
      locationBtn.innerHTML = `
        <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Getting Location...
      `;
      locationBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const { latitude, longitude } = position.coords;

          const mapPlaceholder = document.querySelector(
            ".map-placeholder__content"
          );
          if (mapPlaceholder) {
            mapPlaceholder.innerHTML = `
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <p class="map-placeholder__text" style="color: #059669; font-weight: 500;">Location enabled!</p>
              <p class="map-placeholder__text">Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
              <p class="map-placeholder__text" style="font-size: 0.8125rem;">Map integration coming soon...</p>
            `;
          }
        },
        function (error) {
          let errorMessage = "Unable to get your location.";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }

          alert(errorMessage);

          locationBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            Enable Location
          `;
          locationBtn.disabled = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  });
}

/**
 * Opportunity Card Actions
 */
function initOpportunityActions() {
  const removeButtons = document.querySelectorAll(
    ".opportunity-card__actions .btn--icon"
  );

  removeButtons.forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();

      const card = btn.closest(".opportunity-card");
      const title = card.querySelector(".opportunity-card__title").textContent;

      if (confirm(`Remove "${title}" from saved opportunities?`)) {
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "translateX(-20px)";

        setTimeout(function () {
          card.remove();
          updateSavedCount(-1);
        }, 300);
      }
    });
  });

  const downloadButtons = document.querySelectorAll(".ebook-card .btn");

  downloadButtons.forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();

      const card = btn.closest(".ebook-card");
      const title = card.querySelector(".ebook-card__title").textContent;

      btn.innerHTML = `
        <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Downloading...
      `;
      btn.disabled = true;

      setTimeout(function () {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Downloaded
        `;
        btn.style.color = "#059669";

        setTimeout(function () {
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            Download
          `;
          btn.style.color = "";
          btn.disabled = false;
        }, 2000);
      }, 1500);
    });
  });
}

/**
 * Update saved opportunities count in stats
 */
function updateSavedCount(change) {
  const statCards = document.querySelectorAll(".stat-card");

  statCards.forEach(function (card) {
    const label = card.querySelector(".stat-card__label");
    if (label && label.textContent.includes("Saved")) {
      const numberEl = card.querySelector(".stat-card__number");
      if (numberEl) {
        const currentCount = parseInt(numberEl.textContent) || 0;
        numberEl.textContent = Math.max(0, currentCount + change);
      }
    }
  });
}

/**
 * Animate spin class for loading spinners
 */
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);

/**
 * Load Ebooks — only runs if .ebooks-grid exists on the page
 */
function loadEbooks(query = "career development south africa youth") {
  const ebooksGrid = document.querySelector(".ebooks-grid");
  if (!ebooksGrid) return;

  const token = localStorage.getItem("token");

  ebooksGrid.innerHTML = Array(4)
    .fill(
      `
    <article class="ebook-card" style="opacity:0.5;pointer-events:none;">
      <div class="ebook-card__cover ebook-card__cover--orange"></div>
      <div class="ebook-card__content">
        <div style="height:10px;background:#e5e7eb;border-radius:4px;margin-bottom:8px;width:60%;"></div>
        <div style="height:14px;background:#e5e7eb;border-radius:4px;margin-bottom:6px;"></div>
        <div style="height:12px;background:#e5e7eb;border-radius:4px;width:40%;"></div>
      </div>
    </article>
  `
    )
    .join("");

  fetch(`/api/books?q=${encodeURIComponent(query)}&maxResults=4`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.books.length) {
        ebooksGrid.innerHTML =
          "<p style='color:#888;padding:1rem;'>No books found.</p>";
        return;
      }

      const colors = ["orange", "blue", "green", "purple"];
      ebooksGrid.innerHTML = "";

      data.books.forEach((book, i) => {
        const color = colors[i % colors.length];
        const shortDesc =
          book.description.slice(0, 80) +
          (book.description.length > 80 ? "…" : "");
        const pages = book.pageCount
          ? `${book.pageCount} pages`
          : "Preview available";
        const stars = book.rating
          ? "★".repeat(Math.round(book.rating)) +
            "☆".repeat(5 - Math.round(book.rating))
          : "";

        const card = document.createElement("article");
        card.className = "ebook-card";
        card.innerHTML = `
          <div class="ebook-card__cover ebook-card__cover--${color}">
            ${
              book.thumbnail
                ? `<img src="${book.thumbnail}" alt="${book.title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
                : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                   </svg>`
            }
          </div>
          <div class="ebook-card__content">
            <span class="ebook-card__category">${book.categories[0] || "Reference"}</span>
            <h3 class="ebook-card__title">${book.title}</h3>
            <p class="ebook-card__pages">${book.authors} · ${pages}</p>
            ${stars ? `<p style="font-size:12px;color:#f59e0b;letter-spacing:1px;">${stars}</p>` : ""}
            <a href="${book.previewLink}" target="_blank" rel="noopener noreferrer" class="btn btn--outline btn--sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" x2="12" y1="15" y2="3"></line>
              </svg>
              Read / Preview
            </a>
          </div>
        `;

        ebooksGrid.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("[SMILE Books]", err);
      ebooksGrid.innerHTML =
        "<p style='color:#888;padding:1rem;'>Could not load books. Please try again.</p>";
    });
}

// ─── CHATBOT ─────────────────────────────────────────────────────────────────

const riasecQuestions = [
  { id: "Realistic",     q: "I like working with my hands, tools, or machines." },
  { id: "Investigative", q: "I enjoy solving math problems or doing research." },
  { id: "Artistic",      q: "I love being creative, making art, or creating content." },
  { id: "Social",        q: "I find fulfillment in helping, teaching, or healing people." },
  { id: "Enterprising",  q: "I enjoy leading people or starting my own business." },
  { id: "Conventional",  q: "I like having a clear schedule and organizing data." },
];

let chatHistory = [];

function formatBotResponse(text) {
  let formatted = text;

  formatted = formatted.replace(
    /### (.*?)\n/g,
    '<h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--gray-900); font-size: 1.05rem;">$1</h4>'
  );
  formatted = formatted.replace(
    /\*\*(.*?)\*\*/g,
    '<strong style="color: var(--gray-900); font-weight: 600;">$1</strong>'
  );
  formatted = formatted.replace(
    /(?:\n|^)[*-]\s+(.*)/g,
    '<li style="margin-left: 20px; margin-bottom: 6px;">$1</li>'
  );
  formatted = formatted.replace(
    /\n\n/g,
    '</p><p style="margin-bottom: 12px;">'
  );
  formatted = formatted.replace(/\n/g, "<br>");

  return `<p style="margin-bottom: 12px;">${formatted}</p>`;
}

/**
 * checkQuizStatus — only runs if the quiz/chat elements exist on the page
 */
async function checkQuizStatus() {
  const quizStatusCard = document.getElementById("quizStatusCard");
  const chatSection    = document.getElementById("chatSection");

  // Exit silently if not on the dashboard page
  if (!quizStatusCard || !chatSection) return;

  try {
    const res  = await fetch("/api/get-my-interests", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();

    if (data.exists) {
      quizStatusCard.style.display = "none";
      chatSection.style.display    = "flex";

      if (chatHistory.length === 0) {
        const win = document.getElementById("chatWindow");
        if (win) {
          win.innerHTML = `
            <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #fdf2f8; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid #fbcfe8; box-shadow: var(--shadow-sm);">
                🤖
              </div>
              <div style="background: #ffffff; color: var(--gray-800); padding: 16px; border-radius: 0px 16px 16px 16px; max-width: 85%; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); font-size: 0.9375rem; line-height: 1.6;">
                <p style="margin-bottom: 8px;">Welcome back! I see your top career interest is <strong style="color: var(--primary-pink);">${data.interest}</strong>.</p>
                <p>What would you like to explore today? Ask me for career suggestions, university requirements, or salary info!</p>
              </div>
            </div>`;
        }
      }
    } else {
      quizStatusCard.style.display = "flex";
      chatSection.style.display    = "none";
    }
  } catch (e) {
    console.error("Error loading quiz status:", e);
  }
}

window.showQuiz = function () {
  const form = document.getElementById("riasecForm");
  if (!form) return;

  form.innerHTML = riasecQuestions
    .map(
      (item) => `
    <div style="margin-bottom:1rem; text-align: left;">
      <label style="display:block; font-size:0.9rem; margin-bottom:0.5rem; font-weight:500; color: #374151;">${item.q}</label>
      <input type="range" name="${item.id}" min="1" max="5" value="3" style="width:100%; accent-color:var(--primary-orange);">
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--gray-500); font-weight:600;">
        <span>1 - Not me</span><span>5 - Totally me</span>
      </div>
    </div>
  `
    )
    .join("");

  const overlay = document.getElementById("quizOverlay");
  if (!overlay) return;
  overlay.style.display    = "flex";
  overlay.style.opacity    = "1";
  overlay.style.visibility = "visible";
};

window.closeQuiz = function () {
  const overlay = document.getElementById("quizOverlay");
  if (overlay) overlay.style.display = "none";
};

window.saveQuizResults = async function () {
  const formData = new FormData(document.getElementById("riasecForm"));
  const results  = Object.fromEntries(formData.entries());

  const response = await fetch("/api/save-interests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(results),
  });

  if (response.ok) {
    window.closeQuiz();
    await checkQuizStatus();
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.value = "Hi! I just completed my personality test. What careers suit me?";
      window.sendChat();
    }
  }
};

window.sendChat = async function () {
  const input   = document.getElementById("chatInput");
  const win     = document.getElementById("chatWindow");
  if (!input || !win) return;

  const userText = input.value.trim();
  if (!userText) return;

  win.innerHTML += `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
      <div style="background: var(--gradient-primary); color: white; padding: 12px 16px; border-radius: 16px 16px 0px 16px; max-width: 80%; box-shadow: var(--shadow-sm); font-size: 0.9375rem; line-height: 1.5;">
        ${userText}
      </div>
    </div>`;

  input.value = "";
  win.scrollTop = win.scrollHeight;

  const downloadDocBtn = document.getElementById("downloadDocBtn");
  if (downloadDocBtn) downloadDocBtn.style.display = "inline-flex";

  chatHistory.push({ role: "user", content: userText });

  const typingId = "typing-" + Date.now();
  win.innerHTML += `
    <div id="${typingId}" style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #fdf2f8; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid #fbcfe8;">🤖</div>
      <div style="background: #ffffff; color: var(--gray-500); padding: 16px; border-radius: 0px 16px 16px 16px; border: 1px solid var(--gray-200); font-size: 0.9375rem; font-style: italic;">
        Thinking...
      </div>
    </div>`;
  win.scrollTop = win.scrollHeight;

  try {
    const res  = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ userPrompt: userText }),
    });
    const data = await res.json();
    chatHistory.push({ role: "assistant", content: data.response });

    document.getElementById(typingId)?.remove();

    const formattedResponse = formatBotResponse(data.response);

    win.innerHTML += `
      <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #fdf2f8; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid #fbcfe8; box-shadow: var(--shadow-sm);">
          🤖
        </div>
        <div style="background: #ffffff; color: var(--gray-800); padding: 16px; border-radius: 0px 16px 16px 16px; max-width: 85%; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); font-size: 0.9375rem; line-height: 1.6;">
          ${formattedResponse}
        </div>
      </div>`;

    win.scrollTop = win.scrollHeight;
  } catch (err) {
    console.error("Chat error:", err);
    document.getElementById(typingId)?.remove();
  }
};

window.downloadCareerDoc = async function () {
  if (chatHistory.length === 0) {
    alert("Please chat with the AI first before downloading your career path.");
    return;
  }

  const btn = document.getElementById("downloadDocBtn");
  if (!btn) return;

  btn.textContent = "Generating PDF...";
  btn.disabled    = true;

  try {
    const res  = await fetch("/api/generate-doc-from-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ history: chatHistory }),
    });
    const data = await res.json();

    if (!data.doc) throw new Error("No document content received.");

    const formattedContent = formatBotResponse(data.doc);

    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937;">
        <div style="text-align: center; border-bottom: 2px solid #ec4899; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0; font-size: 28px; letter-spacing: 1px;">SMILE</h1>
          <h2 style="color: #111827; margin: 10px 0 0 0; font-size: 20px;">Your Personalized Career Path</h2>
        </div>
        <div style="line-height: 1.6; font-size: 14px;">
          ${formattedContent}
        </div>
        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Generated by SMILE AI Career Assistant • ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;

    const opt = {
      margin:     [0.5, 0.5, 0.5, 0.5],
      filename:   "My_SMILE_Career_Path.pdf",
      image:      { type: "jpeg", quality: 0.98 },
      html2canvas:{ scale: 2, useCORS: true },
      jsPDF:      { unit: "in", format: "letter", orientation: "portrait" },
    };

    await html2pdf().set(opt).from(element).save();

    btn.textContent = " PDF Downloaded!";
    setTimeout(() => {
      btn.textContent = " Download Career Path";
      btn.disabled    = false;
    }, 3000);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    alert("Failed to generate PDF. Check your connection.");
    btn.textContent = " Download Career Path";
    btn.disabled    = false;
  }
};

// Only call checkQuizStatus if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  checkQuizStatus();
});