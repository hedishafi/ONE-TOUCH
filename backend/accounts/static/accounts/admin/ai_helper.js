document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.mv-page');
  if (!page) return;

  const url = page.getAttribute('data-ai-helper-url');
  const promptInput = document.getElementById('mv-ai-prompt');
  const output = document.getElementById('mv-ai-output');
  const run = document.getElementById('mv-ai-run');
  if (!url || !promptInput || !output || !run) return;

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
      generateButton.disabled = true;
      const previousLabel = generateButton.textContent;
      generateButton.textContent = 'Generating...';

      try {
        const data = await postForm({
          mode: 'rejection_reason',
          document_issue: 'Some submitted images are unclear or partially cropped',
          identity_issue: 'The selfie and ID details cannot be confidently matched',
          additional_note: 'Please re-submit clear files under good lighting without glare or blur.',
        });

        const generated = (data.response || '').trim();
        if (!generated) {
          throw new Error('No generated reason returned');
        }

        textarea.value = generated;
        clearError();
        textarea.classList.add('mv-input-ai-filled');
        setTimeout(() => textarea.classList.remove('mv-input-ai-filled'), 1200);
        textarea.focus();
      } catch (_) {
        textarea.classList.add('mv-input-error');
        error.textContent = 'Could not generate a reason. Please try again.';
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = previousLabel;
      }
    });
  });
});
