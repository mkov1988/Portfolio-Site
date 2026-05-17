/**
 * Onboarding Wizard — 2-step guided modal for the House Calculator
 *
 * Collects Home Price and Total Available Cash from first-time users,
 * then feeds the values into the existing dashboard and triggers a
 * visual "handoff" highlight on the sidebar inputs.
 *
 * No React dependency — pure vanilla JS to match the rest of the codebase.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // GUARD — only run on the mortgage calculator page
  // ═══════════════════════════════════════════════
  if (!document.getElementById('mortgage-calculator')) return;

  // ═══════════════════════════════════════════════
  // FIRST-VISIT CHECK — show wizard only on first ever visit
  // ═══════════════════════════════════════════════
  const WIZARD_KEY = 'hc_wizard_seen';
  try {
    if (localStorage.getItem(WIZARD_KEY) === 'true') return;
  } catch (e) { /* localStorage unavailable — show the wizard */ }

  // ═══════════════════════════════════════════════
  // SHARED FORMATTING UTILITY
  // ═══════════════════════════════════════════════
  /**
   * Format a raw numeric string with thousand separators.
   * Returns the formatted string WITHOUT the dollar sign (the prefix is separate in the UI).
   * Handles partial input gracefully (empty, leading zeros, etc.)
   */
  function formatWithCommas(numStr) {
    // Strip everything except digits
    const digits = numStr.replace(/\D/g, '');
    if (!digits) return '';
    // Remove leading zeros
    const cleaned = digits.replace(/^0+/, '') || '0';
    // Add commas
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Parse a formatted string back to a clean integer.
   */
  function parseClean(formatted) {
    const digits = String(formatted).replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
  }

  // ═══════════════════════════════════════════════
  // BUILD THE DOM
  // ═══════════════════════════════════════════════
  const overlay = document.createElement('div');
  overlay.className = 'wizard-overlay';
  overlay.id = 'onboardingWizard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'House Calculator Onboarding Wizard');

  overlay.innerHTML = `
    <div class="wizard-modal">
      <button class="wizard-close" id="wizardClose" aria-label="Close wizard" type="button">✕</button>

      <div class="wizard-steps-track" id="wizardTrack">

        <!-- STEP 1 -->
        <div class="wizard-step active" id="wizardStep1" data-step="1">
          <div class="wizard-step-label">Step 1 of 2</div>
          <h2 class="wizard-heading">Let's run the numbers.<br>How much is the home you want to buy?</h2>
          <div class="wizard-input-wrap">
            <span class="wizard-currency-prefix">$</span>
            <input
              class="wizard-input"
              id="wizardHomePrice"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="750,000"
              aria-label="Home price"
            >
          </div>
          <div class="wizard-actions">
            <div></div>
            <button class="wizard-btn-primary" id="wizardNext" type="button">
              <span>Next →</span>
            </button>
          </div>
        </div>

        <!-- STEP 2 -->
        <div class="wizard-step" id="wizardStep2" data-step="2">
          <div class="wizard-step-label">Step 2 of 2</div>
          <h2 class="wizard-heading">Got it. And how much total cash do you have available right now?</h2>
          <div class="wizard-input-wrap">
            <span class="wizard-currency-prefix">$</span>
            <input
              class="wizard-input"
              id="wizardTotalCash"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="550,000"
              aria-label="Total available cash"
            >
          </div>
          <div class="wizard-actions">
            <button class="wizard-btn-back" id="wizardBack" type="button">← Back</button>
            <button class="wizard-btn-primary" id="wizardSubmit" type="button">
              <span>Show My Options ✨</span>
            </button>
          </div>
        </div>

      </div>

      <!-- PROGRESS DOTS -->
      <div class="wizard-progress" id="wizardProgress">
        <div class="wizard-dot active" id="wizardDot1"></div>
        <div class="wizard-dot" id="wizardDot2"></div>
        <span class="wizard-progress-text" id="wizardProgressText">Step 1 of 2</span>
      </div>

      <!-- STAGING TRAY — collected values live here -->
      <div class="wizard-staging" id="wizardStaging"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // ═══════════════════════════════════════════════
  // ELEMENT REFS
  // ═══════════════════════════════════════════════
  const modal         = overlay.querySelector('.wizard-modal');
  const track         = document.getElementById('wizardTrack');
  const step1         = document.getElementById('wizardStep1');
  const step2         = document.getElementById('wizardStep2');
  const inputHome     = document.getElementById('wizardHomePrice');
  const inputCash     = document.getElementById('wizardTotalCash');
  const btnNext       = document.getElementById('wizardNext');
  const btnBack       = document.getElementById('wizardBack');
  const btnSubmit     = document.getElementById('wizardSubmit');
  const btnClose      = document.getElementById('wizardClose');
  const dot1          = document.getElementById('wizardDot1');
  const dot2          = document.getElementById('wizardDot2');
  const progressText  = document.getElementById('wizardProgressText');
  const stagingTray   = document.getElementById('wizardStaging');

  let currentStep = 1;
  let phantomHome = null;  // persisted across steps
  let phantomCash = null;

  // ═══════════════════════════════════════════════
  // AUTO-FORMAT INPUTS ON TYPING
  // ═══════════════════════════════════════════════
  function bindAutoFormat(input) {
    input.addEventListener('input', function () {
      const cursorPos = this.selectionStart;
      const oldLen = this.value.length;
      const oldVal = this.value;

      // Count digits before cursor to preserve cursor position
      const digitsBefore = oldVal.slice(0, cursorPos).replace(/\D/g, '').length;

      // Format
      const formatted = formatWithCommas(this.value);
      this.value = formatted;

      // Restore cursor: find position where digitsBefore digits have passed
      let newPos = 0;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        if (digitCount === digitsBefore) {
          newPos = i + 1;
          break;
        }
      }
      if (digitCount < digitsBefore) newPos = formatted.length;
      this.setSelectionRange(newPos, newPos);
    });

    // Handle paste
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      const digits = paste.replace(/\D/g, '');
      this.value = formatWithCommas(digits);
    });
  }

  bindAutoFormat(inputHome);
  bindAutoFormat(inputCash);

  // ═══════════════════════════════════════════════
  // STEP NAVIGATION
  // ═══════════════════════════════════════════════
  function setTrackHeight() {
    const activeStep = currentStep === 1 ? step1 : step2;
    track.style.height = activeStep.scrollHeight + 'px';
  }

  function goToStep(step) {
    if (step === currentStep) return;

    const leaving = currentStep === 1 ? step1 : step2;
    const entering = step === 1 ? step1 : step2;

    // ── Stage / un-stage phantoms on step change ──
    if (step === 2) {
      // Moving forward: stage the Home Price phantom
      stagePhantomHome();
    } else {
      // Moving backward: remove the Home Price phantom so user can re-edit
      unstagePhantomHome();
    }

    // Direction
    if (step > currentStep) {
      leaving.classList.remove('active');
      leaving.classList.add('exit-left');
      entering.style.transform = 'translateX(60px)';
    } else {
      leaving.classList.remove('active');
      leaving.style.transform = 'translateX(60px)';
      leaving.style.opacity = '0';
      entering.classList.remove('exit-left');
      entering.style.transform = 'translateX(-60px)';
    }

    // Force reflow
    void entering.offsetWidth;

    // Activate
    entering.classList.add('active');
    entering.style.transform = '';
    entering.style.opacity = '';
    leaving.style.transform = '';

    currentStep = step;

    // Update dots
    dot1.classList.toggle('active', step === 1);
    dot2.classList.toggle('active', step === 2);
    progressText.textContent = `Step ${step} of 2`;

    // Update height
    requestAnimationFrame(setTrackHeight);

    // Focus the input of the new step
    setTimeout(() => {
      (step === 1 ? inputHome : inputCash).focus();
    }, 350);
  }

  // ═══════════════════════════════════════════════
  // PHANTOM STAGING — CONTINUOUS VISUAL HANDOFF
  // ═══════════════════════════════════════════════

  /**
   * Create a phantom at the wizard input's exact position, then FLIP-animate
   * it into the staging tray. The value never disappears from the screen.
   */
  function stageFromInput(inputEl, label) {
    const val = '$' + (inputEl.value || '750,000');
    const inputWrap = inputEl.closest('.wizard-input-wrap');
    const inputRect = inputWrap.getBoundingClientRect();

    // Build the phantom card
    const phantom = buildPhantom(label, val);

    // Place it fixed at the wizard input's exact viewport position
    phantom.style.position = 'fixed';
    phantom.style.left = inputRect.left + 'px';
    phantom.style.top = inputRect.top + 'px';
    phantom.style.width = inputRect.width + 'px';
    phantom.style.zIndex = '10001';
    phantom.style.opacity = '1';
    phantom.style.transform = 'none';
    phantom.classList.add('wizard-phantom--visible');
    document.body.appendChild(phantom);

    // Measure where it WILL go in the staging tray by adding a hidden measurer
    const measurer = buildPhantom(label, val);
    measurer.style.visibility = 'hidden';
    measurer.classList.add('wizard-phantom--visible');
    stagingTray.appendChild(measurer);

    // Force layout so the tray expands and we can measure
    void measurer.offsetWidth;
    const targetRect = measurer.getBoundingClientRect();
    measurer.remove();

    // Force reflow on phantom so the initial fixed position is registered
    void phantom.offsetWidth;

    // Animate from input position → staging tray position
    phantom.style.transition =
      'left 450ms cubic-bezier(0.22, 1, 0.36, 1), ' +
      'top 450ms cubic-bezier(0.22, 1, 0.36, 1), ' +
      'width 450ms cubic-bezier(0.22, 1, 0.36, 1)';
    phantom.style.left = targetRect.left + 'px';
    phantom.style.top = targetRect.top + 'px';
    phantom.style.width = targetRect.width + 'px';

    // After animation completes, reparent into the tray as a flow element
    setTimeout(() => {
      phantom.style.transition = 'none';
      phantom.style.position = '';
      phantom.style.left = '';
      phantom.style.top = '';
      phantom.style.width = '';
      phantom.style.zIndex = '';
      phantom.style.margin = '';
      stagingTray.appendChild(phantom);
      void phantom.offsetWidth;
    }, 460);

    return phantom;
  }

  function stagePhantomHome() {
    if (phantomHome) return;
    phantomHome = stageFromInput(inputHome, 'Home Price');
  }

  function unstagePhantomHome() {
    if (!phantomHome) return;
    phantomHome.classList.remove('wizard-phantom--visible');
    phantomHome.style.opacity = '0';
    setTimeout(() => {
      if (phantomHome) { phantomHome.remove(); phantomHome = null; }
    }, 250);
  }

  function stagePhantomCash() {
    phantomCash = stageFromInput(inputCash, 'Total Available Cash');
  }

  // ═══════════════════════════════════════════════
  // DISMISS WIZARD
  // ═══════════════════════════════════════════════
  function dismissWizard(applyValues) {
    if (!applyValues) {
      overlay.classList.add('dismissing');
      try { localStorage.setItem(WIZARD_KEY, 'true'); } catch (e) {}
      setTimeout(() => overlay.remove(), 500);
      return;
    }

    applyToDashboard();
    try { localStorage.setItem(WIZARD_KEY, 'true'); } catch (e) {}

    const targetHomeGroup = document.getElementById('homePrice')?.closest('.input-group');
    const targetCashGroup = document.getElementById('totalCash')?.closest('.input-group');

    // ── Stage the Total Cash phantom (Home Price is already staged) ──
    stagePhantomCash();

    // ── Wait for cash phantom to settle in the staging tray ──
    setTimeout(() => {
      // Capture phantom positions while they're still visible
      const homeRect = phantomHome ? phantomHome.getBoundingClientRect() : null;
      const cashRect = phantomCash ? phantomCash.getBoundingClientRect() : null;

      // REPARENT to body-level BEFORE modal fades
      if (phantomHome) pinToBody(phantomHome, homeRect);
      if (phantomCash) pinToBody(phantomCash, cashRect);

      // ── Spotlight dim ──────────────────────────────────────────────
      // A transparent "hole" sized to the two target input groups that
      // casts a huge box-shadow darkening everything else. Box-shadow is
      // immune to the stacking-context traps that defeat a plain overlay
      // (.main-wrap has will-change:transform from Locomotive, which
      // creates a stacking context the inputs cannot z-index out of).
      // The hole simply reveals whatever sits beneath it — the two real
      // input groups — at full brightness.
      const pageDim = document.createElement('div');
      pageDim.className = 'wizard-page-dim';
      const spotRects = [targetHomeGroup, targetCashGroup]
        .filter(Boolean)
        .map(function (g) { return g.getBoundingClientRect(); });
      if (spotRects.length) {
        const pad = 10;
        const sl = Math.min.apply(null, spotRects.map(function (r) { return r.left; })) - pad;
        const st = Math.min.apply(null, spotRects.map(function (r) { return r.top; })) - pad;
        const sr = Math.max.apply(null, spotRects.map(function (r) { return r.right; })) + pad;
        const sb = Math.max.apply(null, spotRects.map(function (r) { return r.bottom; })) + pad;
        pageDim.style.left = sl + 'px';
        pageDim.style.top = st + 'px';
        pageDim.style.width = (sr - sl) + 'px';
        pageDim.style.height = (sb - st) + 'px';
      }
      document.body.appendChild(pageDim);

      // Fade the modal
      overlay.classList.add('dismissing');

      // Activate the dim
      requestAnimationFrame(() => {
        pageDim.classList.add('active');
      });

      // After modal fades, deploy phantoms
      setTimeout(() => {
        overlay.remove();

        deployToSidebar(phantomHome, targetHomeGroup);
        deployToSidebar(phantomCash, targetCashGroup);

        // Phantoms land at ~850ms — hold the dim for ~1s after that
        // so users can clearly see their two values in their new home.
        setTimeout(() => {
          pageDim.classList.remove('active');
          pageDim.classList.add('lifting');
        }, 1850);

        // Cleanup after the dim has fully lifted
        setTimeout(() => {
          if (phantomHome) phantomHome.remove();
          if (phantomCash) phantomCash.remove();
          pageDim.remove();
          applyLandingGlow(targetHomeGroup);
          applyLandingGlow(targetCashGroup);
        }, 2750);
      }, 300);
    }, 500);
  }

  // ═══════════════════════════════════════════════
  // BUILD A PHANTOM CARD
  // ═══════════════════════════════════════════════
  function buildPhantom(label, value) {
    const card = document.createElement('div');
    card.className = 'wizard-phantom';
    card.innerHTML = `
      <div class="wizard-phantom__label">${label}</div>
      <div class="wizard-phantom__value">${value}</div>
    `;
    return card;
  }

  /**
   * Pin a phantom at its current viewport position as a fixed body-level element.
   * Visually nothing changes — it just escapes the modal's DOM tree.
   */
  function pinToBody(phantom, rect) {
    if (!phantom || !rect) return;
    phantom.style.transition = 'none';
    phantom.style.position = 'fixed';
    phantom.style.left = rect.left + 'px';
    phantom.style.top = rect.top + 'px';
    phantom.style.width = rect.width + 'px';
    phantom.style.margin = '0';
    phantom.style.opacity = '1';
    phantom.style.transform = 'none';
    phantom.style.zIndex = '10001';
    document.body.appendChild(phantom);
    void phantom.offsetWidth;
  }

  // ═══════════════════════════════════════════════
  // DEPLOY PHANTOM → SIDEBAR TARGET
  // Slow deceleration + gradual fade
  // ═══════════════════════════════════════════════
  function deployToSidebar(phantom, targetGroup) {
    if (!phantom || !targetGroup) { if (phantom) phantom.remove(); return; }

    const fromRect = phantom.getBoundingClientRect();
    const toRect = targetGroup.getBoundingClientRect();

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;
    const sx = toRect.width / fromRect.width;
    const sy = toRect.height / fromRect.height;

    phantom.style.transformOrigin = 'top left';
    void phantom.offsetWidth;

    // Heavy deceleration — fast start, very slow finish
    phantom.style.transition =
      'transform 850ms cubic-bezier(0.05, 0.7, 0.1, 1), ' +
      'opacity 700ms ease 200ms';
    phantom.style.transform =
      `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    phantom.style.opacity = '0';
  }

  // ═══════════════════════════════════════════════
  // APPLY VALUES TO DASHBOARD
  // ═══════════════════════════════════════════════
  function applyToDashboard() {
    const homePrice = parseClean(inputHome.value) || 750000;
    const totalCash = parseClean(inputCash.value) || 550000;

    const homePriceEl = document.getElementById('homePrice');
    const homePriceSlider = document.getElementById('homePriceSlider');
    const totalCashEl = document.getElementById('totalCash');
    const totalCashSlider = document.getElementById('totalCashSlider');

    // Adjust slider min / max / step so any value fits without clamping.
    // The default ranges are min=100000 max=3000000 step=10000 for homePrice
    // and min=0 max=3000000 step=10000 for totalCash.  Values like 12 or
    // 123446 would be clamped or snapped otherwise.
    if (homePriceSlider) {
      homePriceSlider.step = 1;                                     // allow any integer
      homePriceSlider.min = Math.min(homePrice, parseFloat(homePriceSlider.min) || 0);
    }
    if (totalCashSlider) {
      totalCashSlider.step = 1;
      totalCashSlider.min = Math.min(totalCash, parseFloat(totalCashSlider.min) || 0);
      // Removed max expansion here too just in case, though user didn't explicitly ask to cap totalCash,
      // it's better to stick to the HTML defined max unless we need to expand it. Actually we'll leave totalCash as is
      totalCashSlider.max = Math.max(totalCash, parseFloat(totalCashSlider.max) || 3000000);
    }

    // Set values on number inputs
    if (homePriceEl) homePriceEl.value = homePrice;
    if (totalCashEl) totalCashEl.value = totalCash;

    // Dispatch input on NUMBER inputs only — the calculator's own listener
    // syncs slider.value = numEl.value, runs enforceConstraints, and calls
    // recalculate().  Do NOT dispatch on sliders because that listener does
    // numEl.value = sliderEl.value, which would overwrite with clamped values.
    if (homePriceEl) homePriceEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (totalCashEl) totalCashEl.dispatchEvent(new Event('input', { bubbles: true }));

    // Manually update every slider fill (the CSS --slider-fill custom property)
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value) || 0;
      const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--slider-fill', pct + '%');
    });
  }

  // ═══════════════════════════════════════════════
  // LANDING GLOW
  // ═══════════════════════════════════════════════
  function applyLandingGlow(group) {
    if (!group) return;
    group.classList.add('wizard-highlight-group');
    setTimeout(() => group.classList.remove('wizard-highlight-group'), 1400);
  }

  // ═══════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════

  // Next button
  btnNext.addEventListener('click', () => goToStep(2));

  // Back button
  btnBack.addEventListener('click', () => goToStep(1));

  // Submit button
  btnSubmit.addEventListener('click', () => dismissWizard(true));

  // Close button
  btnClose.addEventListener('click', () => dismissWizard(false));

  // Backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissWizard(false);
  });

  // Keyboard: Enter to advance, Escape to close
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissWizard(false);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep === 1) {
        goToStep(2);
      } else {
        dismissWizard(true);
      }
    }
  });

  // Trap focus inside the modal
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusable = modal.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ═══════════════════════════════════════════════
  // INIT — show the wizard after a brief delay
  // ═══════════════════════════════════════════════
  function showWizard() {
    // Set initial track height
    requestAnimationFrame(() => {
      setTrackHeight();

      // Trigger entrance animation
      requestAnimationFrame(() => {
        overlay.classList.add('visible');

        // Auto-focus the first input
        setTimeout(() => inputHome.focus(), 500);
      });
    });
  }

  // Wait for the page load animation to finish, then show the wizard
  // The portfolio site has a loading screen that takes ~2-3s
  if (document.readyState === 'complete') {
    setTimeout(showWizard, 800);
  } else {
    window.addEventListener('load', () => setTimeout(showWizard, 800));
  }

})();
