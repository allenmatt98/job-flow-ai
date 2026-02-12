export class BaseStrategy {
    constructor(name) {
        this.name = name;
    }

    matches(hostname) {
        return false;
    }

    scan() {
        throw new Error('scan() must be implemented');
    }

    autofill(profile) {
        throw new Error('autofill() must be implemented');
    }

    getPageText() {
        // Try semantic selectors for main content area
        const selectors = ['[role="main"]', 'main', 'article', '#content', '.job-description', '#app_body'];
        let best = null;
        let bestLen = 0;

        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.innerText || '';
                    if (text.length > 200 && text.length > bestLen) {
                        best = text;
                        bestLen = text.length;
                    }
                }
            } catch (e) { /* selector may fail */ }
        }

        if (best) {
            return best.substring(0, 15000);
        }

        // Fallback: clone body and strip non-content elements
        try {
            const clone = document.body.cloneNode(true);
            const stripSelectors = ['nav', 'header', 'footer', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '.sidebar', 'aside', '[class*="cookie"]', '[class*="banner"]', '[id*="cookie"]'];
            for (const sel of stripSelectors) {
                clone.querySelectorAll(sel).forEach(el => el.remove());
            }
            return (clone.innerText || '').substring(0, 15000);
        } catch (e) {
            // Last resort
            return (document.body.innerText || '').substring(0, 15000);
        }
    }
}
