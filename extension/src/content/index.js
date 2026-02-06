import { StrategyManager } from './strategies/StrategyManager';

console.log('AI Job Filler Content Script Active');

const strategyManager = new StrategyManager();
let currentStrategy = null;

// Use a mutation observer to re-scan if the DOM changes heavily, 
// OR just rely on manual 'Scan' triggers which is safer for performance initially.
// For the requested features, we want robust detection.

const scanFields = () => {
    currentStrategy = strategyManager.getStrategy();
    console.log('Scanning with:', currentStrategy.name);
    return currentStrategy.scan();
};

const autofill = (profile) => {
    if (!currentStrategy) {
        currentStrategy = strategyManager.getStrategy();
    }
    return currentStrategy.autofill(profile);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'SCAN_PAGE') {
            const fields = scanFields();
            sendResponse({ count: fields.length, fields });
        } else if (request.action === 'AUTOFILL') {
            const count = autofill(request.profile);
            sendResponse({ success: true, count });
        } else if (request.action === 'GET_PAGE_TEXT') {
            if (!currentStrategy) currentStrategy = strategyManager.getStrategy();
            const text = currentStrategy.getPageText();
            sendResponse({ text });
        }
    } catch (e) {
        console.error('Job Flow AI Error:', e);
        sendResponse({ error: e.message });
    }
    return true; // Keep channel open for async response if needed
});

// Optional: Auto-detect strategy on load
currentStrategy = strategyManager.getStrategy();
