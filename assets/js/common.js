// Common Utility Functions

// Show Toast Message
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    z-index: 10000;
    animation: slideIn 0.5s ease;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Format Date
function formatDate(date) {
  return new Date(date).toLocaleDateString('hi-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generate Random ID
function generateID(prefix = 'ID') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Loading Spinner
function showLoader(elementId) {
  document.getElementById(elementId).innerHTML = '<div class="loader"></div>';
}

// Add animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
  
console.log("Common Utilities Loaded!");
