document.addEventListener('DOMContentLoaded', () => {
  const siteInput = document.getElementById('site');
  const limitInput = document.getElementById('limit');
  const addBtn = document.getElementById('add');
  const ruleList = document.getElementById('ruleList');

  // Load and display existing rules
  renderRules();

  addBtn.addEventListener('click', () => {
    const site = siteInput.value.trim().toLowerCase().replace('www.', '').replace('https://', '').split('/')[0];
    const limit = parseInt(limitInput.value);

    if (site && limit) {
      chrome.storage.local.get(['siteLimits'], (data) => {
        const siteLimits = data.siteLimits || {};
        siteLimits[site] = limit;

        chrome.storage.local.set({ siteLimits }, () => {
          siteInput.value = '';
          limitInput.value = '';
          renderRules();
        });
      });
    }
  });

  function renderRules() {
    ruleList.innerHTML = '';
    // We now fetch usageData AND siteLimits
    chrome.storage.local.get(['siteLimits', 'usageData'], (data) => {
      const siteLimits = data.siteLimits || {};
      const usageData = data.usageData || {};
      
      const sites = Object.keys(siteLimits);

      if (sites.length === 0) {
        ruleList.innerHTML = '<li style="color:#999; justify-content:center;">No limits set yet.</li>';
        return;
      }

      for (const site of sites) {
        const limitMins = siteLimits[site];
        const usedSeconds = usageData[site] || 0;
        const usedMins = Math.floor(usedSeconds / 60);
        
        let remainingMins = limitMins - usedMins;
        if (remainingMins < 0) remainingMins = 0;

        const li = document.createElement('li');
        
        // Dynamic HTML with stats
        li.innerHTML = `
          <div class="site-info">
            <span class="site-name">${site}</span>
            <span class="site-stats">
              Used: ${usedMins}m &nbsp;|&nbsp; Left: <b>${remainingMins}m</b>
            </span>
          </div>
          <span class="delete-btn" data-site="${site}">Remove</span>
        `;
        ruleList.appendChild(li);
      }

      // Add delete functionality
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const siteToDelete = e.target.getAttribute('data-site');
          delete siteLimits[siteToDelete];
          chrome.storage.local.set({ siteLimits }, renderRules);
        });
      });
    });
  }
});