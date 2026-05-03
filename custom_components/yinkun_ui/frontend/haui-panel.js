class HAUIPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
  }

  set panel(panel) {
    if (this._panel === panel) return;
    this._panel = panel;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    const panel = this._panel || {};
    const config = panel.config || {};
    const url = config.url;
    if (!url || this.querySelector('iframe')) return;

    this.style.display = 'block';
    this.style.height = '100%';
    this.innerHTML = '';

    const iframe = document.createElement('iframe');
    const src = new URL(url, window.location.origin);
    src.searchParams.set('haui_host', config.host || 'ha');
    if (config.mode) src.searchParams.set('haui_mode', config.mode);

    iframe.src = src.toString();
    iframe.title = 'HAUI Dashboard';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.setAttribute('allow', 'fullscreen; microphone; camera');
    iframe.setAttribute('referrerpolicy', 'same-origin');
    this.appendChild(iframe);
  }
}

customElements.define('yinkun-ui-panel', HAUIPanel);
