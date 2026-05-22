document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ auth.js loaded");
  // Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', function() {
      navMenu.classList.toggle('nav__menu--active');
      const isExpanded = navMenu.classList.contains('nav__menu--active');
      mobileToggle.setAttribute('aria-expanded', isExpanded);
      mobileToggle.innerHTML = isExpanded ? '&#10005;' : '&#9776;';
    });
  }
  // Account Type Selector
  initAccountTypeSelector();
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  // Attach to both separate forms
  const studentForm = document.getElementById('studentForm');
  console.log("studentForm found:", studentForm);

  const organizationForm = document.getElementById('organizationForm');

  if (studentForm) {
    studentForm.addEventListener('submit', handleRegisterSubmit);
    console.log("✅ submit listener attached to studentForm");
  }

  if (organizationForm) {
    organizationForm.addEventListener('submit', handleRegisterSubmit);
  }

  // Real-time validation on input blur
  document.querySelectorAll('.form__input').forEach(input => {
    input.addEventListener('blur', function() {
      validateField(this);
    });

    input.addEventListener('input', function() {
      const formGroup = this.closest('.form__group');
      if (formGroup) {
        formGroup.classList.remove('form__group--error');
        this.classList.remove('form__input--error');
      }
    });
  });

});

/**
 * Initialize account type selector functionality
 */
function initAccountTypeSelector() {
  const accountTypeCards = document.querySelectorAll('.account-type-card');
  const studentForm = document.getElementById('studentForm');
  const organizationForm = document.getElementById('organizationForm');

  accountTypeCards.forEach(card => {
    card.addEventListener('click', function() {
      const selectedType = this.dataset.type;

      // Update active state
      accountTypeCards.forEach(c => c.classList.remove('account-type-card--active'));
      this.classList.add('account-type-card--active');

      // Toggle forms based on account type
      if (studentForm && organizationForm) {
        if (selectedType === 'student') {
          studentForm.style.display = 'block';
          organizationForm.style.display = 'none';
        } else {
          studentForm.style.display = 'none';
          organizationForm.style.display = 'block';
        }
      }
    });
  });
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.target;

  const submitBtn = form.querySelector('.form__submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }

  const email = form.querySelector('#email');
  const password = form.querySelector('#password');
  const accountTypeSelect = document.getElementById('accountType');

  // ✅ Read accountType from the card that is currently active
  const activeCard = document.querySelector('.account-type-card--active');
  const accountType = activeCard ? activeCard.dataset.type : accountTypeSelect?.value || 'student';

  console.log("accountType on submit:", accountType);

  let isValid = true;

  if (!validateEmail(email.value)) {
    showError(email, 'Please enter a valid email address');
    isValid = false;
  }

  if (!password.value.trim()) {
    showError(password, 'Password is required');
    isValid = false;
  }

  if (!isValid) {
    resetSubmitButton(submitBtn);
    return;
  }

  const formData = {
    email: email.value.trim().toLowerCase(),
    password: password.value,
    accountType // ✅ Now correctly reflects which card was clicked
  };

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => {
    if (response.status === 200) {
      return response.json();
    }
    if (response.status === 401) {
      showSuccessMessage(form, 'Invalid email or password.');
      resetSubmitButton(submitBtn);
    } else if (response.status === 403) {
      showSuccessMessage(form, 'Invalid email or password.');
      resetSubmitButton(submitBtn);
    } else {
      showSuccessMessage(form, 'Something went wrong. Please try again.');
      resetSubmitButton(submitBtn);
    }
  })
  .then(data => {
    if (!data) return;

    localStorage.setItem("token", data.token);
    localStorage.setItem("accountType", data.accountType);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("initials", data.userinitials);

    showSuccessMessage(form, 'Login successful! Redirecting...');

    // ✅ Redirect based on accountType — admin checked before organization
    // since admins log in via the Organization card but receive accountType: "admin"
    setTimeout(() => {
      if (data.accountType === 'student') {
        window.location.href = '/student/dashboard';
      } else if (data.accountType === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (data.accountType === 'organization') {
        window.location.href = '/org/dashboard';
      }
    }, 3000);

    resetSubmitButton(submitBtn);
  })
  .catch(error => {
    console.error('Login error:', error);
    showSuccessMessage(form, 'Network error. Please try again.');
    resetSubmitButton(submitBtn);
  });
}

function handleRegisterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('.form__submit');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }

  const accountType = form.querySelector('[name="accountType"]')?.value || 'student';

  const password = accountType === 'student'
    ? form.querySelector('#studentPassword')
    : form.querySelector('#orgPassword');

  const terms = accountType === 'student'
    ? form.querySelector('#studentTerms')
    : form.querySelector('#orgTerms');

  let isValid = true;

  if (accountType === 'student') {
    const firstName = form.querySelector('#firstName');
    const lastName = form.querySelector('#lastName');
    const email = form.querySelector('#email');
    const province = form.querySelector('#province');
    const educationLevel = form.querySelector('#educationLevel');

    if (!firstName.value.trim()) {
      showError(firstName, 'First name is required');
      isValid = false;
    }
    if (!lastName.value.trim()) {
      showError(lastName, 'Last name is required');
      isValid = false;
    }
    if (!validateEmail(email.value)) {
      showError(email, 'Please enter a valid email address');
      isValid = false;
    }
    if (!province.value) {
      showError(province, 'Please select your province');
      isValid = false;
    }
    if (!educationLevel.value) {
      showError(educationLevel, 'Please select your education level');
      isValid = false;
    }

  } else {
    const orgName = form.querySelector('#orgName');
    const orgEmail = form.querySelector('#orgEmail');
    const orgType = form.querySelector('#orgType');
    const orgProvince = form.querySelector('#orgProvince');

    if (!orgName.value.trim()) {
      showError(orgName, 'Organization name is required');
      isValid = false;
    }
    if (!validateEmail(orgEmail.value)) {
      showError(orgEmail, 'Please enter a valid email address');
      isValid = false;
    }
    if (!orgType.value) {
      showError(orgType, 'Please select organization type');
      isValid = false;
    }
    if (!orgProvince.value) {
      showError(orgProvince, 'Please select province');
      isValid = false;
    }
  }

  if (!password || password.value.length < 8) {
    showError(password, 'Password must be at least 8 characters');
    isValid = false;
  }

  if (!terms || !terms.checked) {
    const termsGroup = terms?.closest('.form__group');
    if (termsGroup) {
      termsGroup.classList.add('form__group--error');
    }
    showSuccessMessage(form, 'You must agree to the Terms and Conditions.');
    isValid = false;
  }

  if (!isValid) {
    resetSubmitButton(submitBtn);
    return;
  }

  let url;
  let formData;

  if (accountType === 'student') {
    url = '/register/student';
    formData = {
      firstName: form.querySelector('#firstName').value.trim(),
      lastName: form.querySelector('#lastName').value.trim(),
      email: form.querySelector('#email').value.trim().toLowerCase(),
      province: form.querySelector('#province').value,
      educationLevel: form.querySelector('#educationLevel').value,
      password: password.value
    };
  } else if (accountType === 'organization') {
    url = '/register/organization';
    formData = {
      orgName: form.querySelector('#orgName').value.trim(),
      orgEmail: form.querySelector('#orgEmail').value.trim().toLowerCase(),
      orgType: form.querySelector('#orgType').value,
      orgProvince: form.querySelector('#orgProvince').value,
      password: password.value
    };
  }

  if (!url || !formData) {
    showSuccessMessage(form, 'Could not determine account type. Please try again.');
    resetSubmitButton(submitBtn);
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => {
    if (response.status === 201) {
      showSuccessMessage(form, 'Account created! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login-page';
      }, 3000);
    } else if (response.status === 403) {
      showSuccessMessage(form, 'This email is already registered. Please log in.');
      resetSubmitButton(submitBtn);
    } else if (response.status === 400) {
      showSuccessMessage(form, 'Please fill in all your details.');
      resetSubmitButton(submitBtn);
    } else {
      showSuccessMessage(form, 'Something went wrong. Please try again.');
      resetSubmitButton(submitBtn);
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
    showSuccessMessage(form, 'Network error. Please try again.');
    resetSubmitButton(submitBtn);
  });
}

/**
 * Re-enable submit button after error so user can try again
 */
function resetSubmitButton(submitBtn) {
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
}

/**
 * Validate a single field
 */
function validateField(input) {
  const type = input.type;
  const value = input.value.trim();

  if (!input.hasAttribute('required') && !value) {
    return true;
  }

  switch (type) {
    case 'email':
      if (!validateEmail(value)) {
        showError(input, 'Please enter a valid email address');
        return false;
      }
      break;
    case 'password':
      if (value.length < 8 && input.hasAttribute('minlength')) {
        showError(input, 'Password must be at least 8 characters');
        return false;
      }
      break;
    case 'select-one':
      if (input.hasAttribute('required') && !value) {
        showError(input, 'Please make a selection');
        return false;
      }
      break;
    default:
      if (input.hasAttribute('required') && !value) {
        showError(input, `${input.placeholder || 'This field'} is required`);
        return false;
      }
  }

  return true;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Show error message for a field
 */
function showError(input, message) {
  const formGroup = input.closest('.form__group');
  if (formGroup) {
    formGroup.classList.add('form__group--error');
    input.classList.add('form__input--error');

    const errorElement = formGroup.querySelector('.form__error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }
}

/**
 * Show success or info message on the form
 */
function showSuccessMessage(form, message) {
  const existingMessage = form.querySelector('.form__success');
  if (existingMessage) {
    existingMessage.remove();
  }

  const successDiv = document.createElement('div');
  successDiv.className = 'form__success';
  successDiv.style.cssText = `
    background: #10B981;
    color: white;
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
    margin-bottom: 1rem;
    font-weight: 500;
  `;
  successDiv.textContent = message;

  const submitButton = form.querySelector('.form__submit');
  if (submitButton) {
    form.insertBefore(successDiv, submitButton);
  }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('accountType');

    // ✅ Call logout endpoint to clear cookie on server
    fetch('/logout', { method: 'POST' })
    .then(() => {
        window.location.href = '/login-page';
    });
}
// ── NAME VALIDATION — NO NUMBERS ALLOWED ─────────────────────

function blockNumbers(input) {
  const errorEl = document.getElementById(`${input.id}-error`);

  // Remove any digits the user typed
  const cleaned = input.value.replace(/[0-9]/g, "");

  // If digits were found, show error and strip them
  if (input.value !== cleaned) {
    input.value = cleaned;
    input.classList.add("input-error");
    input.classList.remove("input-valid");
    if (errorEl) {
      errorEl.textContent = "Name cannot contain numbers.";
    }
  } else if (cleaned.length > 0) {
    // Valid input
    input.classList.remove("input-error");
    input.classList.add("input-valid");
    if (errorEl) {
      errorEl.textContent = "";
    }
  } else {
    // Empty — reset
    input.classList.remove("input-error", "input-valid");
    if (errorEl) errorEl.textContent = "";
  }
}

// Also block on keypress so numbers never even appear
["firstName", "lastName"].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener("keypress", (e) => {
    if (/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Block paste of numbers
  el?.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/[0-9]/g, "");
    document.execCommand("insertText", false, pasted);
  });
});

// Add name validation to form submit check
document.querySelector("form")?.addEventListener("submit", (e) => {
  const firstName = document.getElementById("firstName");
  const lastName  = document.getElementById("lastName");
  let hasError = false;

  [firstName, lastName].forEach(input => {
    if (!input) return;
    const errorEl = document.getElementById(`${input.id}-error`);
    if (/[0-9]/.test(input.value)) {
      input.classList.add("input-error");
      if (errorEl) errorEl.textContent = "Name cannot contain numbers.";
      hasError = true;
    } else if (input.value.trim() === "") {
      input.classList.add("input-error");
      if (errorEl) errorEl.textContent = "This field is required.";
      hasError = true;
    }
  });

  if (hasError) e.preventDefault();
});
// ── CONFIRM PASSWORD ──────────────────────────────────────────

const confirmInput   = document.getElementById("confirmPassword");
const confirmMessage = document.getElementById("confirmMessage");
const confirmIcon    = document.getElementById("confirmIcon");
const confirmText    = document.getElementById("confirmText");
const passwordInput  = document.getElementById("password");

// Check match as user types in confirm field
confirmInput?.addEventListener("input", checkPasswordMatch);

// Re-check if original password changes after confirm is filled
passwordInput?.addEventListener("input", () => {
  if (confirmInput.value.length > 0) checkPasswordMatch();
});

function checkPasswordMatch() {
  const password = passwordInput.value;
  const confirm  = confirmInput.value;

  if (confirm.length === 0) {
    confirmMessage.style.display = "none";
    confirmInput.classList.remove("form__input--success", "form__input--error");
    return;
  }

  confirmMessage.style.display = "flex";

  if (password === confirm) {
    confirmMessage.className     = "match";
    confirmIcon.textContent      = "✓";
    confirmText.textContent      = "Passwords match";
    confirmInput.style.borderColor = "#10B981";
    confirmInput.classList.remove("form__input--error");
  } else {
    confirmMessage.className     = "no-match";
    confirmIcon.textContent      = "✕";
    confirmText.textContent      = "Passwords do not match";
    confirmInput.style.borderColor = "#EF4444";
  }
}
document.addEventListener("DOMContentLoaded", () => {

  // ── LOGIN EYE TOGGLE ────────────────────────────────────────
  const loginPasswordInput = document.getElementById("password");
  const loginToggleBtn     = document.getElementById("toggleLoginPassword");

  if (loginPasswordInput && loginToggleBtn) {
    loginToggleBtn.addEventListener("click", () => {
      const isHidden = loginPasswordInput.type === "password";

      // Toggle
      loginPasswordInput.type = isHidden ? "text" : "password";
      loginToggleBtn.style.color = isHidden ? "#F97316" : "#9CA3AF";

      // Swap icon
      loginToggleBtn.innerHTML = isHidden
        ? // Eye CLOSED — password now visible
          `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8
                     a18.45 18.45 0 015.06-5.94" stroke-width="2" stroke-linecap="round"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8
                     a18.5 18.5 0 01-2.16 3.19" stroke-width="2" stroke-linecap="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/>
           </svg>`
        : // Eye OPEN — password now hidden
          `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" stroke-width="2"/>
           </svg>`;
    });
  }

});