(() => {
  if (customElements.get('custom-reviews')) return;

  customElements.define('custom-reviews', class extends HTMLElement {
    connectedCallback() {
      const track = this.querySelector('.custom-reviews__track');
      const controls = this.querySelector('.custom-reviews__controls');
      if (!track || !controls || this.events) return;

      const cards = track.querySelectorAll('.custom-reviews__card');
      const [previous, next] = controls.querySelectorAll('button');
      this.events = new AbortController();
      const { signal } = this.events;

      const refresh = () => {
        const overflow = track.scrollWidth - track.clientWidth;
        const offset = Math.abs(track.scrollLeft);
        controls.hidden = overflow <= 1;
        previous.disabled = offset <= 1;
        next.disabled = offset >= overflow - 1;
      };

      controls.addEventListener('click', (event) => {
        const button = event.target.closest('[data-review-step]');
        if (!button) return;

        const rtl = getComputedStyle(track).direction === 'rtl';
        const distance = Math.abs(cards[1].offsetLeft - cards[0].offsetLeft);
        const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        track.scrollBy({
          left: Number(button.dataset.reviewStep) * distance * (rtl ? -1 : 1),
          behavior: reduceMotion ? 'instant' : 'smooth',
        });
      }, { signal });

      track.addEventListener('scroll', refresh, { passive: true, signal });
      this.observer = new ResizeObserver(refresh);
      this.observer.observe(track);
      refresh();
    }

    disconnectedCallback() {
      this.events?.abort();
      this.events = null;
      this.observer?.disconnect();
    }
  });
})();
