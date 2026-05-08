// Central coordinates for every South African Province
const PROVINCE_CENTERS = {
  Gauteng: { lat: -26.2041, lng: 28.0473 },
  "Western Cape": { lat: -33.9249, lng: 18.4241 },
  "KwaZulu-Natal": { lat: -29.8587, lng: 31.0218 },
  "Eastern Cape": { lat: -33.0153, lng: 27.9116 },
  Limpopo: { lat: -23.4013, lng: 29.4179 },
  Mpumalanga: { lat: -25.5653, lng: 30.5279 },
  "Free State": { lat: -29.0852, lng: 26.1596 },
  "North West": { lat: -26.6638, lng: 25.2838 },
  "Northern Cape": { lat: -29.0467, lng: 23.8837 },
};

function getProvinceCenter(provinceName) {
  return PROVINCE_CENTERS[provinceName] || { lat: -28.4793, lng: 24.6727 }; // Defaults to center of SA
}

/* ================================================================
     MAP SETUP
     ================================================================ */
let map;
let markers = [];
let userMarker = null;
let currentProvince = "";
let filteredOpps = [];
let ALL_OPPORTUNITIES = [];

// Custom gradient pin icon
function createIcon(color) {
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/>
        <circle cx="14" cy="14" r="6" fill="white"/>
      </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });
}

const TYPE_COLORS = {
  scholarship: "#f97316",
  workshop: "#9333ea",
  internship: "#2563eb",
  bursary: "#ec4899",
  programme: "#16a34a",
};

function getColor(type) {
  return TYPE_COLORS[type] || "#6b7280";
}

function initMap() {
  // Centre on South Africa
  map = L.map("smileMap", {
    center: [-28.4793, 24.6727],
    zoom: 6,
    zoomControl: true,
    attributionControl: true,
  });

  // OpenStreetMap tiles — completely free, no key
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);
}

/* ================================================================
     PIN MANAGEMENT
     ================================================================ */
function clearMarkers() {
  markers.forEach(function (m) {
    map.removeLayer(m);
  });
  markers = [];
}

function addOpportunityPins(opps) {
  clearMarkers();

  opps.forEach(function (opp) {
    const typeColor = opp.OppType ? opp.OppType.toLowerCase() : "programme";
    const color = getColor(typeColor);
    const icon = createIcon(color);

    let lat = opp.Lat;
    let lng = opp.Lng;

    // SCATTER FIX: If DB has no exact coordinates, use province center + random offset
    if (!lat || !lng) {
      const center = getProvinceCenter(opp.Province);
      lat = center.lat + (Math.random() - 0.5) * 0.08;
      lng = center.lng + (Math.random() - 0.5) * 0.08;
    }

    const marker = L.marker([lat, lng], { icon: icon })
      .addTo(map)
      .bindPopup(buildPopup(opp), {
        maxWidth: 280,
        className: "smile-popup-container",
      });

    marker.on("click", function () {
      highlightCard(opp.OppID);
    });

    markers.push(marker);
  });

  if (opps.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.15));

    // Fixes the grey map edges issue
    setTimeout(function () {
      map.invalidateSize();
    }, 400);
  }
}

function buildPopup(opp) {
  const typeColor = opp.OppType ? opp.OppType.toLowerCase() : "programme";
  const color = getColor(typeColor);
  return `
      <div class="smile-popup">
        <div class="smile-popup__badge" style="background:${color}22;color:${color}">${opp.OppType}</div>
        <div class="smile-popup__title">${opp.Title}</div>
        <div class="smile-popup__org">${opp.OrgName}</div>
        <div class="smile-popup__meta">
          📍 ${opp.Province} &nbsp;·&nbsp; ⏰ Closes ${formatDate(opp.ApplicationDeadline)}
        </div>
        <button class="smile-popup__btn" onclick="scrollToCard(${opp.OppID})">View Details ↓</button>
      </div>`;
}

function useMyLocation() {
  const btn = document.getElementById("locateBtn");
  btn.disabled = true;
  btn.textContent = "Locating...";
  setMapStatus("loading", "Getting your location...");

  if (!("geolocation" in navigator)) {
    alert(
      "Your browser does not support geolocation. Please select a province instead.",
    );
    resetLocateBtn();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Centre map on user
      map.setView([lat, lng], 10);

      // Add a blue "you are here" marker
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#2563eb",
        color: "#fff",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup("<strong>You are here</strong>")
        .openPopup();

      /* ── Reverse geocode to find province ──────────────────────
           Nominatim is free (OpenStreetMap's geocoding service).
           In production you can also use your own backend to avoid
           Nominatim's 1 request/second rate limit.
        ──────────────────────────────────────────────────────────── */
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: { "Accept-Language": "en" },
        },
      )
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          const addr = data.address || {};
          const province = matchProvince(
            addr.state || addr.province || addr.county || "",
          );

          if (province) {
            // Select province in dropdown
            document.getElementById("provinceSelect").value = province;
            setMapStatus(
              "active",
              `Found you in ${province}. Showing ${province} opportunities.`,
            );
            loadOpportunities(province);
          } else {
            // Still show all SA opps if province not matched
            setMapStatus(
              "active",
              "Location found. Showing all opportunities.",
            );
            loadOpportunities("");
          }
        })
        .catch(function () {
          // Nominatim failed — fallback to showing all
          setMapStatus("active", "Location found. Showing all opportunities.");
          loadOpportunities("");
        });

      resetLocateBtn();
    },

    function (err) {
      const msgs = {
        1: "Location permission denied. Please enable location access in your browser settings, or select a province instead.",
        2: "Location unavailable. Please select a province instead.",
        3: "Location request timed out. Please select a province instead.",
      };
      alert(
        msgs[err.code] ||
          "Could not get your location. Please select a province.",
      );
      setMapStatus("", "Could not get location. Please select a province.");
      resetLocateBtn();
    },

    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  );
}

function resetLocateBtn() {
  const btn = document.getElementById("locateBtn");
  btn.disabled = false;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Use My Location`;
}

/* ── Match geocoded state name to our province list ── */
function matchProvince(stateName) {
  const state = stateName.toLowerCase();
  const map = {
    gauteng: "Gauteng",
    "western cape": "Western Cape",
    kwazulu: "KwaZulu-Natal",
    "zulu-natal": "KwaZulu-Natal",
    "eastern cape": "Eastern Cape",
    limpopo: "Limpopo",
    mpumalanga: "Mpumalanga",
    "free state": "Free State",
    "north west": "North West",
    "northern cape": "Northern Cape",
  };
  for (const key in map) {
    if (state.includes(key)) return map[key];
  }
  return "";
}

/* ================================================================
     PROVINCE DROPDOWN
     ================================================================ */
function onProvinceChange() {
  const sel = document.getElementById("provinceSelect");
  const province = sel.value;
  if (!province) return;

  // Fly to province centre using data attributes
  const opt = sel.options[sel.selectedIndex];
  const lat = parseFloat(opt.dataset.lat);
  const lng = parseFloat(opt.dataset.lng);

  if (lat && lng) {
    map.flyTo([lat, lng], 9, { duration: 1.2 });
  }

  setMapStatus("loading", `Loading opportunities in ${province}...`);

  // Simulate a small delay (replace with real fetch below)
  setTimeout(function () {
    loadOpportunities(province);
  }, 300);
}

function filterResults() {
  const type = document.getElementById("typeSelect").value;
  const keyword = document.getElementById("keywordInput").value.toLowerCase();

  filteredOpps = ALL_OPPORTUNITIES.filter(function (opp) {
    // Note: The API already filtered by province, so we only need to filter type/keyword locally
    const matchType = !type || opp.OppType.toLowerCase() === type.toLowerCase();
    const matchKw =
      !keyword ||
      opp.Title.toLowerCase().includes(keyword) ||
      opp.OrgName.toLowerCase().includes(keyword) ||
      opp.Description.toLowerCase().includes(keyword);
    return matchType && matchKw;
  });

  addOpportunityPins(filteredOpps);
  renderCards(filteredOpps);

  const label = currentProvince || "South Africa";
  setMapStatus(
    "active",
    `Showing ${filteredOpps.length} opportunit${filteredOpps.length === 1 ? "y" : "ies"} in ${label}.`,
  );
  document.getElementById("resultsTitle").textContent =
    `Opportunities in ${label}`;
  document.getElementById("resultsCount").textContent =
    `${filteredOpps.length} found`;
}

/* ================================================================
     CARD RENDERING
     ================================================================ */
function renderCards(opps) {
  const grid = document.getElementById("nearmeGrid");

  if (!opps.length) {
    grid.innerHTML = `
        <div class="nearme-empty">
          <div class="nearme-empty__icon">&#128205;</div>
          <div class="nearme-empty__title">No opportunities found</div>
          <p style="font-size:.875rem">Try a different province, type, or search term.</p>
        </div>`;
    return;
  }

  grid.innerHTML = opps
    .map(function (opp) {
      const typeClass = opp.OppType ? opp.OppType.toLowerCase() : "programme";
      return `
        <div class="nearme-card" id="card-${opp.OppID}" onclick="cardClicked(${opp.OppID})">
          <div class="nearme-card__top">
            <span class="nearme-badge nearme-badge--${typeClass}">${opp.OppType}</span>
            <span class="nearme-card__distance">📍 ${opp.Province}</span>
          </div>
          <div class="nearme-card__title">${opp.Title}</div>
          <div class="nearme-card__org">${opp.OrgName}</div>
          <div class="nearme-card__meta">
            <span>&#9201; Closes ${formatDate(opp.ApplicationDeadline)}</span>
          </div>
          <div class="nearme-card__actions">
            <button class="btn btn--gradient btn--sm" onclick="event.stopPropagation();applyClicked('${opp.Title}', ${opp.OppID})">Apply Now</button>
            <button class="btn btn--outline btn--sm" onclick="event.stopPropagation();saveClicked('${opp.Title}', ${opp.OppID})">Save</button>
          </div>
        </div>`;
    })
    .join("");
}

/* ── Card , map interaction ── */
function cardClicked(id) {
  const opp = filteredOpps.find(function (o) {
    return o.OppID === id;
  });
  if (!opp) return;

  // Pan map to that opportunity's marker
  map.setView([opp.Lat, opp.Lng], 12, { animate: true, duration: 0.8 });

  // Open its popup
  const marker = markers.find(function (m) {
    const ll = m.getLatLng();
    return (
      Math.abs(ll.lat - opp.Lat) < 0.001 && Math.abs(ll.lng - opp.Lng) < 0.001
    );
  });
  if (marker) marker.openPopup();

  highlightCard(id);
}

function highlightCard(id) {
  document.querySelectorAll(".nearme-card").forEach(function (c) {
    c.classList.remove("nearme-card--active");
  });
  const card = document.getElementById("card-" + id);
  if (card) card.classList.add("nearme-card--active");
}

/* ── Popup → scroll to card ── */
function scrollToCard(id) {
  const card = document.getElementById("card-" + id);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightCard(id);
  }
}

/* ================================================================
     UTILS
     ================================================================ */
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function setMapStatus(type, text) {
  const dot = document.getElementById("mapDot");
  const span = document.getElementById("mapStatusText");
  dot.className =
    "map-status__dot" +
    (type === "active"
      ? " map-status__dot--active"
      : type === "loading"
        ? " map-status__dot--loading"
        : "");
  span.textContent = text;
}

function applyClicked(title) {
  alert(
    `Applying for: ${title}\n\n(Connect to your backend POST /api/applications to submit real applications)`,
  );
}

function saveClicked(title) {
  alert(
    `"${title}" saved! (Connect to your backend POST /api/student/saved-opportunities)`,
  );
}

/* ================================================================
     MOBILE NAV
     ================================================================ */
document.getElementById("mobileToggle")?.addEventListener("click", function () {
  document.getElementById("navMenu").classList.toggle("nav__menu--active");
});

initMap();

/*
  API call:

     */
async function loadOpportunities(province) {
  currentProvince = province;
  setMapStatus(
    "loading",
    `Loading opportunities in ${province || "South Africa"}...`,
  );

  try {
    // Call the backend API you just built!
    const url = province
      ? `/api/opportunities?province=${encodeURIComponent(province)}`
      : "/api/opportunities";

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      ALL_OPPORTUNITIES = data.opportunities; // Replace static array with live DB data
      filterResults(); // Apply local keyword/type filters to the new data
    } else {
      setMapStatus("error", "Could not load data from database.");
    }
  } catch (err) {
    console.error("Failed to load opportunities:", err);
    setMapStatus("error", "Server connection failed.");
  }
}
