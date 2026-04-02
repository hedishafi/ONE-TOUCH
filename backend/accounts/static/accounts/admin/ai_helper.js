document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.mv-page');
  if (!page) return;

  const url = page.getAttribute('data-ai-helper-url');
  const promptInput = document.getElementById('mv-ai-prompt');
  const output = document.getElementById('mv-ai-output');
  const run = document.getElementById('mv-ai-run');
  if (!url || !promptInput || !output || !run) return;

  run.addEventListener('click', async () => {
    const prompt = (promptInput.value || '').trim();
    if (!prompt) {
      output.value = 'Enter a prompt first.';
      return;
    }

    run.disabled = true;
    output.value = 'Generating suggestion...';

    try {
      const csrf = document.querySelector('[name=csrfmiddlewaretoken]')?.value
        || document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1];

      const body = new URLSearchParams();
      body.set('prompt', prompt);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(csrf ? { 'X-CSRFToken': decodeURIComponent(csrf) } : {}),
        },
        body: body.toString(),
      });

      const data = await response.json();
      output.value = data.response || data.detail || 'No response.';
    } catch (_) {
      output.value = 'Failed to generate suggestion. Try again.';
    } finally {
      run.disabled = false;
    }
  });
});
