// Function to replace page content
function blockPage() {
  document.body.innerHTML = `
    <div style="
      position: fixed; 
      top: 0; left: 0; 
      width: 100vw; height: 100vh; 
      background: #333; 
      color: white; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      z-index: 999999;
      font-family: sans-serif;">
      
      <h1 style="font-size: 3rem; margin-bottom: 20px;">Time's Up!</h1>
      <p style="font-size: 1.5rem;">You have reached your daily limit for this website.</p>
      <p style="margin-top: 20px; color: #aaa;">Come back tomorrow.</p>
    </div>
  `;
}

// 1. Listen for block command from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "BLOCK_PAGE") {
    blockPage();
  }
});

// 2. On initial load, check if we should already be blocked
// (Prevents seeing the site for a split second on refresh)
const domain = window.location.hostname.replace('www.', '');

chrome.storage.local.get(['dailyLimit', 'blockedSites', 'usageData'], (data) => {
  const blockedSites = data.blockedSites || [];
  const usageData = data.usageData || {};
  const dailyLimit = data.dailyLimit || 60;

  // Check if current site is tracked
  const isTracked = blockedSites.some(site => domain.includes(site));

  if (isTracked && usageData[domain] > (dailyLimit * 60)) {
    blockPage();
  }
});