/**
 * SMILE Dashboard JavaScript
 * Handles dashboard interactions, profile dropdown, and location services
 */

document.addEventListener("DOMContentLoaded", function () {
  initMobileNavigation();
  initProfileDropdown();
  initLocationButton();
  initOpportunityActions();
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

      // Toggle hamburger/close icon
      const isOpen = navMenu.classList.contains("nav__menu--active");
      mobileToggle.innerHTML = isOpen ? "&#10005;" : "&#9776;";
      mobileToggle.setAttribute("aria-expanded", isOpen);
    });

    // Close menu when clicking outside
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

    // Close dropdown when clicking outside
    document.addEventListener("click", function (event) {
      if (
        !profileBtn.contains(event.target) &&
        !profileMenu.contains(event.target)
      ) {
        profileMenu.classList.remove("nav__profile-menu--active");
      }
    });

    // Close dropdown on escape key
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

  if (locationBtn) {
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

            // Update map placeholder with success message
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

            // TODO: Integrate with mapping API (Google Maps, Mapbox, etc.)
            // fetchNearbyOpportunities(latitude, longitude);
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

            // Reset button
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
}

/**
 * Opportunity Card Actions
 */
function initOpportunityActions() {
  // Handle remove from saved buttons
  const removeButtons = document.querySelectorAll(
    ".opportunity-card__actions .btn--icon",
  );

  removeButtons.forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();

      const card = btn.closest(".opportunity-card");
      const title = card.querySelector(".opportunity-card__title").textContent;

      if (confirm(`Remove "${title}" from saved opportunities?`)) {
        // Add fade-out animation
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "translateX(-20px)";

        setTimeout(function () {
          card.remove();

          // TODO: Send remove request to server
          // removeOpportunity(opportunityId);

          // Update saved count
          updateSavedCount(-1);
        }, 300);
      }
    });
  });

  // Handle download ebook buttons
  const downloadButtons = document.querySelectorAll(".ebook-card .btn");

  downloadButtons.forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();

      const card = btn.closest(".ebook-card");
      const title = card.querySelector(".ebook-card__title").textContent;

      // Simulate download
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

        // TODO: Actually download the file
        // downloadEbook(ebookId);

        // Reset after 2 seconds
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
        const newCount = Math.max(0, currentCount + change);
        numberEl.textContent = newCount;
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
