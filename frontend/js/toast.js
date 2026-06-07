/**
 * Toast Notifications & Custom Confirmation UI
 */

window.Toast = {
  init() {
    // Inject Toast Container
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    // Inject Confirm Modal
    if (!document.getElementById('toast-confirm-modal')) {
      const modalHtml = `
        <div id="toast-confirm-modal" class="toast-confirm-modal hidden">
          <div class="toast-confirm-overlay" id="toast-confirm-overlay"></div>
          <div class="toast-confirm-dialog">
            <div class="toast-confirm-body">
              <span class="toast-confirm-icon">⚠️</span>
              <p id="toast-confirm-message" class="toast-confirm-message"></p>
            </div>
            <div class="toast-confirm-actions">
              <button type="button" id="toast-confirm-cancel" class="btn btn-secondary btn-sm" aria-label="Cancel">Cancel</button>
              <button type="button" id="toast-confirm-ok" class="btn btn-primary btn-sm danger-bg" aria-label="Confirm">Confirm</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  },

  /**
   * Show a toast notification.
   * @param {string} message - The message to display.
   * @param {string} [type='info'] - 'info', 'success', 'error', 'warning'
   */
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Show a custom confirmation dialog.
   * @param {string} message - The confirmation message.
   * @param {Function} onConfirm - Callback if user clicks Confirm.
   */
  confirm(message, onConfirm) {
    const modal = document.getElementById('toast-confirm-modal');
    const overlay = document.getElementById('toast-confirm-overlay');
    const msgEl = document.getElementById('toast-confirm-message');
    const okBtn = document.getElementById('toast-confirm-ok');
    const cancelBtn = document.getElementById('toast-confirm-cancel');

    if (!modal) return;

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      overlay.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleEsc);
    };

    const handleOk = () => {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    };

    const handleCancel = () => cleanup();

    const handleEsc = (e) => {
      if (e.key === 'Escape') handleCancel();
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleEsc);

    // Focus OK button for quick keyboard navigation
    okBtn.focus();
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Initialize Toast container and modal on load
window.addEventListener('DOMContentLoaded', () => {
  window.Toast.init();
});
