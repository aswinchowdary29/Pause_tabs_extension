let activeTabId = null;
let activeDomain = null;
let intervalId = null;

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) { return null; }
}

// 1. Listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  const tab = await chrome.tabs.get(activeTabId);
  activeDomain = getDomain(tab.url);
  updateBadge(); // Update badge immediately on tab switch
});

// 2. Listen for URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    activeDomain = getDomain(changeInfo.url);
    updateBadge(); // Update badge immediately on URL change
  }
});

// 3. Helper to update the badge UI
function updateBadge() {
  chrome.storage.local.get(['siteLimits', 'usageData'], (data) => {
    const siteLimits = data.siteLimits || {};
    const usageData = data.usageData || {};

    if (activeDomain && siteLimits[activeDomain]) {
      const limitMins = siteLimits[activeDomain];
      const usedSeconds = usageData[activeDomain] || 0;
      const remainingMins = Math.ceil(limitMins - (usedSeconds / 60));

      // 1. Set the text (time remaining)
      const text = remainingMins > 0 ? remainingMins.toString() : "0";
      chrome.action.setBadgeText({ text: text });

      // 2. Set the color (Red if < 5 mins, Blue otherwise)
      if (remainingMins <= 5) {
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" }); // Red
      } else {
        chrome.action.setBadgeBackgroundColor({ color: "#4488FF" }); // Blue
      }
    } else {
      // Hide badge if site is not tracked
      chrome.action.setBadgeText({ text: "" });
    }
  });
}

// 4. The Timer Logic (Runs every second)
function startTimer() {
  if (intervalId) clearInterval(intervalId);
  
  intervalId = setInterval(() => {
    if (!activeDomain) return;

    chrome.storage.local.get(['siteLimits', 'usageData', 'lastDate'], (data) => {
      const today = new Date().toLocaleDateString();
      let usageData = data.usageData || {};
      const siteLimits = data.siteLimits || {};

      // Reset if new day
      if (data.lastDate !== today) {
        usageData = {};
        chrome.storage.local.set({ usageData: {}, lastDate: today });
      }

      // If current site is tracked
      if (siteLimits[activeDomain]) {
        if (!usageData[activeDomain]) usageData[activeDomain] = 0;
        usageData[activeDomain] += 1;

        chrome.storage.local.set({ usageData });

        // Update the badge every second while on the site
        updateBadge();

        // Check Limit
        if (usageData[activeDomain] > (siteLimits[activeDomain] * 60)) {
          chrome.tabs.sendMessage(activeTabId, { action: "BLOCK_PAGE" })
            .catch(() => {});
        }
      } else {
        // Ensure badge is cleared if we are on a non-tracked site
        // (Handles edge cases where timer ticks right after a tab switch)
        chrome.action.setBadgeText({ text: "" });
      }
    });
  }, 1000);
}

startTimer();