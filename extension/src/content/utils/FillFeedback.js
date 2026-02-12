/**
 * FillFeedback — Visual confidence feedback for autofilled fields.
 * Uses inline styles + data attributes (reliable in content scripts, avoids CSP issues).
 */

export const FillConfidence = Object.freeze({
    HIGH: 'high',       // green — exact or strong fuzzy match
    MEDIUM: 'medium',   // yellow — fuzzy match above threshold but below high
    FAILED: 'failed',   // red — no match found, field left blank
    SCANNED: 'scanned'  // blue — field detected during scan, not yet filled
});

const CONFIDENCE_STYLES = {
    [FillConfidence.HIGH]: { border: '2px solid #22c55e', background: 'rgba(34,197,94,0.06)' },
    [FillConfidence.MEDIUM]: { border: '2px solid #eab308', background: 'rgba(234,179,8,0.06)' },
    [FillConfidence.FAILED]: { border: '2px solid #ef4444', background: 'rgba(239,68,68,0.06)' },
    [FillConfidence.SCANNED]: { border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.06)' }
};

const DATA_ATTR = 'data-jfai-status';
const TOOLTIP_ATTR = 'data-jfai-tooltip';

/**
 * Apply visual feedback to a form element.
 *
 * @param {Element} element - The form field to mark
 * @param {string} confidence - One of FillConfidence values
 * @param {string} [tooltip] - Optional hover text explaining the match
 */
export function markField(element, confidence, tooltip) {
    if (!element) return;

    // We only set the data attribute for internal logic.
    // Visual styles (border/bg) are removed per user request for "authentic feel".
    element.setAttribute(DATA_ATTR, confidence);

    if (tooltip) {
        element.setAttribute('title', tooltip);
        element.setAttribute(TOOLTIP_ATTR, tooltip);
    }
}

/**
 * Remove all Job Flow AI visual marks from the page.
 */
export function clearAllMarks() {
    const marked = document.querySelectorAll(`[${DATA_ATTR}]`);
    marked.forEach(el => {
        el.style.border = '';
        el.style.backgroundColor = '';
        el.removeAttribute(DATA_ATTR);
        if (el.hasAttribute(TOOLTIP_ATTR)) {
            el.removeAttribute('title');
            el.removeAttribute(TOOLTIP_ATTR);
        }
    });
}
