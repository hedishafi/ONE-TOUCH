document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.mv-page');
  if (!page) return;

  const url = page.getAttribute('data-ai-helper-url');
  const promptInput = document.getElementById('mv-ai-prompt');
  const output = document.getElementById('mv-ai-output');
  const run = document.getElementById('mv-ai-run');
  if (!url) return;

  const getCsrfToken = () => (
    document.querySelector('[name=csrfmiddlewaretoken]')?.value
    || document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1]
  );

  const postForm = async (payload) => {
    const csrf = getCsrfToken();
    const body = new URLSearchParams(payload);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(csrf ? { 'X-CSRFToken': decodeURIComponent(csrf) } : {}),
      },
      body: body.toString(),
    });
    return response.json();
  };

  if (promptInput && output && run) {
    run.addEventListener('click', async () => {
      const prompt = (promptInput.value || '').trim();
      if (!prompt) {
        output.value = 'Enter a prompt first.';
        return;
      }

      run.disabled = true;
      output.value = 'Generating suggestion...';

      try {
        const data = await postForm({ prompt });
        output.value = data.response || data.detail || 'No response.';
      } catch (_) {
        output.value = 'Failed to generate suggestion. Try again.';
      } finally {
        run.disabled = false;
      }
    });
  }

  page.querySelectorAll('.mv-review-form').forEach((form) => {
    const textarea = form.querySelector('.mv-reason-input');
    const error = form.querySelector('.mv-field-error');
    const rejectButton = form.querySelector('.mv-button-reject');
    const generateButton = form.querySelector('[data-generate-reason]');

    if (!textarea || !error || !rejectButton || !generateButton) return;

    const clearError = () => {
      textarea.classList.remove('mv-input-error');
      error.textContent = '';
    };

    textarea.addEventListener('input', clearError);

    rejectButton.addEventListener('click', (event) => {
      const value = (textarea.value || '').trim();
      if (!value) {
        event.preventDefault();
        textarea.classList.add('mv-input-error');
        error.textContent = 'Rejection reason is required before rejecting this submission.';
        textarea.focus();
        return;
      }
      if (value.length < 12) {
        event.preventDefault();
        textarea.classList.add('mv-input-error');
        error.textContent = 'Please add more detail (at least 12 characters).';
        textarea.focus();
        return;
      }
      clearError();
    });

    generateButton.addEventListener('click', async () => {
      const currentValue = (textarea.value || '').trim();
      
      if (!currentValue) {
        textarea.classList.add('mv-input-error');
        error.textContent = 'Please enter a short reason first (e.g., "blurry image" or "ID expired"), then click Generate AI Reason to expand it.';
        textarea.focus();
        return;
      }

      generateButton.disabled = true;
      const previousLabel = generateButton.textContent;
      generateButton.textContent = 'Generating...';

      try {
        const data = await postForm({
          mode: 'rejection_reason',
          admin_input: currentValue,
        });

        const variations = data.variations || [];
        if (variations.length === 0) {
          throw new Error('No variations generated');
        }

        // Show variations in a modal or selection UI
        showVariationsModal(textarea, variations, clearError);
        
      } catch (_) {
        textarea.classList.add('mv-input-error');
        error.textContent = 'Could not generate reasons. Please ensure you entered a short description first.';
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = previousLabel;
      }
    });
  });

  function showVariationsModal(textarea, variations, clearError) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'mv-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'mv-modal';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'mv-modal-header';
    modalHeader.innerHTML = '<h3>Select a Rejection Reason</h3><p>Choose the most appropriate variation or edit as needed:</p>';
    
    const modalBody = document.createElement('div');
    modalBody.className = 'mv-modal-body';
    
    variations.forEach((variation, index) => {
      const option = document.createElement('div');
      option.className = 'mv-variation-option';
      option.innerHTML = `
        <div class="mv-variation-number">Option ${index + 1}</div>
        <div class="mv-variation-text">${variation}</div>
        <button type="button" class="button mv-button-select" data-index="${index}">Use This</button>
      `;
      modalBody.appendChild(option);
    });
    
    const modalFooter = document.createElement('div');
    modalFooter.className = 'mv-modal-footer';
    modalFooter.innerHTML = '<button type="button" class="button mv-button-cancel">Cancel</button>';
    
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle selection
    modalBody.querySelectorAll('.mv-button-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        textarea.value = variations[index];
        clearError();
        textarea.classList.add('mv-input-ai-filled');
        setTimeout(() => textarea.classList.remove('mv-input-ai-filled'), 1200);
        document.body.removeChild(overlay);
      });
    });
    
    // Handle cancel
    modalFooter.querySelector('.mv-button-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }
});
