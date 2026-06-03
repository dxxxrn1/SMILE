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
  loadSavedOpportunities();
  loadApplications();
  initNotifications();
  initProfileCompletionWidget();

  // Hide support ticket dropdown button and its divider if the tickets tab/panel is not present
  const ticketsPanel = document.getElementById("tickets-panel");
  const myTicketsBtn = document.getElementById("myTicketsDropdownBtn");
  if (myTicketsBtn && !ticketsPanel) {
    myTicketsBtn.style.display = "none";
    const prevDivider = myTicketsBtn.previousElementSibling;
    if (prevDivider && prevDivider.classList.contains("nav__profile-divider")) {
      prevDivider.style.display = "none";
    }
  }

  // Only run on pages that have these elements
  loadStudentHeaderProfile();

  // Always bind logout button if it exists on the page
  const logoutTag = document.getElementById("logout");
  if (logoutTag) {
    logoutTag.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNotificationDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderStudentAvatar(profile) {
  const avatar = document.querySelector(".nav__avatar");
  const initials = document.getElementById("initials");
  if (!avatar) return;

  if (profile?.ProfilePicUrl) {
    avatar.innerHTML = `<img src="${escapeHtml(profile.ProfilePicUrl)}" alt="Profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    return;
  }

  if (initials) {
    const firstInitial = profile?.StuName ? profile.StuName[0] : "";
    const lastInitial = profile?.StuLastName ? profile.StuLastName[0] : "";
    const initialsText = (firstInitial + lastInitial).toUpperCase();
    initials.textContent = initialsText || "?";
  }
}

async function loadNotifications() {
  const list = document.getElementById("notificationList");
  const badge = document.getElementById("notificationBadge");
  if (!list || !badge) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/notifications", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success || data.notifications.length === 0) {
      list.innerHTML = `<p class="notification-panel__empty">No application updates yet.</p>`;
      badge.hidden = true;
      badge.textContent = "0";
      return;
    }

    const unreadCount = Number(data.unreadCount) || 0;
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    badge.hidden = unreadCount === 0;

    list.innerHTML = data.notifications.map((item) => `
      <article class="notification-item ${item.IsRead ? "" : "notification-item--unread"}">
        <span class="notification-item__dot"></span>
        <div>
          <h3 class="notification-item__title">${escapeHtml(item.Title)}</h3>
          <p class="notification-item__message">${escapeHtml(item.Message)}</p>
          <time class="notification-item__date">${formatNotificationDate(item.DateCreated)}</time>
        </div>
      </article>
    `).join("");
  } catch (err) {
    console.error("Error loading notifications:", err);
    list.innerHTML = `<p class="notification-panel__empty" style="color:#dc2626;">Could not load notifications.</p>`;
  }
}

async function markNotificationsRead() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/notifications/read", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    await loadNotifications();
  } catch (err) {
    console.error("Error marking notifications as read:", err);
  }
}

function initNotifications() {
  const panel = document.getElementById("notificationPanel");
  const markReadBtn = document.getElementById("notificationMarkRead");
  if (!panel) return;

  loadNotifications();

  const profileBtn = document.querySelector(".nav__profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", async () => {
      const profileMenu = document.getElementById("profileMenu");
      if (profileMenu && !profileMenu.classList.contains("nav__profile-menu--active")) {
        await loadNotifications();
      }
    });
  }

  if (markReadBtn) {
    markReadBtn.addEventListener("click", markNotificationsRead);
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
            ".map-placeholder__content",
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
        },
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
    ".opportunity-card__actions .btn--icon",
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

function setDashboardStat(labelText, value) {
  document.querySelectorAll(".stat-card").forEach((card) => {
    const label = card.querySelector(".stat-card__label");
    const numberEl = card.querySelector(".stat-card__number");
    if (label && numberEl && label.textContent.includes(labelText)) {
      numberEl.textContent = value;
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

  const token = getToken();

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
  `,
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
            ${book.thumbnail
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
  { id: "Realistic", q: "I like working with my hands, tools, or machines." },
  {
    id: "Investigative",
    q: "I enjoy solving math problems or doing research.",
  },
  {
    id: "Artistic",
    q: "I love being creative, making art, or creating content.",
  },
  {
    id: "Social",
    q: "I find fulfillment in helping, teaching, or healing people.",
  },
  {
    id: "Enterprising",
    q: "I enjoy leading people or starting my own business.",
  },
  {
    id: "Conventional",
    q: "I like having a clear schedule and organizing data.",
  },
];

let chatHistory = [];

function formatBotResponse(text) {
  let html = text;

  // 1.Bold text
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 2.Headings
  html = html.replace(
    /^(#{2,3})\s+(.*)$/gm,
    '<h4 style="color: var(--primary-pink); margin-top: 16px; margin-bottom: 8px;">$2</h4>',
  );

  // 3. Bullet Points & Numbers
  html = html.replace(/^[\*\-]\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>");

  // 4. Wrap list items in <ul> so the PDF CSS boxes work!
  html = html.replace(/(<li>.*?<\/li>(?:\n|$))+/g, function (match) {
    return `<ul>${match.replace(/\n/g, "")}</ul>`;
  });

  // 5. Paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 12px;">');
  html = html.replace(/\n/g, "<br>");

  return `<p style="margin-bottom: 12px;">${html}</p>`;
}

/**
 * checkQuizStatus — only runs if the quiz/chat elements exist on the page
 */
async function checkQuizStatus() {
  const quizStatusCard = document.getElementById("quizStatusCard");
  const chatSection = document.getElementById("chatSection");

  // Exit silently if not on the dashboard page
  if (!quizStatusCard || !chatSection) return;

  try {
    const res = await fetch("/api/get-my-interests", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();

    const quizCardTitle = document.getElementById("quizCardTitle");
    const quizCardBody = document.getElementById("quizCardBody");
    const quizCardBtn = quizStatusCard.querySelector(".career-card__btn");

    if (data.exists) {
      quizStatusCard.style.display = "flex";
      chatSection.style.display = "flex";

      if (quizCardTitle) quizCardTitle.textContent = "Your profile is complete!";
      if (quizCardBody) quizCardBody.textContent = "You can retake the personality quiz at any time to adjust your career interests.";
      if (quizCardBtn) quizCardBtn.textContent = "Retake personality quiz";

      const downloadDocWrap = document.getElementById("downloadDocWrap");
      if (downloadDocWrap) downloadDocWrap.style.display = "block";

      if (chatHistory.length === 0) {
        const win = document.getElementById("chatWindow");
        if (win) {
          win.innerHTML = `
            <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #d1fae5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0; border: 1px solid #a7f3d0; box-shadow: var(--shadow-sm);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
              </div>
              <div style="background: #ffffff; color: var(--gray-800); padding: 16px; border-radius: 0px 16px 16px 16px; max-width: 85%; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); font-size: 0.9375rem; line-height: 1.6; word-break: break-word; overflow-wrap: break-word;">
                <p style="margin-bottom: 8px;">Welcome back! I see your top career interest is <strong style="color: var(--primary-pink);">${data.interest}</strong>.</p>
                <p>What would you like to explore today? Ask me for career suggestions, university requirements, or salary info!</p>
                <p style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--gray-200); font-size: 0.8125rem; color: var(--gray-500); display: flex; align-items: center; gap: 6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #f97316;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> <em>Tip: You can upload your report card/marks (optional) at any time to unlock highly realistic, grade-matched recommendations!</em>
                </p>
              </div>
            </div>`;
        }
      }
    } else {
      quizStatusCard.style.display = "flex";
      chatSection.style.display = "flex";

      if (quizCardTitle) quizCardTitle.textContent = "Complete your profile";
      if (quizCardBody) quizCardBody.textContent = "Take the personality quiz to unlock personalised AI career advice tailored to your strengths.";
      if (quizCardBtn) quizCardBtn.textContent = "Take personality quiz";
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
  `,
    )
    .join("");

  const overlay = document.getElementById("quizOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  overlay.style.opacity = "1";
  overlay.style.visibility = "visible";
};

window.closeQuiz = function () {
  const overlay = document.getElementById("quizOverlay");
  if (overlay) overlay.style.display = "none";
};

window.saveQuizResults = async function () {
  const formData = new FormData(document.getElementById("riasecForm"));
  const results = Object.fromEntries(formData.entries());

  const response = await fetch("/api/save-interests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(results),
  });

  if (response.ok) {
    window.closeQuiz();
    await checkQuizStatus();
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.value =
        "Hi! I just completed my personality test. What careers suit me?";
      window.sendChat();
    }
  }
};

window.sendChat = async function () {
  const input = document.getElementById("chatInput");
  const win = document.getElementById("chatWindow");
  if (!input || !win) return;

  const userText = input.value.trim();
  if (!userText) return;

  win.innerHTML += `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
      <div style="background: var(--gradient-primary); color: white; padding: 12px 16px; border-radius: 16px 16px 0px 16px; max-width: 80%; box-shadow: var(--shadow-sm); font-size: 0.9375rem; line-height: 1.5; word-break: break-word; overflow-wrap: break-word;">
        ${userText}
      </div>
    </div>`;

  input.value = "";
  win.scrollTop = win.scrollHeight;

  const downloadDocBtn = document.getElementById("downloadDocBtn");
  // if (downloadDocBtn) downloadDocBtn.style.display = "inline-flex";

  chatHistory.push({ role: "user", content: userText });

  const typingId = "typing-" + Date.now();
  win.innerHTML += `
    <div id="${typingId}" style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #d1fae5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0; border: 1px solid #a7f3d0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
      </div>
      <div style="background: #ffffff; color: var(--gray-500); padding: 16px; border-radius: 0px 16px 16px 16px; border: 1px solid var(--gray-200); font-size: 0.9375rem; font-style: italic;">
        Thinking...
      </div>
    </div>`;
  win.scrollTop = win.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      // body: JSON.stringify({ userPrompt: userText }),
      body: JSON.stringify({ history: chatHistory }),
    });
    const data = await res.json();
    chatHistory.push({ role: "assistant", content: data.response });

    document.getElementById(typingId)?.remove();

    const formattedResponse = formatBotResponse(data.response);

    win.innerHTML += `
      <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #d1fae5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0; border: 1px solid #a7f3d0; box-shadow: var(--shadow-sm);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
        </div>
        <div style="background: #ffffff; color: var(--gray-800); padding: 16px; border-radius: 0px 16px 16px 16px; max-width: 85%; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); font-size: 0.9375rem; line-height: 1.6; word-break: break-word; overflow-wrap: break-word;">
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
  btn.disabled = true;

  try {
    const res = await fetch("/api/generate-doc-from-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ history: chatHistory }),
    });
    const data = await res.json();

    if (!data.doc) throw new Error("No document content received.");

    const formattedContent = formatBotResponse(data.doc);

    // 1. Create the container (We don't need to attach it to the screen anymore!)
    const element = document.createElement("div");

    element.innerHTML = `
      <style>
        .pdf-wrapper { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1f2937; background: #ffffff; width: 100%; }
        .pdf-header { text-align: center; border-bottom: 3px solid #ec4899; padding-bottom: 20px; margin-bottom: 25px; background: #fdf2f8; padding-top: 20px; border-radius: 8px 8px 0 0;}
        .pdf-header h1 { color: #f97316; margin: 0; font-size: 28px; font-weight: bold;}
        .pdf-header h2 { color: #111827; margin: 8px 0 0 0; font-size: 18px; font-weight: 600;}
        .pdf-content { line-height: 1.5; font-size: 13px; }
        .pdf-content h4 { color: #ec4899; font-size: 16px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        
        /* The Timeline Boxes */
        .pdf-content ul { list-style: none; padding-left: 15px; position: relative; margin-top: 10px; border-left: 2px solid #ec4899; margin-left: 10px;}
        .pdf-content li { position: relative; background: #fdf2f8; border: 1px solid #fbcfe8; padding: 12px 16px; margin-bottom: 12px; border-radius: 6px; margin-left: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);}
        .pdf-content li::before { content: ''; position: absolute; left: -37px; top: 15px; width: 12px; height: 12px; border-radius: 50%; background: #f97316; border: 2px solid #ffffff; box-shadow: 0 0 0 2px #ec4899; }
        .pdf-content li::after { content: ''; position: absolute; left: -6px; top: 17px; width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid #fbcfe8; }
        
        .pdf-footer { margin-top: 30px; text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
      </style>

      <div class="pdf-wrapper">
        <div class="pdf-header">
          <h1>SMILE</h1>
          <h2>Your Personalized Career Blueprint</h2>
        </div>
        <div class="pdf-content">
          ${formattedContent}
        </div>
        <div class="pdf-footer">
          Generated securely by the SMILE AI Career Assistant • ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;

    // 2. The Golden Options that fix bugs
    const opt = {
      margin: 0.4,
      filename: "My_SMILE_Career_Path.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, // scrollY: 0 fixes the blank page bug!
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ['css', 'avoid-all'] } // Stops boxes from slicing in half across pages!
    };

    // 3. Generate the PDF straight from the element in memory
    await html2pdf().set(opt).from(element).save();

    btn.textContent = "✓ Blueprint Saved";
    setTimeout(() => {
      btn.textContent = "Download Career Path";
      btn.disabled = false;
    }, 3000);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    alert("Failed to generate PDF. Check your connection.");
    btn.textContent = "Download Career Path";
    btn.disabled = false;
  }
};

// Only call checkQuizStatus if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  checkQuizStatus();
});

// ─── DYNAMIC DATA FETCHING ───────────────────────────────────────────────────

async function loadSavedOpportunities() {
  const container = document.querySelector(".dashboard__section--opportunities .opportunities-list");
  if (!container) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/saved-opportunities", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setDashboardStat("Saved Opportunities", data.success ? data.savedOpportunities.length : 0);

    if (data.success && data.savedOpportunities.length > 0) {
      container.innerHTML = data.savedOpportunities.map(opp => {
        // Format the date
        const deadline = new Date(opp.ApplicationDeadline).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });

        return `
          <article class="opportunity-card" data-oppid="${opp.OppID}">
            <div class="opportunity-card__badge opportunity-card__badge--${opp.OppType.toLowerCase()}">
              ${opp.OppType}
            </div>
            <h3 class="opportunity-card__title">${opp.Title}</h3>
            <p class="opportunity-card__org">${opp.OrgName}</p>
            <div class="opportunity-card__meta">
              <span class="opportunity-card__location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${opp.Province}
              </span>
              <span class="opportunity-card__deadline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Closes: ${deadline}
              </span>
            </div>
            <div class="opportunity-card__actions">
              ${
                (opp.ApplicationLink && opp.ApplicationLink !== "null" && opp.ApplicationLink !== "undefined" && opp.ApplicationLink.trim() !== "")
                  ? `<a href="${opp.ApplicationLink}" class="btn btn--primary btn--sm" style="width: 100%; text-align: center; justify-content: center;" target="_blank">Apply Now</a>`
                  : (opp.AppliedCount > 0)
                    ? `<button class="btn btn--secondary btn--sm" style="width: 100%; text-align: center; justify-content: center; border: none; background: #e4e4e7; color: #71717a; cursor: not-allowed;" disabled>Applied</button>`
                    : `<button class="btn btn--primary btn--sm" style="width: 100%; text-align: center; justify-content: center; border: none; cursor: pointer;" onclick="applyForOpportunity('${opp.Title.replace(/'/g, "\\'")}', ${opp.OppID}, this)">Apply Now</button>`
              }
            </div>
          </article>
        `;
      }).join("");

      // Re-initialize remove buttons for the dynamic content
      initDynamicRemoveButtons();
    } else {
      container.innerHTML = "<p style='color:#888;padding:1rem;'>No saved opportunities yet.</p>";
    }
  } catch (err) {
    console.error("Error loading saved opportunities:", err);
    container.innerHTML = "<p style='color:#dc2626;padding:1rem;'>Failed to load saved opportunities.</p>";
  }
}

async function applyForOpportunity(title, oppId, button) {
  if (!confirm(`Are you sure you want to apply for "${title}"?`)) return;

  const token = getToken();
  if (!token) {
    alert("Please log in to apply.");
    window.location.href = "/login-page";
    return;
  }

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Applying...";

  try {
    const res = await fetch("/api/student/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ oppId })
    });
    const data = await res.json();
    
    if (data.success) {
      alert("Application submitted successfully!");
      await loadSavedOpportunities();
      await loadApplications();
    } else {
      alert(data.message || "Failed to submit application.");
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  } catch (err) {
    console.error("Error applying:", err);
    alert("Network error occurred while applying.");
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

async function loadApplications() {
  const container = document.querySelector(".dashboard__section--applications .applications-list");
  if (!container) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/applications", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setDashboardStat("Applications Sent", data.success ? data.applications.length : 0);
    setDashboardStat(
      "Interviews Scheduled",
      data.success ? data.applications.filter(app => ['Interview', 'Shortlisted'].includes(app.Status)).length : 0
    );

    if (data.success && data.applications.length > 0) {
      window.__loadedApplications = data.applications;
      container.innerHTML = data.applications.map((app, index) => {
        const dateApplied = new Date(app.DateApplied).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });

        let statusIcon = '';
        let statusClass = '';
        const status = app.Status || 'Pending';

        if (status === 'Pending' || status === 'Pending Review') {
          statusClass = 'application-card__status--pending';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        } else if (status === 'Reviewed') {
          statusClass = 'application-card__status--interview';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        } else if (status === 'Shortlisted') {
          statusClass = 'application-card__status--accepted';
          statusIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else if (status === 'Interview') {
          statusClass = 'application-card__status--interview';
          statusIcon = '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line>';
        } else if (status === 'Accepted' || status === 'Approved') {
          statusClass = 'application-card__status--accepted';
          statusIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else if (status === 'Rejected') {
          statusClass = 'application-card__status--rejected';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line>';
        } else {
          statusClass = 'application-card__status--pending';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        }

        // Horizontal Timeline logic mapping
        const isReviewed = ['Reviewed', 'Shortlisted', 'Interview', 'Accepted', 'Approved', 'Rejected'].includes(status);
        const isShortlisted = ['Shortlisted', 'Interview', 'Accepted', 'Approved', 'Rejected'].includes(status);
        const isFinal = ['Accepted', 'Approved', 'Rejected'].includes(status);
        const isRejected = status === 'Rejected';

        const step1Class = "app-timeline__step--active";
        const step2Class = isReviewed ? "app-timeline__step--reviewed" : "";
        const step3Class = isShortlisted ? "app-timeline__step--shortlisted" : "";

        let step4Class = "";
        let step4Title = "Step 4: Decision";
        let step4Sub = "Pending";
        if (isFinal) {
          if (isRejected) {
            step4Class = "app-timeline__step--rejected";
            step4Title = "Step 4: Rejected";
            step4Sub = "Ended";
          } else {
            step4Class = "app-timeline__step--accepted";
            step4Title = status === 'Approved' ? "Step 4: Approved" : "Step 4: Accepted";
            step4Sub = "Success";
          }
        }

        const conn1 = isReviewed ? "app-timeline__connector--active" : "";
        const conn2 = isShortlisted ? "app-timeline__connector--active" : "";
        const conn3 = isFinal ? "app-timeline__connector--active" : "";

        return `
          <article class="application-card">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 class="application-card__title" style="margin: 0; font-size: 0.9375rem; display: flex; align-items: center; gap: 8px;">
                  ${app.Title}
                </h3>
                <p class="application-card__org" style="margin: 2px 0 0; font-size: 0.8125rem;">${app.OrgName}</p>
              </div>
              <div class="application-card__status ${statusClass}" style="margin: 0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  ${statusIcon}
                </svg>
                ${app.Status}
              </div>
            </div>
            
            <!-- Horizontal Scrollable Timeline Pipeline -->
            <div class="app-timeline-container" onclick="event.stopPropagation();">
              <div class="app-timeline">
                <!-- Step 1: Applied -->
                <div class="app-timeline__step ${step1Class}">
                  <span class="app-timeline__step-title">Step 1: Applied</span>
                  <span class="app-timeline__step-subtitle">${dateApplied}</span>
                </div>
                
                <div class="app-timeline__connector ${conn1}"></div>
                
                <!-- Step 2: Under Review -->
                <div class="app-timeline__step ${step2Class}">
                  <span class="app-timeline__step-title">Step 2: Reviewed</span>
                  <span class="app-timeline__step-subtitle">${isReviewed ? '(Under Review)' : 'Pending'}</span>
                </div>
                
                <div class="app-timeline__connector ${conn2}"></div>
                
                <!-- Step 3: Shortlisted -->
                <div class="app-timeline__step ${step3Class}">
                  <span class="app-timeline__step-title">Step 3: Shortlisted</span>
                  <span class="app-timeline__step-subtitle">${isShortlisted ? 'Yes' : 'Pending'}</span>
                </div>
                
                <div class="app-timeline__connector ${conn3}"></div>
                
                <!-- Step 4: Decision -->
                <div class="app-timeline__step ${step4Class}">
                  <span class="app-timeline__step-title">${step4Title}</span>
                  <span class="app-timeline__step-subtitle">${step4Sub}</span>
                </div>
              </div>
            </div>
            
            ${(status === 'Approved' || status === 'Accepted') ? `
            <div class="application-card__actions" style="margin-top: 12px; display: flex; justify-content: flex-end;" onclick="event.stopPropagation();">
              <button class="btn btn--outline btn--sm btn-add-cal" onclick="showAppApprovalPopupByIndex(${index})" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 500; font-size: 0.8125rem; padding: 6px 12px; border-radius: 6px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e40af; cursor: pointer; transition: background 0.2s, transform 0.1s;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #2563eb;">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                  <line x1="16" x2="16" y1="2" y2="6"></line>
                  <line x1="8" x2="8" y1="2" y2="6"></line>
                  <line x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
                Add to Calendar
              </button>
            </div>
            ` : ''}
          </article>
        `;
      }).join("");
    } else {
      container.innerHTML = "<p style='color:#888;padding:1rem;'>No applications sent yet.</p>";
    }
  } catch (err) {
    console.error("Error loading applications:", err);
    container.innerHTML = "<p style='color:#dc2626;padding:1rem;'>Failed to load applications.</p>";
  }
}

function initDynamicRemoveButtons() {
  const removeButtons = document.querySelectorAll(".btn-remove-saved");

  removeButtons.forEach(function (btn) {
    btn.addEventListener("click", async function (event) {
      event.preventDefault();

      const card = btn.closest(".opportunity-card");
      const title = card.querySelector(".opportunity-card__title").textContent;
      const oppId = card.getAttribute("data-oppid");

      if (confirm(`Remove "${title}" from saved opportunities?`)) {
        try {
          const res = await fetch(`/api/student/saved-opportunities/${oppId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          const data = await res.json();

          if (data.success) {
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            card.style.opacity = "0";
            card.style.transform = "translateX(-20px)";

            setTimeout(function () {
              card.remove();
              updateSavedCount(-1);
            }, 300);
          } else {
            alert(data.message || "Failed to remove opportunity.");
          }
        } catch (err) {
          console.error("Error deleting opportunity:", err);
          alert("Network error while trying to remove opportunity.");
        }
      }
    });
  });
}


// ─── SUPPORT TICKETS ────────────────────────────────────────────────────────

/**
 * Opens the Tickets panel from the profile dropdown
 */
function openTicketsTab(event) {
  event.preventDefault();

  const ticketsPanel = document.getElementById("tickets-panel");
  const profileMenu = document.getElementById("profileMenu");

  if (ticketsPanel) {
    ticketsPanel.style.display = "flex";
    ticketsPanel.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  if (profileMenu) profileMenu.classList.remove("nav__profile-menu--active");

  loadStudentTickets();
}

/**
 * Closes the Tickets panel and returns to the dashboard grid view
 */
function closeTicketsTab() {
  const ticketsPanel = document.getElementById("tickets-panel");
  if (ticketsPanel) {
    ticketsPanel.style.display = "none";
    ticketsPanel.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

window.openTicketsTab = openTicketsTab;
window.closeTicketsTab = closeTicketsTab;

/**
 * Fetch and render the student's own tickets
 */
async function loadStudentTickets() {
  const tbody = document.getElementById("tkt-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="tkt-empty">Loading...</td></tr>`;

  try {
    const token = getToken();
    const res = await fetch("/api/tickets/my", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success || data.tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="tkt-empty">You haven't submitted any tickets yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.tickets.map(t => {
      const date = new Date(t.DateCreated).toLocaleDateString("en-ZA", {
        day: "2-digit", month: "short", year: "numeric"
      });
      const badge = t.Status === "Resolved"
        ? `<span class="tkt-badge tkt-badge--resolved">✓ Resolved</span>`
        : `<span class="tkt-badge tkt-badge--open">● Open</span>`;
      const feedback = t.AdminFeedback
        ? `<p class="tkt-feedback"> ${t.AdminFeedback}</p>`
        : `<span style="color:#cbd5e1;font-size:12px;">—</span>`;

      return `
                <tr>
                    <td style="font-weight:600;color:#ec4899;">#${t.TicketID}</td>
                    <td>${t.TicketType}</td>
                    <td style="max-width:200px;">${t.Subject}</td>
                    <td>${badge}</td>
                    <td>${feedback}</td>
                    <td style="white-space:nowrap;color:#94a3b8;">${date}</td>
                </tr>`;
    }).join("");

  } catch (err) {
    console.error("Error loading tickets:", err);
    document.getElementById("tkt-table-body").innerHTML =
      `<tr><td colspan="6" class="tkt-empty" style="color:#dc2626;">Could not load tickets.</td></tr>`;
  }
}

/**
 * Submit a new support ticket
 */
async function submitStudentTicket() {
  const ticketType = document.getElementById("tktType").value.trim();
  const subject = document.getElementById("tktSubject").value.trim();
  const description = document.getElementById("tktDesc").value.trim();

  if (!ticketType || !subject || !description) {
    showTktToast("Please fill in all fields before submitting.", "error");
    return;
  }

  const btn = document.getElementById("tktSubmitBtn");
  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Submitting...`;

  try {
    const token = getToken();
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ticketType, subject, description })
    });
    const data = await res.json();

    if (data.success) {
      showTktToast(`Ticket #${data.ticketId} submitted successfully!`, "success");

      document.getElementById("tktType").value = "";
      document.getElementById("tktSubject").value = "";

      await loadStudentTickets();
    } else {
      showTktToast(data.message || "Failed to submit ticket.", "error");
    }
  } catch (err) {
    console.error("Error submitting ticket:", err);
    showTktToast("Server error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Ticket`;
  }
}

/**
 * Show a toast notification in the tickets panel
 */
function showTktToast(message, type = "success") {
  const toast = document.getElementById("tktToast");
  if (!toast) return;

  toast.className = `tkt-toast tkt-toast--${type}`;
  toast.textContent = message;
  toast.style.display = "block";

  setTimeout(() => { toast.style.display = "none"; }, 4000);
}

// HTML onclick attributes
window.openTicketsTab = openTicketsTab;
window.loadStudentTickets = loadStudentTickets;
window.submitStudentTicket = submitStudentTicket;

function applyProfileStrengthPercent(percent) {
  const statCard = document.getElementById("profileStrengthCard");
  const statIcon = document.getElementById("profileStrengthIcon");
  const statNumber = document.getElementById("profileStrengthNumber");
  const widget = document.getElementById("profileCompletionWidget");

  if (widget) {
    widget.style.display = "flex";
    const percentText = document.getElementById("widgetProgressPercent");
    if (percentText) percentText.textContent = `${percent}%`;
    const progressRing = document.getElementById("widgetProgressRing");
    if (progressRing) {
      progressRing.style.strokeDasharray = `${percent}, 100`;
    }
  }

  if (statCard && statIcon && statNumber) {
    statNumber.textContent = `${percent}%`;
    statCard.classList.remove("stat-card--neutral", "stat-card--red", "stat-card--orange", "stat-card--green", "stat-card--purple");
    statIcon.classList.remove("stat-card__icon--red", "stat-card__icon--orange", "stat-card__icon--green", "stat-card__icon--purple");

    // Assign color theme and dynamic mouth SVG shape based on bio completeness percentage
    if (percent < 40) {
      statCard.classList.add("stat-card--red");
      statIcon.classList.add("stat-card__icon--red");
      // Sad frowning mouth (no eyes)
      statIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        </svg>
      `;
    } else if (percent < 80) {
      statCard.classList.add("stat-card--orange");
      statIcon.classList.add("stat-card__icon--orange");
      // Neutral flat mouth (no eyes)
      statIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="15" x2="16" y2="15" />
        </svg>
      `;
    } else {
      statCard.classList.add("stat-card--green");
      statIcon.classList.add("stat-card__icon--green");
      // Happy smiling mouth (no eyes)
      statIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        </svg>
      `;
    }
  }
}

/**
 * Profile Completion Widget Initialization
 */
async function initProfileCompletionWidget() {
  // Load cached strength immediately to prevent color/UI lagging
  const cachedStrength = localStorage.getItem("profileStrength");
  if (cachedStrength !== null) {
    applyProfileStrengthPercent(parseInt(cachedStrength, 10));
  }

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.profile) {
      const p = data.profile;
      renderStudentAvatar(p);

      // Compute score strictly based on bio word count (50 words = 50%, 100+ words = 100%)
      const bioText = (p.StuBio && p.StuBio.trim() !== "None provided yet") ? p.StuBio.trim() : "";
      const wordCount = bioText ? bioText.split(/\s+/).filter(Boolean).length : 0;
      const percent = Math.min(100, wordCount);

      applyProfileStrengthPercent(percent);
      localStorage.setItem("profileStrength", String(percent));
    }
  } catch (err) {
    console.error("Error loading profile completion widget:", err);
  }
}

// AI Profile Assistant 
let aiProfileChatHistory = [];

function openAIProfileModal() {
  const modal = document.getElementById("aiProfileModal");
  if (!modal) return;

  // Lock parent page scrolling
  document.body.style.overflow = "hidden";

  modal.style.display = "flex";
  setTimeout(() => {
    modal.style.opacity = "1";
    modal.style.pointerEvents = "auto";
    const container = document.getElementById("aiProfileModalContainer");
    if (container) container.style.transform = "scale(1)";
  }, 50);

  const win = document.getElementById("aiProfileChatWindow");
  win.innerHTML = `
    <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px; align-items: flex-start;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #064e3b; display: flex; align-items: center; justify-content: center; color: #34d399; flex-shrink: 0; border: 1px solid #022c22; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
      </div>
      <div class="ai-chat-bubble ai-chat-bubble--assistant" style="padding: 14px 18px; line-height: 1.5; font-size: 14px; border-radius: 0 20px 20px 20px; flex: 1; max-width: 80%;">
        <p style="margin: 0 0 8px 0;"><strong>Hello! I'm your AI Profile Assistant.</strong></p>
        <p style="margin: 0;">I'll help you craft a professional, compelling bio to attract the best opportunities. To get started, you can share your key skills, career interests, hobbies, or paste a rough draft you'd like me to polish!</p>
      </div>
    </div>
  `;
  aiProfileChatHistory = [];
}

function closeAIProfileModal() {
  const modal = document.getElementById("aiProfileModal");
  const container = document.getElementById("aiProfileModalContainer");
  if (container) container.style.transform = "scale(0.95)";
  if (modal) {
    modal.style.opacity = "0";
    modal.style.pointerEvents = "none";
    setTimeout(() => {
      modal.style.display = "none";
      // Unlock parent page scrolling
      document.body.style.overflow = "";
    }, 300);
  }
}

async function sendAIProfileChat() {
  const input = document.getElementById("aiProfileInput");
  const win = document.getElementById("aiProfileChatWindow");
  if (!input || !win) return;

  const userText = input.value.trim();
  if (!userText) return;

  //  user bubble
  win.innerHTML += `
    <div class="ai-chat-bubble ai-chat-bubble--user" style="padding: 14px 18px; line-height: 1.5; font-size: 14px; border-radius: 20px 20px 0px 20px; margin-left: auto;">
      ${userText}
    </div>
  `;
  input.value = "";
  win.scrollTop = win.scrollHeight;

  aiProfileChatHistory.push({ role: "user", content: userText });

  //  thinking indicator
  const typingId = "ai-typing-" + Date.now();
  win.innerHTML += `
    <div id="${typingId}" style="display: flex; justify-content: flex-start; gap: 12px; align-self: flex-start; align-items: flex-start; margin-bottom: 16px;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #064e3b; color: #34d399; display: flex; align-items: center; justify-content: center; border: 1px solid #022c22; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
      </div>
      <div class="ai-chat-bubble ai-chat-bubble--assistant" style="padding: 14px 18px; line-height: 1.5; font-size: 14px; font-style: italic; color: #64748b; border-radius: 0 20px 20px 20px; flex: 1; max-width: 80%;">
        Polishing bio options...
      </div>
    </div>
  `;
  win.scrollTop = win.scrollHeight;

  try {
    const scannedMarks = window.latestScannedMarks;
    const schoolName = window.latestScannedSchool || "";
    const hasUploaded = !!scannedMarks;

    const scannedData = {
      hasUploaded,
      schoolName,
      topSubjects: scannedMarks || ""
    };

    const res = await fetch("/api/chat/profile-writer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        message: userText,
        chatHistory: aiProfileChatHistory.slice(0, -1),
        scannedData
      })
    });
    const data = await res.json();
    aiProfileChatHistory.push({ role: "assistant", content: data.response });

    document.getElementById(typingId)?.remove();

    // Check for bio tags
    const bioRegex = /\[PROPOSED_BIO\]([\s\S]*?)\[\/PROPOSED_BIO\]/i;
    const match = data.response.match(bioRegex);

    let displayHtml = data.response;
    let proposedCardHtml = "";

    if (match) {
      const proposedBio = match[1].trim();
      // Remove tags and proposal from the assistant's standard text response...... it doesn't duplicate
      displayHtml = data.response.replace(bioRegex, "").trim();

      const escapedBio = proposedBio.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, " ");

      proposedCardHtml = `
        <div style="background: rgba(16, 185, 129, 0.03); border: 1.5px dashed rgba(16, 185, 129, 0.3); padding: 16px; border-radius: 16px; margin-top: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #10b981; letter-spacing: 0.5px;">✨ Proposed Bio</p>
          <p style="margin: 0 0 14px 0; font-size: 13.5px; font-style: italic; color: #e4e4e7; line-height: 1.6;">"${proposedBio}"</p>
          <button class="btn-ai-apply" onclick="applyAIProposedBio(this, '${escapedBio}')">
             Apply to Profile
          </button>
        </div>
      `;
    }

    // Format markdown response
    let formattedText = displayHtml
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    win.innerHTML += `
      <div style="display: flex; justify-content: flex-start; margin-bottom: 16px; gap: 12px; align-items: flex-start;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #064e3b; display: flex; align-items: center; justify-content: center; color: #34d399; flex-shrink: 0; border: 1px solid #022c22; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
        </div>
        <div class="ai-chat-bubble ai-chat-bubble--assistant" style="padding: 14px 18px; line-height: 1.5; font-size: 14px; border-radius: 0 20px 20px 20px; flex: 1; max-width: 80%;">
          <p style="margin: 0;">${formattedText}</p>
          ${proposedCardHtml}
        </div>
      </div>
    `;

    win.scrollTop = win.scrollHeight;
  } catch (err) {
    console.error("AI chat error:", err);
    document.getElementById(typingId)?.remove();
  }
}

async function applyAIProposedBio(button, bioText) {
  button.disabled = true;
  button.innerHTML = `
    <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 6px;">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg> Applying...
  `;
  try {
    const scannedMarks = window.latestScannedMarks || null;
    const res = await fetch("/api/student/profile/bio", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ bio: bioText, academicSubjects: scannedMarks })
    });
    const data = await res.json();
    if (data.success) {
      button.innerHTML = "Saved!";
      button.style.background = "#10b981";
      button.style.boxShadow = "0 4px 12px rgba(16,185,129,0.25)";

      // Update completion widget!
      await initProfileCompletionWidget();

      // Close modal after delay
      setTimeout(() => {
        closeAIProfileModal();
        alert("Your profile bio was successfully updated and saved!");
      }, 1200);
    } else {
      alert("Failed to update profile bio.");
      button.disabled = false;
      button.innerHTML = " Apply to Profile";
    }
  } catch (err) {
    console.error("Error applying bio:", err);
    alert("Server error. Please try again.");
    button.disabled = false;
    button.innerHTML = " Apply to Profile";
  }
}

// Expose functions to window
window.openAIProfileModal = openAIProfileModal;
window.closeAIProfileModal = closeAIProfileModal;
window.sendAIProfileChat = sendAIProfileChat;
window.applyAIProposedBio = applyAIProposedBio;
window.applyForOpportunity = applyForOpportunity;
window.initProfileCompletionWidget = initProfileCompletionWidget;

async function loadStudentHeaderProfile() {
  const avatar = document.querySelector(".nav__avatar");
  const initials = document.getElementById("initials");
  const userNameEl = document.getElementById("userName");
  if (!avatar && !initials && !userNameEl) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/student/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.profile) {
      const p = data.profile;

      // Store in memory, NOT in localStorage!
      window.__currentUser = p;

      // Update avatar or initials
      if (p.ProfilePicUrl) {
        if (avatar) {
          avatar.innerHTML = `<img src="${escapeHtml(p.ProfilePicUrl)}" alt="Profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      } else {
        const firstInitial = p.StuName ? p.StuName[0] : "";
        const lastInitial = p.StuLastName ? p.StuLastName[0] : "";
        const initialsText = (firstInitial + lastInitial).toUpperCase();
        if (initials) {
          initials.textContent = initialsText || "?";
        }
      }

      // Update username if element present
      if (userNameEl && p.StuName) {
        userNameEl.textContent = p.StuName;
      }
    }
  } catch (err) {
    console.error("Error loading header profile:", err);
  }
}

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

function getToken() {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('accountType');
  localStorage.removeItem('userName');
  localStorage.removeItem('initials');
  localStorage.removeItem('profilePicUrl');
  localStorage.removeItem('profileComplete');
  localStorage.removeItem("latestScannedMarks");
  localStorage.removeItem("latestScannedSchool");
  localStorage.removeItem("orgName");
  localStorage.removeItem("orgInitials");
  localStorage.removeItem("orgProfilePic");
  window.__currentUser = null;

  fetch('/logout', { method: 'POST' })
    .catch(() => { })
    .finally(() => {
      window.location.href = '/login-page';
    });
}

// Expose helpers globally
window.isTokenExpired = isTokenExpired;
window.getToken = getToken;
window.logout = logout;
window.getGoogleCalDateStr = getGoogleCalDateStr;
window.showApprovalPopup = showApprovalPopup;
window.closeApprovalPopup = closeApprovalPopup;
window.showAppApprovalPopupByIndex = showAppApprovalPopupByIndex;

/**
 * Timezone-safe Google Calendar Date Formatter (YYYYMMDD)
 */
function getGoogleCalDateStr(dateVal) {
  if (!dateVal) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  const str = String(dateVal);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}${match[2]}${match[3]}`;
  }

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}


function showApprovalPopup(notification) {
  const existing = document.getElementById("smileApprovalModal");
  if (existing) {
    existing.remove();
  }

  const deadlineDate = notification.ApplicationDeadline
    ? new Date(notification.ApplicationDeadline).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";
  const startDate = notification.StartDate
    ? new Date(notification.StartDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
    : "TBD";

  const startYMD = getGoogleCalDateStr(notification.StartDate || notification.ApplicationDeadline);
  const eventText = `${notification.OppTitle || notification.Title} - Start Date (${notification.OrgName || "SMILE Partner"})`;
  const cleanDesc = (notification.Description || "").replace(/<[^>]*>/g, "").slice(0, 1000);
  const eventDetails = `SMILE Program Opportunity: ${notification.OppTitle || notification.Title}\nOrganisation: ${notification.OrgName || "SMILE Partner"}\nStatus: Approved\n\nDescription: ${cleanDesc}`;
  const eventLocation = notification.Province ? `${notification.Province}, South Africa` : "South Africa";

  let googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(eventText)}` +
    `&dates=${startYMD}T090000/${startYMD}T170000` +
    `&details=${encodeURIComponent(eventDetails)}` +
    `&location=${encodeURIComponent(eventLocation)}`;

  googleCalUrl = googleCalUrl.replace(/'/g, "%27");

  const modal = document.createElement("div");
  modal.id = "smileApprovalModal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "10005";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(9, 9, 11, 0.75)";
  modal.style.backdropFilter = "blur(10px)";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.3s ease";
  modal.style.pointerEvents = "auto";

  modal.innerHTML = `
    <div id="smileApprovalModalContainer" style="background: #18181b; width: 90%; max-width: 520px; border-radius: 24px; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6); border: 1px solid rgba(63, 63, 70, 0.9); overflow: hidden; display: flex; flex-direction: column; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); color: #fafafa; font-family: inherit;">
      
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 24px; text-align: center; position: relative; color: white;">
        <button onclick="closeApprovalPopup()" style="position: absolute; right: 16px; top: 16px; background: rgba(255, 255, 255, 0.15); border: none; color: white; font-size: 20px; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>
        
        <div style="width: 56px; height: 56px; background: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; border: 1.5px solid rgba(255, 255, 255, 0.4);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Application Approved</h2>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9; font-weight: 400;">Congratulations! You have been accepted for this program.</p>
      </div>

      <div style="padding: 24px; background: #09090b; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 60vh;">
        
        <div style="background: rgba(39, 39, 42, 0.4); border: 1px solid rgba(63, 63, 70, 0.5); padding: 18px; border-radius: 16px;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #10b981; letter-spacing: 0.5px;">Opportunity Details</span>
          <h3 style="margin: 6px 0 2px; font-size: 16px; font-weight: 700; color: #ffffff;">${escapeHtml(notification.OppTitle || notification.Title)}</h3>
          <p style="margin: 0; font-size: 13px; color: #a1a1aa; font-weight: 500;">${escapeHtml(notification.OrgName || "SMILE Partner")}</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(63, 63, 70, 0.5);">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: 600;">Start Date</span>
              <p style="margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #e4e4e7;">${startDate}</p>
            </div>
            <div>
              <span style="font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: 600;">Province</span>
              <p style="margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #e4e4e7;">${escapeHtml(notification.Province || "National")}</p>
            </div>
          </div>
        </div>

        ${notification.Description ? `
          <div style="background: rgba(39, 39, 42, 0.2); border: 1px solid rgba(63, 63, 70, 0.3); padding: 16px; border-radius: 16px;">
            <span style="font-size: 10px; text-transform: uppercase; color: #71717a; font-weight: 600; display: block; margin-bottom: 6px;">Program Description</span>
            <p style="margin: 0; font-size: 12.5px; color: #d4d4d8; line-height: 1.5; max-height: 120px; overflow-y: auto;">
              ${escapeHtml(notification.Description).replace(/\n/g, '<br>')}
            </p>
          </div>
        ` : ''}
        
      </div>

      <div style="padding: 16px 24px; background: #18181b; border-top: 1px solid rgba(63, 63, 70, 0.8); display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="closeApprovalPopup()" style="padding: 10px 18px; border: 1px solid rgba(63, 63, 70, 0.8); border-radius: 12px; background: transparent; color: #a1a1aa; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px;" onmouseover="this.style.color='#ffffff'; this.style.borderColor='rgba(161, 161, 170, 0.8)'" onmouseout="this.style.color='#a1a1aa'; this.style.borderColor='rgba(63, 63, 70, 0.8)'">Close</button>
        
        <button onclick="window.open('${googleCalUrl}', '_blank'); closeApprovalPopup();" style="padding: 10px 20px; border: none; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);" onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='none'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          Add to Google Calendar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.style.opacity = "1";
    const container = document.getElementById("smileApprovalModalContainer");
    if (container) container.style.transform = "scale(1)";
  }, 50);
}

function closeApprovalPopup() {
  const modal = document.getElementById("smileApprovalModal");
  const container = document.getElementById("smileApprovalModalContainer");
  if (container) container.style.transform = "scale(0.95)";
  if (modal) {
    modal.style.opacity = "0";
    modal.style.pointerEvents = "none";
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "";
    }, 300);
  }
}

function showAppApprovalPopupByIndex(index) {
  if (window.__loadedApplications && window.__loadedApplications[index]) {
    showApprovalPopup(window.__loadedApplications[index]);
  }
}

// Global Inactivity Auto-Logout Tracker (5 Minutes)
(function() {
  let timeoutId;
  const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

  function resetTimer() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(logoutDueToInactivity, INACTIVITY_TIME);
  }

  function logoutDueToInactivity() {
    console.log("Logout due to 5 minutes of inactivity.");
    alert("You have been logged out due to 5 minutes of inactivity.");
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('accountType');
      localStorage.removeItem('userName');
      localStorage.removeItem('initials');
      window.location.href = '/login-page';
    }
  }

  // Events that indicate user activity
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'keypress', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach(name => {
    document.addEventListener(name, resetTimer, { passive: true });
  });

  resetTimer(); // Start the timer initially
})();
