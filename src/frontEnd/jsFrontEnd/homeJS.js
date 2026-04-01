/**
 * SMILE - Home Page JavaScript
 * Handles navigation toggle and page interactions
 */

document.addEventListener('DOMContentLoaded', function() {

  document.addEventListener("click" , (e)=>{

    console.log(e);

  })
  // Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', function() {
      navMenu.classList.toggle('nav__menu--active');
      
      // Update aria-expanded for accessibility
      const isExpanded = navMenu.classList.contains('nav__menu--active');
      mobileToggle.setAttribute('aria-expanded', isExpanded);
      
      // Change hamburger icon to X when menu is open
      mobileToggle.innerHTML = isExpanded ? '&#10005;' : '&#9776;';
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!mobileToggle.contains(event.target) && !navMenu.contains(event.target)) {
        navMenu.classList.remove('nav__menu--active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.innerHTML = '&#9776;';
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && navMenu.classList.contains('nav__menu--active')) {
        navMenu.classList.remove('nav__menu--active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.innerHTML = '&#9776;';
        mobileToggle.focus();
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(event) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        event.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Add animation on scroll for stats
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements for animation
  document.querySelectorAll('.stats__item, .feature-card').forEach(element => {
    observer.observe(element);
  });
});

// Add CSS for animations dynamically
const style = document.createElement('style');
style.textContent = `
  .stats__item,
  .feature-card {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  
  .stats__item.animate-in,
  .feature-card.animate-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  .feature-card:nth-child(2) {
    transition-delay: 0.1s;
  }
  
  .feature-card:nth-child(3) {
    transition-delay: 0.2s;
  }
`;
document.head.appendChild(style);
