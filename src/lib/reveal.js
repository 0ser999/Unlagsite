import { useEffect } from 'react';

// Blocks that fade and slide in the first time they scroll into view. Siblings matched by the
// same selector enter one after another. Classes are added by script only, so the content stays
// visible if this never runs.
const TARGETS = [
  '.section-head > *', '.page-header > *', '.rev-grid > div > h2', '.rev-lead', '.steps li', '.ledger', '.ledger-row',
  '.cat', '.tool-head', '.tool', '.plan', '.plans-note', '.cta-in > *', '.module', '.tool-card', '.unlock',
  '.risk-item', '.faq-list > *', '.compare-wrap', '.stat', '.reqs', '.download-grid > *', '.foot-in > *',
].join(',');

const STEP = 70;   // ms between siblings
const MAX = 6;     // longest stagger, in steps

// Numbers count up from 0 when they appear (only plain integers like "117" or "28").
function countUp(el) {
  const target = Number(el.textContent.trim());
  if (!Number.isInteger(target) || target <= 0 || target > 100000) return;
  const start = performance.now();
  const dur = 900;
  const tick = (now) => {
    const k = Math.min(1, (now - start) / dur);
    el.textContent = String(Math.round(target * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
  requestAnimationFrame(tick);
}

export function useReveal(key) {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('is-in');
        el.querySelectorAll('.cat-count, .module-count, .stat-figure').forEach(countUp);
        // Once in place, hand the element back to its normal hover transitions.
        setTimeout(() => el.classList.remove('rv', 'is-in'), parseInt(el.style.getPropertyValue('--rv-d'), 10) + 1300);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    const seen = new WeakSet();
    const scan = () => {
      document.querySelectorAll(TARGETS).forEach((el) => {
        // Already set up by this observer, or already revealed.
        if (seen.has(el) || (el.dataset.rv && !el.classList.contains('rv'))) return;
        seen.add(el);
        el.dataset.rv = '1';
        const sibs = [...el.parentElement.children].filter((c) => c.matches(TARGETS));
        el.style.setProperty('--rv-d', `${Math.min(sibs.indexOf(el), MAX) * STEP}ms`);
        el.classList.add('rv');
        io.observe(el);
      });
    };
    scan();
    // Pages that load data later (account, auth) add blocks after the first render.
    let t = 0;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 30); });
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t); };
  }, [key]);
}
