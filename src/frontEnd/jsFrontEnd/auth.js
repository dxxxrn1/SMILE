/**
 * SMILE - Authentication JavaScript
 * Handles form validation for login and registration
 * Handles account type switching between Student and Organization
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Navigation Toggle (shared across pages)
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

  // Login Form Validation
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  // Registration Form Validation
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }

  // Real-time validation on input blur
  document.querySelectorAll('.form__input').forEach(input => {
    input.addEventListener('blur', function() {
      validateField(this);
    });

    // Clear error on input
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
  const accountTypeInput = document.getElementById('accountType');
  const studentFields = document.getElementById('studentFields');
  const organizationFields = document.getElementById('organizationFields');
  const submitBtn = document.getElementById('submitBtn');

  accountTypeCards.forEach(card => {
    card.addEventListener('click', function() {
      const selectedType = this.dataset.type;

      // Update active state
      accountTypeCards.forEach(c => c.classList.remove('account-type-card--active'));
      this.classList.add('account-type-card--active');

      // Update hidden input value
      if (accountTypeInput) {
        accountTypeInput.value = selectedType;
      }

      // Toggle form fields based on account type (for registration page)
      if (studentFields && organizationFields) {
        if (selectedType === 'student') {
          studentFields.style.display = 'block';
          organizationFields.style.display = 'none';
          
          // Update required attributes
          setFieldsRequired(studentFields, true);
          setFieldsRequired(organizationFields, false);
          
          // Update submit button text
          if (submitBtn) {
            submitBtn.textContent = 'Create Student Account';
          }
        } else {
          studentFields.style.display = 'none';
          organizationFields.style.display = 'block';
          
          // Update required attributes
          setFieldsRequired(studentFields, false);
          setFieldsRequired(organizationFields, true);
          
          // Update submit button text
          if (submitBtn) {
            submitBtn.textContent = 'Create Organization Account';
          }
        }
      }
    });
  });
}

/**
 * Set required attribute on form fields within a container
 */
function setFieldsRequired(container, isRequired) {
  if (!container) return;
  
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach(input => {
    if (isRequired) {
      input.setAttribute('required', '');
    } else {
      input.removeAttribute('required');
    }
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
  const accountType = form.querySelector('#accountType');
  
  let isValid = true;
  
  // Validate email
  if (!validateEmail(email.value)) {
    showError(email, 'Please enter a valid email address');
    isValid = false;
  }
  
  // Validate password
  if (!password.value.trim()) {
    showError(password, 'Password is required');
    isValid = false;
  }
  
  if (isValid) {
    // Form is valid - prepare data for database submission
    const formData = {
      email: email.value.trim(),
      password: password.value,
      accountType: accountType ? accountType.value : 'student',
      remember: form.querySelector('#remember')?.checked || false
    };
    
    // TODO: Send to backend API when database is connected
    // For now, show success feedback
    showSuccessMessage(form, 'Login successful! Redirecting...');
    
    // Simulate redirect after successful login
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1500);
  }
}

/**
 * Handle registration form submission
 */
function handleRegisterSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const accountType = form.querySelector('#accountType')?.value || 'student';
  const password = form.querySelector('#password');
  const terms = form.querySelector('#terms');
  
  let isValid = true;
  
  if (accountType === 'student') {
    // Validate student fields
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
    // Validate organization fields
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
  if (password.value.length < 8) {
    showError(password, 'Password must be at least 8 characters');
    isValid = false;
  }
  
  // Validate terms acceptance
  if (!terms.checked) {
    const termsGroup = terms.closest('.form__group');
    if (termsGroup) {
      termsGroup.classList.add('form__group--error');
    }
    isValid = false;
  }
  
  if (isValid) {
    // Form is valid - prepare data for database submission
    let formData;
    
    if (accountType === 'student') {
      formData = {
        accountType: 'student',
        firstName: form.querySelector('#firstName').value.trim(),
        lastName: form.querySelector('#lastName').value.trim(),
        email: form.querySelector('#email').value.trim(),
        province: form.querySelector('#province').value,
        educationLevel: form.querySelector('#educationLevel').value,
        password: password.value
      };
    } else {
      formData = {
        accountType: 'organization',
        organizationName: form.querySelector('#orgName').value.trim(),
        email: form.querySelector('#orgEmail').value.trim(),
        organizationType: form.querySelector('#orgType').value,
        province: form.querySelector('#orgProvince').value,
        password: password.value
      };
    }
    
    // TODO: Send to backend API when database is connected
    // For now, show success feedback
    showSuccessMessage(form, 'Account created successfully! Redirecting to login...');
    
    // Simulate redirect after successful registration
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  }
}

/**
 * Validate a single field
 */
function validateField(input) {
  const type = input.type;
  const value = input.value.trim();
  
  // Skip validation for non-required fields that are empty
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
 * Show success message
 */
function showSuccessMessage(form, message) {
  // Remove any existing success message
  const existingMessage = form.querySelector('.form__success');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create and insert success message
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
