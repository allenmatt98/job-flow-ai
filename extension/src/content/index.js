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
        } else if (request.action === 'LOG_APPLICATION') {
            // Log application to Supabase from the side panel
            import('../utils/supabase.js').then(({ getSession, logApplication }) => {
                getSession().then(session => {
                    if (!session) {
                        sendResponse({ logged: false, reason: 'not_authenticated' });
                        return;
                    }
                    const jobTitle = document.querySelector('h1, .job-title, [class*="job-title"]')?.innerText?.trim() || '';
                    const hostname = window.location.hostname;
                    let platform = 'other';
                    if (hostname.includes('greenhouse')) platform = 'greenhouse';
                    else if (hostname.includes('lever')) platform = 'lever';
                    else if (hostname.includes('smartrecruiters')) platform = 'smartrecruiters';
                    else if (hostname.includes('workday')) platform = 'workday';
                    else if (hostname.includes('icims')) platform = 'icims';

                    // Try to extract company name
                    let companyName = '';
                    const companyEl = document.querySelector('.company-name, [class*="company"], .employer-name');
                    if (companyEl) companyName = companyEl.innerText.trim();
                    if (!companyName) {
                        const titleMatch = document.title.match(/at\s+(.+?)(?:\s*[-|]|$)/i);
                        if (titleMatch) companyName = titleMatch[1].trim();
                    }
                    if (!companyName) {
                        const parts = hostname.replace('www.', '').split('.');
                        companyName = parts.length > 2 ? parts[0] : parts[0];
                    }

                    logApplication({
                        company_name: companyName,
                        job_title: jobTitle,
                        job_url: window.location.href,
                        platform,
                    }).then(({ error }) => {
                        sendResponse({ logged: !error, error: error?.message });
                    });
                });
            }).catch(err => {
                sendResponse({ logged: false, error: err.message });
            });
            return true; // async
        } else if (request.action === 'SAVE_ANSWERS') {
            if (!currentStrategy || typeof currentStrategy.captureUnknownAnswers !== 'function') {
                sendResponse({ error: 'Strategy does not support answer capture' });
                return true;
            }
            const entries = currentStrategy.captureUnknownAnswers();
            if (entries.length === 0) {
                sendResponse({ saved: 0, totalStored: 0 });
                return true;
            }
            import('../utils/AnswerMemory.js').then(({ learnAnswers }) => {
                learnAnswers(entries).then(result => {
                    sendResponse(result);
                });
            }).catch(err => {
                sendResponse({ error: err.message });
            });
            return true; // async
        }
    } catch (e) {
        console.error('Job Flow AI Error:', e);
        sendResponse({ error: e.message });
    }
    return true; // Keep channel open for async response if needed
});

// Optional: Auto-detect strategy on load
currentStrategy = strategyManager.getStrategy();
