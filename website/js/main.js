/**
 * AGDI Landing Page — Interactions
 */

// --- Scroll-based navigation styling ---
const nav = document.getElementById("nav");

function updateNavOnScroll() {
  if (window.scrollY > 20) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
}

window.addEventListener("scroll", updateNavOnScroll, { passive: true });
updateNavOnScroll();

// --- Mobile menu toggle ---
const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

// Close mobile menu on link click
navLinks.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// --- Scroll reveal animations ---
const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.1,
    rootMargin: "0px 0px -60px 0px",
  }
);

revealElements.forEach((el) => revealObserver.observe(el));

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const targetId = anchor.getAttribute("href");
    if (targetId === "#") return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-height"));
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: "smooth" });
    }
  });
});

// --- Stagger animation for grid children ---
document.querySelectorAll(".features-grid, .channels-grid, .tools-grid, .apps-grid, .steps-grid").forEach((grid) => {
  const staggerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          Array.from(entry.target.children).forEach((child, i) => {
            child.style.opacity = "0";
            child.style.transform = "translateY(16px)";
            child.style.transition = `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                child.style.opacity = "1";
                child.style.transform = "translateY(0)";
              });
            });
          });
          staggerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  staggerObserver.observe(grid);
});

// --- Deploy code copy on click ---
document.querySelectorAll(".deploy-code").forEach((code) => {
  code.style.cursor = "pointer";
  code.title = "Click to copy";
  code.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent.trim());
      const original = code.textContent;
      code.textContent = "Copied!";
      code.style.color = "var(--accent-green)";
      setTimeout(() => {
        code.textContent = original;
        code.style.color = "";
      }, 1500);
    } catch {
      // Clipboard API may not be available
    }
  });
});
