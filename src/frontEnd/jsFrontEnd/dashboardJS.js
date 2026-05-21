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
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();

    if (data.exists) {
      quizStatusCard.style.display = "none";
      chatSection.style.display = "flex";

      const downloadDocBtn = document.getElementById("downloadDocBtn");
      if (downloadDocBtn) downloadDocBtn.style.display = "inline-flex";

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
      chatSection.style.display = "none";
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
      Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      <div style="background: var(--gradient-primary); color: white; padding: 12px 16px; border-radius: 16px 16px 0px 16px; max-width: 80%; box-shadow: var(--shadow-sm); font-size: 0.9375rem; line-height: 1.5;">
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
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #fdf2f8; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid #fbcfe8;">🤖</div>
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
        Authorization: `Bearer ${localStorage.getItem("token")}`,
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
  btn.disabled = true;

  try {
    const res = await fetch("/api/generate-doc-from-chat", {
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
      margin:       0.4, 
      filename:     "My_SMILE_Career_Path.pdf",
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, scrollY: 0 }, // scrollY: 0 fixes the blank page bug!
      jsPDF:        { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak:    { mode: ['css', 'avoid-all'] } // Stops boxes from slicing in half across pages!
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

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("/api/student/saved-opportunities", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

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
              <a href="${opp.ApplicationLink || '#'}" class="btn btn--primary btn--sm" target="_blank">Apply Now</a>
              <button class="btn btn--outline btn--sm btn--icon btn-remove-saved" aria-label="Remove from saved">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
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

async function loadApplications() {
  const container = document.querySelector(".dashboard__section--applications .applications-list");
  if (!container) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("/api/student/applications", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.applications.length > 0) {
      container.innerHTML = data.applications.map(app => {
        const dateApplied = new Date(app.DateApplied).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });
        
        let statusIcon = '';
        let statusClass = '';
        
        if (app.Status === 'Pending' || app.Status === 'Pending Review') {
          statusClass = 'application-card__status--pending';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        } else if (app.Status === 'Reviewed') {
          statusClass = 'application-card__status--interview';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        } else if (app.Status === 'Shortlisted') {
          statusClass = 'application-card__status--accepted';
          statusIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else if (app.Status === 'Interview') {
          statusClass = 'application-card__status--interview';
          statusIcon = '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line>';
        } else if (app.Status === 'Accepted') {
          statusClass = 'application-card__status--accepted';
          statusIcon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else if (app.Status === 'Rejected') {
          statusClass = 'application-card__status--rejected';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line>';
        } else {
          statusClass = 'application-card__status--pending';
          statusIcon = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
        }

        return `
          <article class="application-card" onclick="window.location.href='/careers/explore'" style="cursor: pointer;">
            <div class="application-card__status ${statusClass}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${statusIcon}
              </svg>
              ${app.Status}
            </div>
            <h3 class="application-card__title">${app.Title}</h3>
            <p class="application-card__org">${app.OrgName}</p>
            <p class="application-card__date">Applied: ${dateApplied}</p>
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
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
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

