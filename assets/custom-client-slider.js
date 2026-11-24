(() => {
  const tag = 'custom-client-slider';
  if (customElements.get(tag)) return;

  customElements.define(tag, class extends HTMLElement {
    connectedCallback() {
      const viewport = this.querySelector('.custom-client-slider__viewport');
      const list = this.querySelector('.custom-client-slider__list');
      const speed = Number(this.dataset.autoplay);
      if (this.cleanup || !viewport || !list || list.children.length < 2 || !(speed > 0)) return;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const listeners = new AbortController();
      const { signal } = listeners;
      const direction = getComputedStyle(viewport).direction === 'rtl' ? -1 : 1;
      let clone;
      let cycle = 0;
      let frame = 0;
      let previousTime;
      let position = 0;
      let visible = false;
      let hovered = viewport.matches(':hover') && matchMedia('(hover: hover)').matches;
      let interacting = false;
      let resumeTimer;

      const stop = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = undefined;
      };

      const update = () => {
        if (!cycle || !visible || hovered || interacting || viewport.contains(document.activeElement)) {
          stop();
        } else if (!frame) {
          position = direction * viewport.scrollLeft;
          frame = requestAnimationFrame(advance);
        }
      };

      function advance(time) {
        if (previousTime !== undefined) {
          position = (Math.max(0, position) + speed * Math.min(time - previousTime, 50) / 1000) % cycle;
          viewport.scrollLeft = direction * position;
        }
        previousTime = time;
        frame = requestAnimationFrame(advance);
      }

      const configure = () => {
        stop();
        if (motion.matches || list.getBoundingClientRect().width <= viewport.clientWidth) {
          clone?.remove();
          clone = undefined;
          cycle = 0;
          return;
        }

        if (!clone) {
          clone = list.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('inert', '');
          clone.querySelectorAll('[data-shopify-editor-block]').forEach(card =>
            card.removeAttribute('data-shopify-editor-block')
          );
          list.after(clone);
        }

        cycle = Math.abs(clone.getBoundingClientRect().left - list.getBoundingClientRect().left);
        update();
      };

      const pauseForInteraction = () => {
        interacting = true;
        update();
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          interacting = false;
          update();
        }, 700);
      };

      viewport.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = true;
        update();
      }, { signal });
      viewport.addEventListener('pointerleave', () => {
        hovered = false;
        update();
      }, { signal });
      viewport.addEventListener('focusin', update, { signal });
      viewport.addEventListener('focusout', () => queueMicrotask(() => {
        if (!signal.aborted) update();
      }), { signal });
      for (const event of ['touchstart', 'touchmove', 'wheel']) {
        viewport.addEventListener(event, pauseForInteraction, { passive: true, signal });
      }
      viewport.addEventListener('scroll', () => {
        if (interacting) pauseForInteraction();
      }, { passive: true, signal });
      motion.addEventListener('change', configure, { signal });

      const visibility = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        update();
      });
      visibility.observe(viewport);
      const resize = new ResizeObserver(configure);
      resize.observe(viewport);
      resize.observe(list);

      this.cleanup = () => {
        listeners.abort();
        visibility.disconnect();
        resize.disconnect();
        clearTimeout(resumeTimer);
        stop();
        clone?.remove();
        this.cleanup = undefined;
      };
      configure();
    }

    disconnectedCallback() {
      this.cleanup?.();
    }
  });
})();
