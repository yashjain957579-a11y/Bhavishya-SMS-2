/**
 * ============================================================================
 * BHAVISHYA SMS (STUDY MADE SIMPLE) — 3D SCROLL ANIMATION & LANDING PAGE ENGINE
 * Architecture: Lenis Smooth Scroll + GSAP ScrollTrigger + Canvas Frame Blitter
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const TOTAL_FRAMES = 180;
  const CANVAS_ID = 'hero-canvas';
  const SCROLL_CONTAINER_SELECTOR = '#hero-pin-target';

  // State Management
  const state = {
    frames: new Array(TOTAL_FRAMES),
    loadedFramesCount: 0,
    currentFrameIndex: 0,
    isLoaded: false,
    useWebp: true,
  };

  // DOM Elements
  const canvas = document.getElementById(CANVAS_ID);
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const loaderPercent = document.getElementById('loader-percent-num');
  const loaderStatus = document.getElementById('loader-status-text');
  const navContainer = document.getElementById('main-nav');
  const demoModal = document.getElementById('demoModal');

  // ==========================================================================
  // 1. LENIS INERTIAL SMOOTH SCROLLING SETUP
  // ==========================================================================
  let lenis;
  try {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  } catch (err) {
    console.warn('Lenis smooth scroll failed to initialize:', err);
  }

  // ==========================================================================
  // 2. CANVAS SIZING & RESPONSIVE PROJECTION
  // ==========================================================================
  function resizeCanvas() {
    if (!canvas || !ctx) return;

    // Use devicePixelRatio for crisp High-DPI / Retina rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Redraw the current active frame
    renderCurrentFrame();
  }

  window.addEventListener('resize', debounce(resizeCanvas, 100));

  /**
   * Render the active frame onto the canvas with cover & right-aligned positioning
   * so the educator and glowing 3D holographic equations remain positioned on the right
   */
  function drawFrameToCanvas(img) {
    if (!ctx || !canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;

    // Clear with pure pitch-black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);

    const imgW = img.naturalWidth || 1920;
    const imgH = img.naturalHeight || 1080;
    const imgRatio = imgW / imgH;
    const screenRatio = cw / ch;

    let renderW, renderH, offsetX, offsetY;

    if (screenRatio > imgRatio) {
      // Screen is wider than 16:9 (e.g. Ultrawide monitors)
      renderW = cw;
      renderH = cw / imgRatio;
      offsetX = 0;
      offsetY = (ch - renderH) / 2;
    } else {
      // Screen is narrower (e.g. Laptops, tablets, mobile)
      renderH = ch;
      renderW = ch * imgRatio;
      offsetY = 0;

      // Position logic: keep educator & holograms nicely anchored
      if (window.innerWidth >= 1024) {
        // Desktop: Align firmly to the right side
        offsetX = cw - renderW;
      } else if (window.innerWidth >= 768) {
        // Tablet: Slightly offset
        offsetX = (cw - renderW) * 0.85;
      } else {
        // Mobile portrait: center-right backdrop
        offsetX = (cw - renderW) * 0.6;
      }
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  /**
   * Nearest-Loaded-Frame Fallback:
   * Returns the exact frame if loaded, or scans outward for the closest
   * already-loaded keyframe so the canvas never flashes blank or stutters
   * while Pass 2 downloads in the background.
   */
  function getBestAvailableFrame(targetIndex) {
    if (state.frames[targetIndex] && state.frames[targetIndex].complete && state.frames[targetIndex].naturalWidth > 0) {
      return state.frames[targetIndex];
    }
    for (let delta = 1; delta < TOTAL_FRAMES; delta++) {
      const left = targetIndex - delta;
      if (left >= 0 && state.frames[left] && state.frames[left].complete && state.frames[left].naturalWidth > 0) {
        return state.frames[left];
      }
      const right = targetIndex + delta;
      if (right < TOTAL_FRAMES && state.frames[right] && state.frames[right].complete && state.frames[right].naturalWidth > 0) {
        return state.frames[right];
      }
    }
    return null;
  }

  function renderCurrentFrame() {
    const frame = getBestAvailableFrame(state.currentFrameIndex);
    if (frame) {
      drawFrameToCanvas(frame);
    }
  }

  function renderFrameByIndex(index) {
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    state.currentFrameIndex = clamped;
    renderCurrentFrame();
  }

  // ==========================================================================
  // 3. TWO-PASS PROGRESSIVE FRAME PRELOADER
  // ==========================================================================
  function getFramePath(index, isWebp = true) {
    const pad = String(index + 1).padStart(4, '0');
    return isWebp ? `frames/frame_${pad}.webp` : `frames/frame_${pad}.jpg`;
  }

  function loadSingleFrame(index, onDone) {
    if (state.frames[index] && state.frames[index].complete && state.frames[index].naturalWidth > 0) {
      if (onDone) onDone(state.frames[index]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      state.frames[index] = img;
      state.loadedFramesCount++;
      // If user is currently looking at or near this frame, re-render for maximum crispness
      if (Math.abs(state.currentFrameIndex - index) <= 1) {
        renderCurrentFrame();
      }
      if (onDone) onDone(img);
    };

    img.onerror = () => {
      // Fallback attempt to jpg
      const fallback = new Image();
      fallback.onload = () => {
        state.frames[index] = fallback;
        state.loadedFramesCount++;
        if (Math.abs(state.currentFrameIndex - index) <= 1) {
          renderCurrentFrame();
        }
        if (onDone) onDone(fallback);
      };
      fallback.onerror = () => {
        if (onDone) onDone(null);
      };
      fallback.src = getFramePath(index, false);
    };

    img.src = getFramePath(index, state.useWebp);
  }

  function initPreloader() {
    // Pass 1: Critical first frame loaded immediately and drawn right away
    const firstImg = new Image();
    firstImg.onload = () => {
      state.frames[0] = firstImg;
      state.loadedFramesCount++;
      drawFrameToCanvas(firstImg);
    };
    firstImg.src = getFramePath(0, state.useWebp);

    // Build Pass 1 Priority Batch (~25 keyframes):
    // First 10 frames (1 to 10 -> indices 0 to 9)
    // Plus every 8th frame across timeline (16, 24, 32 ... 180 -> indices 15, 23, 31 ... 179)
    const priorityIndices = [];
    for (let i = 0; i < Math.min(10, TOTAL_FRAMES); i++) {
      if (!priorityIndices.includes(i)) priorityIndices.push(i);
    }
    for (let f = 16; f <= TOTAL_FRAMES; f += 8) {
      const idx = f - 1;
      if (!priorityIndices.includes(idx)) priorityIndices.push(idx);
    }
    // Ensure the final frame is in the priority batch
    const lastIdx = TOTAL_FRAMES - 1;
    if (!priorityIndices.includes(lastIdx)) {
      priorityIndices.push(lastIdx);
    }

    const totalPriority = priorityIndices.length;
    let loadedPriority = 0;

    function updatePriorityProgress() {
      const percent = Math.min(100, Math.round((loadedPriority / totalPriority) * 100));
      if (loaderFill) loaderFill.style.width = `${percent}%`;
      if (loaderPercent) loaderPercent.textContent = `${percent}%`;

      if (loadedPriority >= totalPriority && !state.isLoaded) {
        completeLoading();
      }
    }

    // Load priority frames with concurrency pool
    let nextPriorityPos = 0;
    const priorityConcurrency = 8;

    function loadNextPriority() {
      if (nextPriorityPos >= priorityIndices.length) return;
      const idx = priorityIndices[nextPriorityPos++];
      loadSingleFrame(idx, () => {
        loadedPriority++;
        updatePriorityProgress();
        loadNextPriority();
      });
    }

    for (let i = 0; i < priorityConcurrency; i++) {
      loadNextPriority();
    }

    // Safety timeout: unlock after maximum 4 seconds regardless of network speed
    setTimeout(() => {
      if (!state.isLoaded) {
        completeLoading();
      }
    }, 4000);
  }

  function completeLoading() {
    if (state.isLoaded) return;
    state.isLoaded = true;

    if (loaderStatus) loaderStatus.textContent = '3D HOLOGRAPHIC READY';
    if (loaderFill) loaderFill.style.width = '100%';
    if (loaderPercent) loaderPercent.textContent = '100%';

    // Smooth GSAP exit animation for preloader
    gsap.to(loader, {
      opacity: 0,
      duration: 0.65,
      ease: 'power2.inOut',
      onComplete: () => {
        if (loader) loader.classList.add('loaded');
        initScrollAnimations();
        initStage1Entrance();
        // Start Pass 2: Background Streaming with Concurrency Pool of 6
        startPass2BackgroundStreaming();
      },
    });
  }

  /**
   * Pass 2: Background Streaming with Concurrency Pool of 6 parallel requests
   */
  function startPass2BackgroundStreaming() {
    const remainingIndices = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!state.frames[i] || !state.frames[i].complete) {
        remainingIndices.push(i);
      }
    }

    if (remainingIndices.length === 0) return;

    const pass2Concurrency = 6;
    let nextRemainingPos = 0;

    function loadNextRemaining() {
      if (nextRemainingPos >= remainingIndices.length) return;
      const idx = remainingIndices[nextRemainingPos++];
      loadSingleFrame(idx, () => {
        loadNextRemaining();
      });
    }

    for (let i = 0; i < pass2Concurrency; i++) {
      loadNextRemaining();
    }
  }

  // ==========================================================================
  // 4. GSAP SCROLL-TRIGGER CHOREOGRAPHY (Left-Aligned 3 Stages)
  // ==========================================================================
  function initStage1Entrance() {
    // Preserve vertical centering with GSAP's yPercent
    gsap.set('.stage-overlay', { yPercent: -50 });

    // Initial entrance animation for Stage 1 elements
    const tl = gsap.timeline();
    tl.from('.stage-1 .stage-badge', { opacity: 0, y: -20, duration: 0.6, ease: 'power3.out' })
      .from('.stage-1 .hero-headline', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .from('.stage-1 .hero-subheadline', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.5')
      .from('.stage-1 .metrics-row', { opacity: 0, y: 15, duration: 0.6, ease: 'power3.out' }, '-=0.4')
      .from('.stage-1 .hero-cta-group', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.4')
      .from('.stage-1 .scroll-scrub-indicator', { opacity: 0, duration: 0.8 }, '-=0.2');
  }

  function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Initial frame render
    renderFrameByIndex(0);

    // Ensure all stage overlays have yPercent: -50 so GSAP preserves vertical centering
    gsap.set('.stage-overlay', { yPercent: -50 });

    // Frame interpolation object
    const frameObj = { frame: 0 };

    // Master Scroll-Scrubbing Timeline pinned over 400vh
    const masterTl = gsap.timeline({
      scrollTrigger: {
        id: 'heroPin',
        trigger: SCROLL_CONTAINER_SELECTOR,
        start: 'top top',
        end: '+=400%', // 400vh scrub distance handled 100% by ScrollTrigger
        pin: true,
        pinSpacing: true, // Guarantees proper spacing with zero black void
        scrub: 0.5, // Buttery smooth GSAP inertia
        anticipatePin: 1,
        onUpdate: (self) => {
          // Nav styling update
          if (self.progress > 0.05) {
            navContainer.classList.add('scrolled');
          } else {
            navContainer.classList.remove('scrolled');
          }

          // Sync active nav link during hero scroll stages
          if (self.progress >= 0.70) {
            setActiveNavLink('#programs');
          } else if (self.progress >= 0.33) {
            setActiveNavLink('#methodology');
          } else {
            setActiveNavLink('#hero-pin-target');
          }
        },
      },
    });

    // 1. Scrub Canvas Frames from 0 to TOTAL_FRAMES - 1
    masterTl.to(
      frameObj,
      {
        frame: TOTAL_FRAMES - 1,
        ease: 'none',
        duration: 1.0, // Normalized master timeline duration
        onUpdate: () => {
          renderFrameByIndex(frameObj.frame);
        },
      },
      0
    );

    // 2. STAGE 1: The Hook (0% - 30% scroll)
    // Exits smoothly between 24% and 32%
    masterTl.to(
      '#stage-1',
      {
        opacity: 0,
        y: -35,
        filter: 'blur(8px)',
        pointerEvents: 'none',
        ease: 'power2.inOut',
        duration: 0.08,
      },
      0.24
    );

    // 3. STAGE 2: Hologram Expands & 3 Feature Cards (35% - 65% scroll)
    // Enters between 33% and 41%
    masterTl.fromTo(
      '#stage-2',
      {
        opacity: 0,
        y: 40,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        pointerEvents: 'auto',
        ease: 'power2.out',
        duration: 0.08,
      },
      0.33
    );

    // Stagger feature cards in Stage 2
    masterTl.fromTo(
      '#stage-2 .glass-feature-card',
      {
        opacity: 0,
        x: -25,
      },
      {
        opacity: 1,
        x: 0,
        stagger: 0.015,
        ease: 'power2.out',
        duration: 0.04,
      },
      0.34
    );

    // Stage 2 Exits between 62% and 68%
    masterTl.to(
      '#stage-2',
      {
        opacity: 0,
        y: -35,
        filter: 'blur(8px)',
        pointerEvents: 'none',
        ease: 'power2.in',
        duration: 0.06,
      },
      0.62
    );

    // 4. STAGE 3: Programs & High Conversion Showcase (70% - 100% scroll)
    // Enters between 69% and 75% and REMAINS FULLY VISIBLE (opacity: 1) until 100%
    masterTl.fromTo(
      '#stage-3',
      {
        opacity: 0,
        y: 35,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        pointerEvents: 'auto',
        ease: 'power2.out',
        duration: 0.06,
      },
      0.69
    );

    // Stagger program cards in Stage 3
    masterTl.fromTo(
      '#stage-3 .program-card-compact',
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        stagger: 0.02,
        ease: 'power2.out',
        duration: 0.05,
      },
      0.71
    );

    // Animate Stage 3 bottom location bar
    masterTl.fromTo(
      '#stage-3 .stage3-location-bar',
      {
        opacity: 0,
        y: 15,
      },
      {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        duration: 0.05,
      },
      0.74
    );

    // Wire up navigation links with smooth scrolling (including #programs target)
    initNavLinks(masterTl);

    // Post-Hero Section Scroll Animations
    initPostHeroAnimations();
  }

  function setActiveNavLink(href) {
    document.querySelectorAll('.nav-links .nav-link').forEach((link) => {
      if (link.getAttribute('href') === href) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Wire navigation links to smooth-scroll smoothly to sections or Stage 3 (#programs)
   */
  function initNavLinks(masterTl) {
    const navAnchors = document.querySelectorAll('a[href^="#"]');

    navAnchors.forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        // BUG 3 FIX: Wire the Navbar #programs link to scroll to Stage 3 (85% of hero scroll distance)
        if (href === '#programs') {
          e.preventDefault();
          const st = masterTl ? masterTl.scrollTrigger : ScrollTrigger.getById('heroPin');
          if (st) {
            const targetScroll = st.start + (st.end - st.start) * 0.85;
            if (lenis) {
              lenis.scrollTo(targetScroll, { duration: 1.4 });
            } else {
              window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
          }
          return;
        }

        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          if (lenis) {
            lenis.scrollTo(targetEl, { offset: -60, duration: 1.2 });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  function initPostHeroAnimations() {
    // Bento Cards Scroll Stagger
    gsap.from('.bento-card', {
      scrollTrigger: {
        trigger: '#methodology',
        start: 'top 75%',
      },
      opacity: 0,
      y: 40,
      duration: 0.75,
      stagger: 0.15,
      ease: 'power3.out',
    });

    // Topper Cards Stagger
    gsap.from('.topper-card', {
      scrollTrigger: {
        trigger: '#results',
        start: 'top 75%',
      },
      opacity: 0,
      scale: 0.95,
      y: 30,
      duration: 0.75,
      stagger: 0.15,
      ease: 'back.out(1.4)',
    });

    // Mentor Profile Reveal
    gsap.from('.educator-bio-side', {
      scrollTrigger: {
        trigger: '#educator',
        start: 'top 75%',
      },
      opacity: 0,
      x: -40,
      duration: 0.8,
      ease: 'power3.out',
    });

    gsap.from('.mentor-featured-box', {
      scrollTrigger: {
        trigger: '#educator',
        start: 'top 75%',
      },
      opacity: 0,
      x: 40,
      duration: 0.8,
      ease: 'power3.out',
    });
  }

  // ==========================================================================
  // 5. 3D MOUSE-PARALLAX TILT & SPECULAR GLARE EFFECT
  // ==========================================================================
  function initTiltEffect() {
    const tiltCards = document.querySelectorAll('.tilt-card');

    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Subtle 3D tilt angle (max 7 degrees)
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
      });
    });
  }

  // ==========================================================================
  // 6. FAQ ACCORDION INTERACTIVITY
  // ==========================================================================
  window.toggleFaq = function (btn) {
    const item = btn.closest('.faq-item');
    if (!item) return;

    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach((el) => el.classList.remove('active'));

    if (!isActive) {
      item.classList.add('active');
    }
  };

  // ==========================================================================
  // 7. DEMO BOOKING MODAL & LEAD CAPTURE
  // ==========================================================================
  window.openDemoModal = function (source = 'Direct') {
    if (!demoModal) return;
    demoModal.classList.add('open');
    demoModal.setAttribute('aria-hidden', 'false');

    // Reset success state if previously opened
    const successBox = document.getElementById('modal-success-state');
    const formBox = document.getElementById('modal-booking-form');
    if (successBox) successBox.classList.add('d-none');
    if (formBox) {
      formBox.classList.remove('d-none');
      formBox.reset();
    }
  };

  window.closeDemoModal = function () {
    if (!demoModal) return;
    demoModal.classList.remove('open');
    demoModal.setAttribute('aria-hidden', 'true');
  };

  // Close modal when clicking on backdrop
  if (demoModal) {
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) {
        closeDemoModal();
      }
    });
  }

  // Handle Modal Form Submission
  window.handleModalSubmit = function (e) {
    e.preventDefault();
    const name = document.getElementById('modal-name')?.value;
    const phone = document.getElementById('modal-phone')?.value;
    const cls = document.getElementById('modal-class')?.value;

    const formBox = document.getElementById('modal-booking-form');
    const successBox = document.getElementById('modal-success-state');

    if (formBox) formBox.classList.add('d-none');
    if (successBox) successBox.classList.remove('d-none');

    // Also trigger direct WhatsApp connection option
    setTimeout(() => {
      const msg = encodeURIComponent(
        `Hello Yash Sir, I have registered for a Free Demo at Bhavishya SMS.\nName: ${name}\nClass: ${cls}\nPhone: ${phone}`
      );
      // Optional direct redirect can be opened
    }, 1500);
  };

  // Handle Quick Inquiry Form Submission
  window.handleInquirySubmit = function (e) {
    e.preventDefault();
    const name = document.getElementById('student-name')?.value;
    const phone = document.getElementById('student-phone')?.value;
    const cls = document.getElementById('student-class')?.value;
    const mode = document.getElementById('learning-mode')?.value;

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Reserving Seat...</span>`;
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Seat Reserved!</span>`;
        btn.style.background = '#22C55E';

        const waMsg = encodeURIComponent(
          `Hello Bhavishya SMS Team, I have booked a Demo Class for ${name} (${cls}) in ${mode}. Phone: ${phone}.`
        );
        window.open(`https://wa.me/919425984501?text=${waMsg}`, '_blank');
      }, 900);
    }
  };

  // ==========================================================================
  // 8. UTILITIES & INITIALIZATION
  // ==========================================================================
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    initPreloader();
    initTiltEffect();
  });
})();
