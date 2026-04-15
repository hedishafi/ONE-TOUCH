document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generate-rejection-btn');
  const adminHintInput = document.getElementById('admin-hint-input');
  
  if (!generateBtn || !adminHintInput) return;
  
  const apiUrl = window.GENERATE_REJECTION_URL;
  if (!apiUrl) {
    console.error('GENERATE_REJECTION_URL not defined');
    return;
  }

  const getCsrfToken = () => (
    document.querySelector('[name=csrfmiddlewaretoken]')?.value
    || document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1]
  );

  const postForm = async (payload) => {
    const csrf = getCsrfToken();
    const body = new URLSearchParams(payload);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(csrf ? { 'X-CSRFToken': decodeURIComponent(csrf) } : {}),
      },
      body: body.toString(),
    });
    return response.json();
  };

  generateBtn.addEventListener('click', async () => {
    const adminInput = (adminHintInput.value || '').trim();
    
    if (!adminInput) {
      alert('Please enter a short hint first (e.g., "blurry image" or "ID expired")');
      adminHintInput.focus();
      return;
    }

    generateBtn.disabled = true;
    const previousLabel = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';

    try {
      const data = await postForm({
        admin_input: adminInput,
      });

      const variations = data.variations || [];
      if (variations.length === 0) {
        throw new Error('No variations generated');
      }

      // Show variations in a modal
      showVariationsModal(variations);
      
    } catch (error) {
      alert('Could not generate rejection messages. Please try again.');
      console.error('Error generating rejection:', error);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = previousLabel;
    }
  });

  function showVariationsModal(variations) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'mv-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'mv-modal';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'mv-modal-header';
    modalHeader.innerHTML = '<h3>Select a Rejection Message</h3><p>Choose the most appropriate variation. This message will be shown to the user:</p>';
    
    const modalBody = document.createElement('div');
    modalBody.className = 'mv-modal-body';
    
    variations.forEach((variation, index) => {
      const option = document.createElement('div');
      option.className = 'mv-variation-option';
      option.innerHTML = `
        <div class="mv-variation-number">Option ${index + 1}</div>
        <div class="mv-variation-text">${escapeHtml(variation)}</div>
        <button type="button" class="button mv-button-select" data-index="${index}">Use This Message</button>
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
        const selectedMessage = variations[index];
        
        // Find the rejection_message field in the Django admin form
        const rejectionMessageField = document.querySelector('#id_rejection_message');
        const adminHintField = document.querySelector('#id_admin_hint');
        
        if (rejectionMessageField) {
          rejectionMessageField.value = selectedMessage;
          // Highlight the field briefly
          rejectionMessageField.style.background = '#EFF6FF';
          setTimeout(() => {
            rejectionMessageField.style.background = '';
          }, 1200);
        }
        
        // Also populate admin_hint with the original input
        if (adminHintField && adminHintInput) {
          adminHintField.value = adminHintInput.value;
        }
        
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
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
