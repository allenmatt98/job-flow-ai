import { BaseStrategy } from './BaseStrategy';

export class GoogleFormsStrategy extends BaseStrategy {
    constructor() {
        super('GoogleForms');
        this.pageFields = [];
    }

    matches(hostname) {
        return hostname.includes('docs.google.com') && window.location.pathname.includes('/forms/');
    }

    scan() {
        // Google forms use [role="listitem"] for questions
        // This is a simplified implementation. Real Google Forms are tough because inputs are obscure.
        // We look for 'input[type="text"]' (short answer) and 'textarea' (paragraph).
        // The accessible name often connects to the question title.

        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        const distinctFields = [];

        inputs.forEach(input => {
            // Find the closest question container
            const questionContainer = input.closest('[role="listitem"]') || input.closest('.geS5n'); // .geS5n is a common class for question block

            let labelText = '';
            if (questionContainer) {
                // Try to find the title div
                const titleDiv = questionContainer.querySelector('[role="heading"]');
                if (titleDiv) labelText = titleDiv.innerText;
            } else {
                labelText = input.getAttribute('aria-label') || '';
            }

            // Simple mapping for now
            let type = 'unknown';
            const lowerLabel = labelText.toLowerCase();
            if (lowerLabel.includes('email')) type = 'email';
            else if (lowerLabel.includes('name')) type = 'firstName'; // simplified
            else if (lowerLabel.includes('phone')) type = 'phone';

            if (type !== 'unknown') {
                distinctFields.push({
                    element: input,
                    type,
                    currentValue: input.value
                });
                input.style.border = '2px dashed #f59e0b'; // distinct border for gForms
            }
        });

        this.pageFields = distinctFields;
        return distinctFields.map(f => ({ type: f.type, tagName: 'google-input' }));
    }

    autofill(profile) {
        let filledCount = 0;
        this.pageFields.forEach(field => {
            if (profile[field.type]) {
                const val = profile[field.type];

                // Google forms requires input events to register valid state
                field.element.value = val;
                field.element.dispatchEvent(new Event('input', { bubbles: true }));
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
                // Sometimes focus/blur is needed
                field.element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
                field.element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

                filledCount++;
            }
        });
        return filledCount;
    }
}
