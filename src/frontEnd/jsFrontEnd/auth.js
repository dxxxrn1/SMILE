/**
 * SMILE - Authentication JavaScript
 * Handles form validation for login and registration
 * Handles account type switching between Student and Organization
 */

document.addEventListener('DOMContentLoaded', function() {

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

  // ✅ Fixed - attach to both separate forms
  const studentForm = document.getElementById('studentForm');
  const organizationForm = document.getElementById('organizationForm');

  if (studentForm) {
    studentForm.addEventListener('submit', handleRegisterSubmit);
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

/**
 * Handle login form submission
 */
function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const email = form.querySelector('#email');
  const password = form.querySelector('#password');

  let isValid = true;

  if (!validateEmail(email.value)) {
    showError(email, 'Please enter a valid email address');
    isValid = false;
  }

  if (!password.value.trim()) {
    showError(password, 'Password is required');
    isValid = false;
  }

  if (isValid) {
    const formData = {
      email: email.value.trim().toLowerCase(),
      password: password.value
    };

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(response => {
      if (response.status === 200) {
        showSuccessMessage(form, 'Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else if(response.status === 403){
        showSuccessMessage(form, "User/Organisation with the email exists pleaselog in");
      }
      else if (response.status === 401) {
        showSuccessMessage(form, 'Invalid email or password.');
      } else {
        showSuccessMessage(form, 'Something went wrong. Please try again.');
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      showSuccessMessage(form, 'Network error. Please try again.');
    });
  }
}

/**
 * Handle registration form submission
 */
function handleRegisterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const accountType = form.querySelector('[name="accountType"]')?.value || 'student';

  // ✅ Fixed - get correct password and terms based on which form was submitted
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

  // Validate password
  if (!password || password.value.length < 8) {
    showError(password, 'Password must be at least 8 characters');
    isValid = false;
  }

  // Validate terms
  if (!terms || !terms.checked) {
    const termsGroup = terms?.closest('.form__group');

    if (termsGroup) {
      termsGroup.classList.add('form__group--error');
    }
    isValid = false;

  }

  if (isValid) {
    let formData;
    let url;

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
    } else {
      url = '/register/organization';
      formData = {
        orgName: form.querySelector('#orgName').value.trim(),
        orgEmail: form.querySelector('#orgEmail').value.trim().toLowerCase(),
        orgType: form.querySelector('#orgType').value,
        orgProvince: form.querySelector('#orgProvince').value,
        password: password.value
      };
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
      }
      else if (response.status === 400) {

        showSuccessMessage(form, 'Please fill in all your details.');

      } else {

        showSuccessMessage(form, 'Something went wrong. Please try again.');

      }
    })
    .catch(error => {

      console.error('Registration error:', error);

      showSuccessMessage(form, 'Network error. Please try again.');

    });
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
 * Show success or error message on the form
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
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';
    form.insertBefore(successDiv, submitButton);
  }
}