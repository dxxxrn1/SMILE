document.addEventListener("DOMContentLoaded", function () {
  setMinDates();
  initForm();
});

/* ================================================================
   MIN DATES
   ================================================================ */
function setMinDates() {
  const today = new Date().toISOString().split("T")[0];
  const deadline = document.getElementById("newDeadline");
  const start = document.getElementById("newStart");
  if (deadline) deadline.min = today;
  if (start) start.min = today;
}

/* ================================================================
   CHAR COUNTER
   ================================================================ */
function updateCharCount(el, counterId, max) {
  const len = el.value.length;
  const counter = document.getElementById(counterId);
  if (!counter) return;
  counter.textContent = len + " / " + max;
  counter.className =
    "char-count" +
    (len >= max
      ? " char-count--over"
      : len > max * 0.9
        ? " char-count--warn"
        : "");
}

/* ================================================================
   VALIDATION
   ================================================================ */
function validate(asDraft) {
  let valid = true;

  const titleEl = document.getElementById("newTitle");
  const provinceEl = document.getElementById("newProvince");
  const deadlineEl = document.getElementById("newDeadline");
  const descEl = document.getElementById("newDesc");
  const typeGroup = document.getElementById("typeGroup");
  const typeSelected = document.querySelector('input[name="oppType"]:checked');

  // Always validate title
  setError(titleEl, !titleEl.value.trim());
  if (!titleEl.value.trim()) valid = false;

  if (!asDraft) {
    setError(provinceEl, !provinceEl.value);
    if (!provinceEl.value) valid = false;

    setError(deadlineEl, !deadlineEl.value);
    if (!deadlineEl.value) valid = false;

    setError(descEl, !descEl.value.trim());
    if (!descEl.value.trim()) valid = false;

    // Type group error
    if (!typeSelected) {
      typeGroup.classList.add("form__group--error");
      valid = false;
    } else {
      typeGroup.classList.remove("form__group--error");
    }
  }

  return valid;
}

function setError(el, hasError) {
  const group = el.closest(".form__group");
  if (!group) return;
  group.classList.toggle("form__group--error", hasError);
}

/* ================================================================
   FORM INIT
   ================================================================ */
function initForm() {
  const form = document.getElementById("createOppForm");
  const draftBtn = document.getElementById("draftBtn");
  const clearBtn = document.getElementById("clearBtn");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleSubmit(false);
    });
  }

  if (draftBtn) {
    draftBtn.addEventListener("click", function () {
      handleSubmit(true);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", resetForm);
  }
}

/* ================================================================
   SUBMIT HANDLER
   ================================================================ */
function handleSubmit(asDraft) {
  if (!validate(asDraft)) {
    showMsg("Please fill in all required fields.", "error");
    return;
  }

  const btnId = asDraft ? "draftBtn" : "publishBtn";
  const btn = document.getElementById(btnId);
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = asDraft ? "Saving..." : "Publishing...";

  // Mark progress steps
  setStepState("step1", "done");
  setStepState("step2", "active");

  // Simulate API call — swap setTimeout for real fetch('/api/opportunities', {...})
  setTimeout(function () {
    btn.disabled = false;
    btn.innerHTML = orig;

    setStepState("step2", "done");
    setStepState("step3", "active");

    if (asDraft) {
      showMsg("Draft saved! Find it under My Opportunities.", "success");
      showToast("Draft saved");
    } else {
      showMsg("Opportunity published! Youth can now discover it.", "success");
      showToast("Opportunity published 🎉");
      // Redirect back to dashboard after a short delay
      setTimeout(function () {
        window.location.href = "orgdashboard.html";
      }, 2000);
    }
  }, 1100);
}

/* ================================================================
   RESET FORM
   ================================================================ */
function resetForm() {
  const form = document.getElementById("createOppForm");
  if (form) form.reset();

  document.querySelectorAll(".form__group--error").forEach(function (g) {
    g.classList.remove("form__group--error");
  });

  const msg = document.getElementById("formMsg");
  if (msg) msg.style.display = "none";

  const descCount = document.getElementById("descCount");
  if (descCount) descCount.textContent = "0 / 1000";

  // Reset steps
  ["step1", "step2", "step3"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.className = "step";
  });
  setStepState("step1", "active");
}

/* ================================================================
   STEP STATE
   ================================================================ */
function setStepState(stepId, state) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.classList.remove("step--active", "step--done");
  if (state === "active") el.classList.add("step--active");
  if (state === "done") el.classList.add("step--done");
}

/* ================================================================
   FORM MESSAGE
   ================================================================ */
function showMsg(text, type) {
  const el = document.getElementById("formMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "form-msg form-msg--" + type;
  el.style.display = "flex";
  setTimeout(function () {
    el.style.display = "none";
  }, 5000);
}

/* ================================================================
   TOAST
   ================================================================ */
let _toastTimer;

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("toast--show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () {
    toast.classList.remove("toast--show");
  }, 3000);
}
