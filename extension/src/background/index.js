console.log('Background script loaded');

// Side panel behavior
// Chrome 116+ supports sidePanel.open, but typically we set it in manifest "default_path"
// To allow clicking the action icon to toggle/open:
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
