document.addEventListener("DOMContentLoaded", function () {

    loadOrgSidebarProfile();

    // Character counter
    window.updateCharCount = function (el, countId, max) {
        document.getElementById(countId).textContent = `${el.value.length} / ${max}`;
    };

    // Toast helper
    function showToast(msg, type = "") {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.className = "toast toast--show" + (type ? ` toast--${type}` : "");
        setTimeout(() => { t.className = "toast"; }, 3000);
    }

    // Show/hide form message
    function setFormMsg(msg, type) {
        const el = document.getElementById("formMsg");
        el.textContent = msg;
        el.className = `form-msg form-msg--${type}`;
    }

    // Validate a single field
    function validateField(id) {
        const el = document.getElementById(id);
        const grp = el.closest(".form__group");
        if (!el.value.trim()) {
            grp.classList.add("form__group--error");
            return false;
        }
        grp.classList.remove("form__group--error");
        return true;
    }

    // Remove error on input
    document.querySelectorAll(".form__input").forEach(el => {
        el.addEventListener("input", function () {
            this.closest(".form__group")?.classList.remove("form__group--error");
        });
    });

    document.querySelectorAll(".type-option").forEach(el => {
        el.addEventListener("change", function () {
            document.getElementById("typeGroup").classList.remove("form__group--error");
        });
    });


    // Add this inside your DOMContentLoaded
const oppImageInput = document.getElementById("oppImageInput");
if (oppImageInput) {
    oppImageInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be smaller than 5MB.", "error");
            this.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            window._oppImageBase64 = e.target.result; // store base64

            const preview = document.getElementById("oppImagePreview");
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block";
            }
            const placeholder = document.getElementById("uploadPlaceholder");
            if (placeholder) {
                placeholder.style.display = "none";
            }
        };
        reader.readAsDataURL(file);
    });
}

// Clear image on form reset
document.getElementById("clearBtn").addEventListener("click", function () {
    window._oppImageBase64 = null;
    const preview = document.getElementById("oppImagePreview");
    if (preview) { preview.src = ""; preview.style.display = "none"; }
    const placeholder = document.getElementById("uploadPlaceholder");
    if (placeholder) { placeholder.style.display = "block"; }
    // ... rest of your existing clear logic
});


    // Submit — Publish
    document.getElementById("createOppForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        // Validate required fields
        let valid = true;
        ["newTitle", "newProvince", "newDeadline", "newDesc"].forEach(id => {
            if (!validateField(id)) valid = false;
        });

        const selectedType = document.querySelector('input[name="oppType"]:checked');
        if (!selectedType) {
            document.getElementById("typeGroup").classList.add("form__group--error");
            valid = false;
        }

        if (!valid) {
            setFormMsg("Please fill in all required fields before publishing.", "error");
            return;
        }

        const deadlineVal = document.getElementById("newDeadline").value;
        const todayStr = new Date().toLocaleDateString("en-CA");
        if (deadlineVal < todayStr) {
            setFormMsg("Application closing date cannot be in the past.", "error");
            showToast("Application closing date cannot be in the past.", "error");
            return;
        }
        // Add to your existing payload object
        const payload = {
            title:           document.getElementById("newTitle").value.trim(),
            type:            selectedType.value,
            address:         document.getElementById("newAddress").value.trim(),
            province:        document.getElementById("newProvince").value,
            maxApplicants:   document.getElementById("newMax").value || null,
            description:     document.getElementById("newDesc").value.trim(),
            requirements:    document.getElementById("newReq").value.trim(),
            deadline:        document.getElementById("newDeadline").value,
            startDate:       document.getElementById("newStart").value || null,
            applicationLink: document.getElementById("newLink").value.trim(),
            oppImage:        window._oppImageBase64 || null  // ✅ Add this
        };

        // const payload = {
        //     title:           document.getElementById("newTitle").value.trim(),
        //     type:            selectedType.value,
        //     province:        document.getElementById("newProvince").value,
        //     maxApplicants:   document.getElementById("newMax").value || null,
        //     description:     document.getElementById("newDesc").value.trim(),
        //     requirements:    document.getElementById("newReq").value.trim(),
        //     deadline:        document.getElementById("newDeadline").value,
        //     startDate:       document.getElementById("newStart").value || null,
        //     applicationLink: document.getElementById("newLink").value.trim()
        // };

        const publishBtn = document.getElementById("publishBtn");
        publishBtn.disabled = true;
        publishBtn.textContent = "Publishing...";

        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch("/api/opportunities/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                setFormMsg("Opportunity published successfully!", "success");
                showToast("Opportunity published!", "success");
                document.getElementById("createOppForm").reset();
                document.getElementById("descCount").textContent = "0 / 1000";

                // Reset image preview and base64 cache
                window._oppImageBase64 = null;
                const preview = document.getElementById("oppImagePreview");
                if (preview) { preview.src = ""; preview.style.display = "none"; }
                const placeholder = document.getElementById("uploadPlaceholder");
                if (placeholder) { placeholder.style.display = "block"; }
            } else {
                setFormMsg(data.message || "Something went wrong.", "error");
                showToast("Failed to publish.", "error");
            }

        } catch (err) {
            console.error(err);
            setFormMsg("Network error. Please try again.", "error");
            showToast("Network error.", "error");
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
                </svg>
                Publish Opportunity`;
        }
    });

    // Save as Draft
    document.getElementById("draftBtn").addEventListener("click", function () {
        document.getElementById("formMsg").className = "";
        document.getElementById("formMsg").textContent = "";
        showToast("Saved as draft.");
    });

    // Clear form
    document.getElementById("clearBtn").addEventListener("click", function () {
        document.getElementById("createOppForm").reset();
        document.getElementById("descCount").textContent = "0 / 1000";
        document.getElementById("formMsg").className = "";
        document.getElementById("formMsg").textContent = "";
        document.querySelectorAll(".form__group--error").forEach(g => g.classList.remove("form__group--error"));
        showToast("Form cleared.");
    });


    const logoutTag = document.getElementById("logout");
    if (logoutTag) {
        logoutTag.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadOrgSidebarProfile() {
    const avatarEl = document.getElementById("sidebarInitials");
    const nameEl = document.getElementById("sidebarOrgName");
    if (!avatarEl && !nameEl) return;

    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch("/api/org/profile", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success || !data.profile) return;

        const orgName = data.profile.OrgName || "My Organisation";
        const initials = orgName.slice(0, 2).toUpperCase();

        if (nameEl) nameEl.textContent = orgName;
        if (avatarEl) {
            if (data.profile.OrgProfilePic) {
                avatarEl.innerHTML = `<img src="${data.profile.OrgProfilePic}" alt="${orgName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                avatarEl.textContent = initials;
            }
        }
    } catch (err) {
        console.error("[SMILE] Could not load organisation sidebar profile:", err);
    }
}

function isTokenExpired(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
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
        .catch(() => {})
        .finally(() => {
            window.location.href = '/login-page';
        });
}

// Expose helpers globally
window.isTokenExpired = isTokenExpired;
window.getToken = getToken;
window.logout = logout;

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
