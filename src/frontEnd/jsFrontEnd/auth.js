// Verification flags
window.studentVerified = false;
window.orgVerified = false;

document.addEventListener('DOMContentLoaded', function() {
  console.log("âœ… auth.js loaded");
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
    console.log("âœ… submit listener attached to studentForm");
  }

  if (organizationForm) {
    organizationForm.addEventListener('submit', handleRegisterSubmit);
  }
  const studentEmailInput = document.getElementById('email');
  const orgEmailInput = document.getElementById('orgEmail');

  studentEmailInput?.addEventListener('input', () => {
    window.studentVerified = false;
    const hint = document.getElementById('email-hint');
    if (hint) hint.style.display = 'none';
  });

  orgEmailInput?.addEventListener('input', () => {
    window.orgVerified = false;
    const hint = document.getElementById('org-email-hint');
    if (hint) hint.style.display = 'none';
  });

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

  // OTP keyboard navigation
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('otp-digit') || e.target.classList.contains('org-otp-digit')) {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val) {
        const next = e.target.nextElementSibling;
        if (next && (next.classList.contains('otp-digit') || next.classList.contains('org-otp-digit'))) {
          next.focus();
        }
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.target.classList.contains('otp-digit') || e.target.classList.contains('org-otp-digit')) && e.key === 'Backspace' && !e.target.value) {
      const prev = e.target.previousElementSibling;
      if (prev) prev.focus();
    }
  });

});

/**
 * Initialize account type selector functionality
 */
function initAccountTypeSelector() {
  const accountTypeCards = document.querySelectorAll('.account-type-card');
  const pills = document.querySelectorAll('.auth-v2-pill');
  const studentForm = document.getElementById('studentForm');
  const organizationForm = document.getElementById('organizationForm');

  accountTypeCards.forEach(card => {
    card.addEventListener('click', function() {
      const selectedType = this.dataset.type;
      accountTypeCards.forEach(c => c.classList.remove('account-type-card--active'));
      this.classList.add('account-type-card--active');
      toggleForms(selectedType);
    });
  });

  pills.forEach(pill => {
    pill.addEventListener('click', function() {
      const selectedType = this.dataset.type;
      pills.forEach(p => p.classList.remove('auth-v2-pill--active'));
      this.classList.add('auth-v2-pill--active');
      toggleForms(selectedType);
    });
  });

  function toggleForms(selectedType) {
    if (studentForm && organizationForm) {
      if (selectedType === 'student') {
        studentForm.style.display = 'block';
        organizationForm.style.display = 'none';
      } else {
        studentForm.style.display = 'none';
        organizationForm.style.display = 'block';
      }
    }
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.target;

  const submitBtn = form.querySelector('.btn--auth-submit') || form.querySelector('.form__submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }

  const email = form.querySelector('#email');
  const password = form.querySelector('#password');
  const accountTypeSelect = document.getElementById('accountType');

  // âœ… Read accountType from the card that is currently active
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
    accountType // âœ… Now correctly reflects which card was clicked
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
    return response.json()
      .then(data => {
        const errorMsg = data?.message || 'Invalid email or password.';
        showFormMessage(form, errorMsg, 'error');
        resetSubmitButton(submitBtn);
        return null;
      })
      .catch(() => {
        if (response.status === 401 || response.status === 403) {
          showFormMessage(form, 'Invalid email or password.', 'error');
        } else {
          showFormMessage(form, 'Something went wrong. Please try again.', 'error');
        }
        resetSubmitButton(submitBtn);
        return null;
      });
  })
  .then(data => {
    if (!data) return;

    localStorage.setItem("token", data.token);
    // Explicitly clean up legacy/sensitive localStorage keys
    localStorage.removeItem("accountType");
    localStorage.removeItem("userName");
    localStorage.removeItem("initials");
    localStorage.removeItem("profilePicUrl");
    localStorage.removeItem("profileComplete");
    localStorage.removeItem("latestScannedMarks");
    localStorage.removeItem("latestScannedSchool");
    localStorage.removeItem("orgName");
    localStorage.removeItem("orgInitials");
    localStorage.removeItem("orgProfilePic");

    showFormMessage(form, 'Login successful! Redirecting...', 'success');

    // âœ… Redirect based on accountType â€” admin checked before organization
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
    showFormMessage(form, 'Network error. Please try again.', 'error');
    resetSubmitButton(submitBtn);
  });
}

function handleRegisterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('.btn--auth-submit') || form.querySelector('.form__submit');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }

  const accountType = form.querySelector('[name="accountType"]')?.value || 'student';

  const password = accountType === 'student'
    ? form.querySelector('#password')
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
    showFormMessage(form, 'You must agree to the Terms and Conditions.', 'error');
    isValid = false;
  }

  if (!isValid) {
    resetSubmitButton(submitBtn);
    return;
  }

  // Check email verification before registering
  if (accountType === 'student' && !window.studentVerified) {
    triggerOTP('student', form, submitBtn);
    return;
  }

  if (accountType === 'organization' && !window.orgVerified) {
    triggerOTP('organization', form, submitBtn);
    return;
  }

  const performRegisterSubmit = (orgDocBase64 = null, orgDocName = null) => {
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
        password: password.value,
        orgDocumentBase64: orgDocBase64,
        orgDocumentName: orgDocName
      };
    }

    if (!url || !formData) {
      showFormMessage(form, 'Could not determine account type. Please try again.', 'error');
      resetSubmitButton(submitBtn);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
    .then(response => {
      if (response.status === 201 || response.status === 200) {
        if (accountType === 'student') {
          showFormMessage(form, 'Account created! Redirecting to login...', 'success');
          setTimeout(() => {
            window.location.href = '/login-page';
          }, 3000);
        } else {
          const orgNameVal = form.querySelector('#orgName')?.value || 'Organisation';
          const orgEmailVal = form.querySelector('#orgEmail')?.value || '';
          form.innerHTML = `
            <div style="
              text-align: center;
              padding: 2.5rem 1.5rem;
              background: #F0FDF4;
              border: 1.5px solid #86EFAC;
              border-radius: 12px;
              margin: 1.5rem 0;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            ">
              <div style="font-size: 14px; margin-bottom: 16px; font-weight: 800; color: #15803D; text-transform: uppercase; letter-spacing: 0;">Application received</div>
              <h3 style="color: #15803D; margin: 0 0 10px; font-size: 20px; font-weight: 700;">Application Received!</h3>
              <p style="color: #166534; margin: 0 0 16px; font-size: 14.5px; line-height: 1.6;">
                Thank you, <strong>${orgNameVal}</strong>! Your application has been received and is now waiting for SMILE Admin review.
              </p>
              <p style="color: #166534; margin: 0 0 20px; font-size: 13.5px; line-height: 1.6; background: rgba(134, 239, 172, 0.2); padding: 10px; border-radius: 8px;">
                We have sent a confirmation email to <strong>${orgEmailVal}</strong>.<br>
                Your organisation account will only be created after admin approval.
              </p>
              <p style="color:#14532D;margin:0;font-size:13px;font-weight:600;">
                Please wait for admin approval before trying to log in.
              </p>
            </div>
          `;
          alert('Application received. Your organisation will be reviewed by an admin before the account is created.');
        }
      } else if (response.status === 403) {
        showFormMessage(form, 'This email is already registered. Please log in.', 'error');
        resetSubmitButton(submitBtn);
      } else if (response.status === 400) {
        showFormMessage(form, 'Please fill in all your details.', 'error');
        resetSubmitButton(submitBtn);
      } else {
        showFormMessage(form, 'Something went wrong. Please try again.', 'error');
        resetSubmitButton(submitBtn);
      }
    })
    .catch(error => {
      console.error('Registration error:', error);
      showFormMessage(form, 'Network error. Please try again.', 'error');
      resetSubmitButton(submitBtn);
    });
  };

  if (accountType === 'organization') {
    const orgDocument = form.querySelector('#orgDocument');
    if (!orgDocument || !orgDocument.files[0]) {
      showError(orgDocument, 'Registration document is required');
      resetSubmitButton(submitBtn);
      return;
    }

    const file = orgDocument.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showError(orgDocument, 'Document must be smaller than 5MB');
      resetSubmitButton(submitBtn);
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      performRegisterSubmit(e.target.result, file.name);
    };
    reader.onerror = function() {
      showFormMessage(form, 'Error reading file. Please try again.', 'error');
      resetSubmitButton(submitBtn);
    };
    reader.readAsDataURL(file);
  } else {
    performRegisterSubmit();
  }
}

async function triggerOTP(type, form, submitBtn) {
  const emailInput = type === 'student' ? form.querySelector('#email') : form.querySelector('#orgEmail');
  const errorEl = type === 'student' ? document.getElementById('email-error') : document.getElementById('org-email-error');
  const statusEl = type === 'student' ? document.getElementById('email-status') : document.getElementById('org-email-status');
  const otpSection = type === 'student' ? document.getElementById('otp-section') : document.getElementById('org-otp-section');
  const otpEmailDisplay = type === 'student' ? document.getElementById('otp-email-display') : document.getElementById('org-otp-email-display');

  const email = emailInput.value.trim();
  if (!email || !validateEmail(email)) {
    showError(emailInput, 'Please enter a valid email address');
    resetSubmitButton(submitBtn);
    return;
  }

  if (errorEl) errorEl.style.display = 'none';
  if (statusEl) statusEl.textContent = 'Validating email and sending OTP...';

  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (statusEl) statusEl.textContent = '';

    if (!data.success) {
      if (errorEl) {
        errorEl.textContent = data.message;
        errorEl.style.display = 'block';
      }
      resetSubmitButton(submitBtn);
      return;
    }

    if (otpEmailDisplay) otpEmailDisplay.textContent = email;
    if (otpSection) otpSection.style.display = 'block';

    // Focus first input
    const inputs = type === 'student' ? document.querySelectorAll('.otp-digit') : document.querySelectorAll('.org-otp-digit');
    if (inputs.length > 0) inputs[0].focus();

  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = '';
    if (errorEl) {
      errorEl.textContent = 'Something went wrong while sending verification code.';
      errorEl.style.display = 'block';
    }
  }
  resetSubmitButton(submitBtn);
}

async function verifyOTP() {
  const entered = Array.from(document.querySelectorAll('.otp-digit')).map(d => d.value).join('');
  if (entered.length < 6) return;

  const emailInput = document.getElementById('email');
  const errorEl = document.getElementById('otp-error');
  const hintEl = document.getElementById('email-hint');
  const otpSection = document.getElementById('otp-section');
  const studentForm = document.getElementById('studentForm');

  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim(), otp: entered })
    });
    const data = await response.json();

    if (data.success) {
      window.studentVerified = true;
      if (otpSection) otpSection.style.display = 'none';
      if (hintEl) hintEl.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';

      // Auto-trigger registration submit now that verification is complete!
      const event = new Event('submit', { cancelable: true });
      studentForm.dispatchEvent(event);
    } else {
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = data.message;
      }
      document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
      const inputs = document.querySelectorAll('.otp-digit');
      if (inputs.length > 0) inputs[0].focus();
    }
  } catch (err) {
    console.error(err);
  }
}

async function verifyOrgOTP() {
  const entered = Array.from(document.querySelectorAll('.org-otp-digit')).map(d => d.value).join('');
  if (entered.length < 6) return;

  const emailInput = document.getElementById('orgEmail');
  const errorEl = document.getElementById('org-otp-error');
  const hintEl = document.getElementById('org-email-hint');
  const otpSection = document.getElementById('org-otp-section');
  const organizationForm = document.getElementById('organizationForm');

  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim(), otp: entered })
    });
    const data = await response.json();

    if (data.success) {
      window.orgVerified = true;
      if (otpSection) otpSection.style.display = 'none';
      if (hintEl) hintEl.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';

      // Auto-trigger registration submit now that verification is complete!
      const event = new Event('submit', { cancelable: true });
      organizationForm.dispatchEvent(event);
    } else {
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'âŒ ' + data.message;
      }
      document.querySelectorAll('.org-otp-digit').forEach(d => d.value = '');
      const inputs = document.querySelectorAll('.org-otp-digit');
      if (inputs.length > 0) inputs[0].focus();
    }
  } catch (err) {
    console.error(err);
  }
}

async function resendCode(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('email').value.trim();
  try {
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
    const errorEl = document.getElementById('otp-error');
    if (errorEl) errorEl.style.display = 'none';
    const inputs = document.querySelectorAll('.otp-digit');
    if (inputs.length > 0) inputs[0].focus();
  } catch (err) {
    console.error(err);
  }
}

async function resendOrgCode(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('orgEmail').value.trim();
  try {
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    document.querySelectorAll('.org-otp-digit').forEach(d => d.value = '');
    const errorEl = document.getElementById('org-otp-error');
    if (errorEl) errorEl.style.display = 'none';
    const inputs = document.querySelectorAll('.org-otp-digit');
    if (inputs.length > 0) inputs[0].focus();
  } catch (err) {
    console.error(err);
  }
}

// Expose verification functions to window scope for HTML onclick attributes
window.verifyOTP = verifyOTP;
window.verifyOrgOTP = verifyOrgOTP;
window.resendCode = resendCode;
window.resendOrgCode = resendOrgCode;

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
 * Show success or error global message on the form
 */
function showFormMessage(form, message, type = 'success') {
  const existingMessage = form.querySelector('.form__success') || form.querySelector('.form-global-msg');
  if (existingMessage) {
    existingMessage.remove();
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = `form-global-msg form-global-msg--${type}`;
  msgDiv.textContent = message;

  const submitButton = form.querySelector('.btn--auth-submit') || form.querySelector('.form__submit');
  if (submitButton) {
    form.insertBefore(msgDiv, submitButton);
  } else {
    form.appendChild(msgDiv);
  }
}

function handleLogout() {
    const token = localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('accountType');

    // ✅ Call logout endpoint to clear cookie on server
    fetch('/logout', { 
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(() => {
        window.location.href = '/login-page';
    });
}
// â”€â”€ NAME VALIDATION â€” NO NUMBERS ALLOWED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // Empty â€” reset
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
// â”€â”€ CONFIRM PASSWORD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    confirmIcon.textContent      = "";
    confirmText.textContent      = "Passwords match";
    confirmInput.style.borderColor = "#10B981";
    confirmInput.classList.remove("form__input--error");
  } else {
    confirmMessage.className     = "no-match";
    confirmIcon.textContent      = "";
    confirmText.textContent      = "Passwords do not match";
    confirmInput.style.borderColor = "#EF4444";
  }
}
document.addEventListener("DOMContentLoaded", () => {

  // â”€â”€ LOGIN EYE TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        ? // Eye CLOSED â€” password now visible
          `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8
                     a18.45 18.45 0 015.06-5.94" stroke-width="2" stroke-linecap="round"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8
                     a18.5 18.5 0 01-2.16 3.19" stroke-width="2" stroke-linecap="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/>
           </svg>`
        : // Eye OPEN â€” password now hidden
          `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" stroke-width="2"/>
           </svg>`;
    });
  }

});
