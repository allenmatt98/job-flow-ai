import { getFieldType } from './heuristics';

console.log('AI Job Filler Content Script Active');

// Store identified fields
let pageFields = [];

const scanFields = () => {
    const inputs = document.querySelectorAll('input, textarea, select');
    const distinctFields = [];

    inputs.forEach(input => {
        // Skip hidden types
        if (input.type === 'hidden' || input.style.display === 'none') return;

        // Check if we already processed this element (sometimes inputs are nested weirdly, but querySelectorAll returns unique nodes)

        const type = getFieldType(input);
        if (type !== 'unknown') {
            distinctFields.push({
                element: input,
                type,
                currentValue: input.value
            });
            // Highlight for debug (optional, remove in prod)
            input.style.border = '2px solid #3b82f6';
        }
    });

    pageFields = distinctFields;
    return distinctFields.map(f => ({ type: f.type, tagName: f.element.tagName }));
};

const autofill = (profile) => {
    let filledCount = 0;
    pageFields.forEach(field => {
        if (profile[field.type]) {
            const val = profile[field.type];

            // Handle standard inputs
            field.element.value = val;
            field.element.dispatchEvent(new Event('input', { bubbles: true }));
            field.element.dispatchEvent(new Event('change', { bubbles: true }));
            field.element.style.backgroundColor = '#ecfdf5'; // Green tint
            filledCount++;
        }
    });
    return filledCount;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCAN_PAGE') {
        const fields = scanFields();
        sendResponse({ count: fields.length, fields });
    } else if (request.action === 'AUTOFILL') {
        const count = autofill(request.profile);
        sendResponse({ success: true, count });
    } else if (request.action === 'GET_PAGE_TEXT') {
        // Basic text extraction for MVP
        // Prioritize main content if possible, but body is safe fallback
        const text = document.body.innerText.substring(0, 15000);
        sendResponse({ text });
    }
});
