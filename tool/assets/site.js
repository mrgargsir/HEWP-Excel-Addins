// =========================================================
// MRGARGSIR TOOLS — Shared site behaviour
// =========================================================

(function () {
  // ---- Mobile nav toggle ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      var open = nav.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); });
    });
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---- Back to top ----
  var backBtn = document.querySelector('.back-to-top');
  if (backBtn) {
    window.addEventListener('scroll', function () {
      backBtn.classList.toggle('is-visible', window.scrollY > 500);
    });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Header shadow on scroll ----
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.style.boxShadow = window.scrollY > 8 ? '0 8px 24px -18px rgba(0,0,0,0.8)' : 'none';
    });
  }

  // ---- Referral code capture (?ref=CODE) ----
  try {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) {
      window._autoRefCode = ref;
      sessionStorage.setItem('mrg_ref_code', ref);
    } else {
      window._autoRefCode = sessionStorage.getItem('mrg_ref_code') || '';
    }
  } catch (e) { /* sessionStorage unavailable — ignore */ }
})();

// =========================================================
// Purchase / QR modal logic (used on purchase.html)
// =========================================================
(function () {
  var FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSccpAdkty6BM2pfGCueWiNVaK6TmhUXzhReFiQB8GsbZ_cDmw/formResponse';
  var ENTRY_NAME = 'entry.420184449';
  var ENTRY_MOBILE = 'entry.92219779';
  var ENTRY_EMAIL = 'entry.241056737';
  var ENTRY_DISTRICT = 'entry.885222640';
  var ENTRY_PLAN = 'entry.911084064';
  var ENTRY_REF = 'entry.625804941';
  var ENTRY_UTR = 'entry.1377540696';
  var ENTRY_DEVICE_ID = 'entry.353922635';

  window.openQR = function (amount, plan) {
    var qrModal = document.getElementById('qrModal');
    if (!qrModal) return;
    document.getElementById('qrPlanLabel').textContent = plan + ' — ₹' + Number(amount).toLocaleString('en-IN');
    document.getElementById('qrImage').src = 'assets/qr/' + amount + '.PNG';
    qrModal.dataset.plan = plan;
    qrModal.dataset.amount = amount;
    ['buyerName', 'buyerMobile', 'buyerEmail', 'buyerDistrict', 'buyerUTR', 'buyerDeviceId'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var refInput = document.getElementById('buyerRef');
    if (refInput) {
      refInput.value = window._autoRefCode || '';
      refInput.style.borderColor = window._autoRefCode ? 'rgba(16,185,129,0.6)' : '';
    }
    var isTrial = plan.toLowerCase().indexOf('trial') !== -1;
    document.getElementById('deviceIdRequired').style.display = isTrial ? 'inline' : 'none';
    document.getElementById('deviceIdOptionalTag').style.display = isTrial ? 'none' : 'inline';
    document.getElementById('qrFormError').style.display = 'none';

    goToStep1Silent();
    qrModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  function goToStep1Silent() {
    document.getElementById('qrStep1').style.display = 'block';
    document.getElementById('qrStep2').style.display = 'none';
    document.getElementById('stepProgressLine').style.width = '0%';
    document.getElementById('stepCircle2').style.background = 'rgba(255,255,255,0.1)';
    document.getElementById('stepCircle2').style.color = 'var(--muted)';
  }
  window.goToStep2 = function () {
    document.getElementById('qrStep1').style.display = 'none';
    document.getElementById('qrStep2').style.display = 'block';
    document.getElementById('stepProgressLine').style.width = '100%';
    document.getElementById('stepCircle2').style.background = 'var(--cyan)';
    document.getElementById('stepCircle2').style.color = '#06121c';
  };
  window.backToStep1 = goToStep1Silent;

  window.closeQR = function () {
    var qrModal = document.getElementById('qrModal');
    if (qrModal) qrModal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  function clearPurchaseForm() {
    ['buyerName', 'buyerMobile', 'buyerEmail', 'buyerDistrict', 'buyerUTR', 'buyerDeviceId', 'buyerRef'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('qrFormError').style.display = 'none';
  }

  window.closeConfirm = function () {
    document.getElementById('confirmModal').classList.remove('is-open');
    var qrModal = document.getElementById('qrModal');
    if (qrModal) qrModal.classList.remove('is-open');
    document.body.style.overflow = '';
    clearPurchaseForm();
  };

  var pendingWhatsAppMsg = '';

  window.submitOrder = async function () {
    var name = document.getElementById('buyerName').value.trim();
    var mobile = document.getElementById('buyerMobile').value.trim();
    var email = document.getElementById('buyerEmail').value.trim();
    var district = document.getElementById('buyerDistrict').value.trim();
    var utr = document.getElementById('buyerUTR').value.trim();
    var ref = document.getElementById('buyerRef').value.trim() || 'N/A';
    var deviceId = document.getElementById('buyerDeviceId').value.trim();
    var qrModal = document.getElementById('qrModal');
    var plan = qrModal.dataset.plan;
    var amount = qrModal.dataset.amount;
    var errorEl = document.getElementById('qrFormError');
    var isTrial = plan.toLowerCase().indexOf('trial') !== -1;

    if (!name || !mobile || !email || !district || !utr) {
      errorEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fill all required fields before sending.';
      errorEl.style.display = 'block';
      return;
    }
    if (!/^\d{12}$/.test(utr)) {
      errorEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> UTR Number must be exactly 12 digits.';
      errorEl.style.display = 'block';
      return;
    }
    if (isTrial && !deviceId) {
      errorEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Device ID is required for Trial plan. Go to: Tool Settings → Change Key → Copy ID.';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';

    try {
      var params = new URLSearchParams();
      params.append(ENTRY_NAME, name);
      params.append(ENTRY_MOBILE, mobile);
      params.append(ENTRY_EMAIL, email);
      params.append(ENTRY_DISTRICT, district);
      params.append(ENTRY_PLAN, plan + ' — ₹' + Number(amount).toLocaleString('en-IN'));
      params.append(ENTRY_UTR, utr);
      params.append(ENTRY_REF, ref);
      if (deviceId) params.append(ENTRY_DEVICE_ID, deviceId);
      await fetch(FORM_ACTION, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
    } catch (e) { /* no-cors always throws — submission still goes through */ }

    pendingWhatsAppMsg =
      'Hi, I have completed payment for HEWP Tool license.\n\n🧾 *Purchase Details*\n- Plan       : ' + plan + ' (₹' + Number(amount).toLocaleString('en-IN') + ')\n- Name       : ' + name + '\n- Mobile     : ' + mobile + '\n- Email      : ' + email + '\n- District   : ' + district + '\n- UTR No.    : ' + utr + '\n- Ref Code   : ' + ref + (deviceId ? '\n- Device ID  : ' + deviceId : '');

    document.getElementById('confirmSummary').innerHTML =
      '<strong style="color:var(--cyan-h)">Plan:</strong> ' + plan + ' — ₹' + Number(amount).toLocaleString('en-IN') + '<br>' +
      '<strong style="color:var(--cyan-h)">Name:</strong> ' + name + '<br>' +
      '<strong style="color:var(--cyan-h)">Mobile:</strong> ' + mobile + '<br>' +
      '<strong style="color:var(--cyan-h)">Email:</strong> ' + email + '<br>' +
      '<strong style="color:var(--cyan-h)">District:</strong> ' + district + '<br>' +
      '<strong style="color:var(--cyan-h)">UTR No.:</strong> ' + utr + '<br>' +
      '<strong style="color:var(--cyan-h)">Ref Code:</strong> ' + ref +
      (deviceId ? '<br><strong style="color:var(--cyan-h)">Device ID:</strong> ' + deviceId : '');

    document.getElementById('confirmModal').classList.add('is-open');
  };

  window.sendWhatsAppFromConfirm = function () {
    if (pendingWhatsAppMsg) {
      window.open('https://wa.me/919728532828?text=' + encodeURIComponent(pendingWhatsAppMsg), '_blank');
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var qrModal = document.getElementById('qrModal');
    if (qrModal) {
      qrModal.addEventListener('click', function (e) {
        var confirmModal = document.getElementById('confirmModal');
        if (e.target === qrModal && (!confirmModal || !confirmModal.classList.contains('is-open'))) {
          window.closeQR();
        }
      });
    }

    // ---- Plan toggle (Regular / Premium) ----
    var toggleBtns = document.querySelectorAll('.plan-toggle button');
    if (toggleBtns.length) {
      toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var plan = btn.dataset.plan;
          toggleBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
          document.querySelectorAll('.plan-panel').forEach(function (p) {
            p.style.display = p.dataset.panel === plan ? 'flex' : 'none';
          });
        });
      });
    }

    // ---- Download buttons with fake progress + real link ----
    var primaryURL = 'https://github.com/mrgargsir/HEWP-Excel-Addins/releases/download/latest/OnlineInstaller.exe';
    document.querySelectorAll('[data-download]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.location.href = primaryURL;
      });
    });
  });
})();
