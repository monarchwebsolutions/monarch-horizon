(() => {
  if (customElements.get('custom-reviews')) return;

  customElements.define('custom-reviews', class extends HTMLElement {
    connectedCallback() {
      const track = this.querySelector('.custom-reviews__track');
      const controls = this.querySelector('.custom-reviews__controls');
      if (!track || !controls || this.events) return;

      const cards = track.querySelectorAll('.custom-reviews__card');
      const [previous, next] = controls.querySelectorAll('[data-review-step]');
      const playback = controls.querySelector('[data-review-playback]');
      const interval = Number(this.dataset.autoplaySeconds) * 1000;
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.events = new AbortController();
      const { signal } = this.events;
      let paused = false;
      let hovered = matchMedia('(hover: hover)').matches && this.matches(':hover');
      let focused = this.contains(document.activeElement);

      const move = (step) => {
        const direction = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
        const distance = Math.abs(cards[1].offsetLeft - cards[0].offsetLeft);
        track.scrollBy({ left: step * direction * distance, behavior: motion.matches ? 'instant' : 'smooth' });
      };

      const canPlay = () => playback && interval > 0 && !paused && !controls.hidden &&
        !motion.matches && !document.hidden && !hovered && !focused && !this.contains(document.activeElement);

      const refresh = () => {
        const overflow = track.scrollWidth - track.clientWidth;
        const offset = Math.abs(track.scrollLeft);
        controls.hidden = overflow <= 1;
        previous.disabled = offset <= 1;
        next.disabled = offset >= overflow - 1;

        if (playback) {
          playback.hidden = motion.matches;
          playback.textContent = paused ? 'Play autoplay' : 'Pause autoplay';
        }

        if (!canPlay()) {
          clearTimeout(this.timer);
          this.timer = undefined;
        } else if (this.timer === undefined) {
          this.timer = setTimeout(() => {
            this.timer = undefined;
            if (canPlay()) {
              if (next.disabled) track.scrollTo({ left: 0, behavior: 'instant' });
              else move(1);
            }
            refresh();
          }, interval);
        }
      };

      controls.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button === playback) paused = !paused;
        else move(Number(button.dataset.reviewStep));
        clearTimeout(this.timer);
        this.timer = undefined;
        refresh();
      }, { signal });

      track.addEventListener('scroll', refresh, { passive: true, signal });
      for (const event of ['pointerenter', 'pointerleave']) {
        this.addEventListener(event, (pointer) => {
          if (pointer.pointerType !== 'mouse') return;
          hovered = event === 'pointerenter';
          refresh();
        }, { signal });
      }
      this.addEventListener('focusin', () => {
        focused = true;
        refresh();
      }, { signal });
      this.addEventListener('focusout', (event) => {
        focused = this.contains(event.relatedTarget);
        queueMicrotask(() => {
          if (!signal.aborted) refresh();
        });
      }, { signal });
      document.addEventListener('visibilitychange', refresh, { signal });
      motion.addEventListener('change', refresh, { signal });
      this.observer = new ResizeObserver(refresh);
      this.observer.observe(track);
      refresh();
    }

    disconnectedCallback() {
      this.events?.abort();
      this.events = null;
      clearTimeout(this.timer);
      this.timer = undefined;
      this.observer?.disconnect();
    }
  });
})();
