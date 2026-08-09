/**
 * Pad (≤1240) info panel: logo toggles `.is-info-open` on [data-home] / [data-detail].
 * Desktop: logo keeps its normal link behavior (no preventDefault).
 */

const PAD_MQ = '(max-width: 1240px)';

export function installInfoPanel() {
  let abort: AbortController | null = null;

  const bind = () => {
    abort?.abort();
    abort = new AbortController();
    const { signal } = abort;

    const root = document.querySelector<HTMLElement>('[data-home], [data-detail]');
    if (!root) return;

    const mq = window.matchMedia(PAD_MQ);
    const toggles = [...root.querySelectorAll<HTMLElement>('[data-info-toggle]')];

    const setOpen = (open: boolean) => {
      const onPad = mq.matches;
      const next = onPad && open;
      root.classList.toggle('is-info-open', next);
      toggles.forEach((el) => {
        el.setAttribute('aria-expanded', String(next));
        const label = next ? el.dataset.labelOpen : el.dataset.labelClosed;
        if (label) el.setAttribute('aria-label', label);
      });
    };

    setOpen(false);

    toggles.forEach((el) => {
      el.addEventListener(
        'click',
        (event) => {
          if (!mq.matches) return;
          event.preventDefault();
          setOpen(!root.classList.contains('is-info-open'));
        },
        { signal },
      );
    });

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') setOpen(false);
      },
      { signal },
    );

    mq.addEventListener('change', () => setOpen(false), { signal });
  };

  document.addEventListener('astro:page-load', bind);
  document.addEventListener('astro:after-swap', () => {
    document.querySelector('[data-home], [data-detail]')?.classList.remove('is-info-open');
  });
}
