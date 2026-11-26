(() => {
  const elementName = 'custom-booking-calendly';
  if (customElements.get(elementName)) return;

  const scriptUrl = 'https://assets.calendly.com/assets/external/widget.js';
  let scriptReady;

  function loadCalendly() {
    if (window.Calendly?.initInlineWidget) return Promise.resolve(window.Calendly);

    scriptReady ??= new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      const script = existingScript || document.createElement('script');

      script.addEventListener('load', () => {
        if (window.Calendly?.initInlineWidget) {
          resolve(window.Calendly);
        } else {
          reject(new Error('Calendly inline widget is unavailable'));
        }
      }, { once: true });
      script.addEventListener('error', () => {
        if (!existingScript) script.remove();
        reject(new Error('Calendly could not load'));
      }, { once: true });

      if (!existingScript) {
        script.src = scriptUrl;
        script.async = true;
        document.head.append(script);
      }
    }).catch((error) => {
      scriptReady = undefined;
      throw error;
    });

    return scriptReady;
  }

  customElements.define(elementName, class extends HTMLElement {
    async connectedCallback() {
      const url = this.dataset.url;
      if (!url || this.querySelector('iframe')) return;

      try {
        const calendly = await loadCalendly();
        if (!this.isConnected || this.querySelector('iframe')) return;

        calendly.initInlineWidget({ url, parentElement: this, resize: true });
        const frame = this.querySelector('iframe');
        if (frame && this.dataset.title) frame.title = this.dataset.title;
      } catch {
        // The adjacent booking link remains available if the widget fails to load.
      }
    }
  });
})();
