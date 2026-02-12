import { HeuristicStrategy } from './HeuristicStrategy';
import { markField, FillConfidence } from '../utils/FillFeedback';

export class GoogleFormsStrategy extends HeuristicStrategy {
    constructor() {
        super('GoogleForms');
    }

    matches(hostname) {
        return hostname.includes('docs.google.com') && window.location.pathname.includes('/forms/');
    }

    scan() {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        const distinctFields = [];

        inputs.forEach(input => {
            // Find the closest question container
            const questionContainer = input.closest('[role="listitem"]') || input.closest('.geS5n');

            let labelText = '';
            if (questionContainer) {
                const titleDiv = questionContainer.querySelector('[role="heading"]');
                if (titleDiv) labelText = titleDiv.innerText;
            } else {
                labelText = input.getAttribute('aria-label') || '';
            }

            // Simple mapping
            let type = 'unknown';
            const lowerLabel = labelText.toLowerCase();
            if (lowerLabel.includes('email')) type = 'email';
            else if (lowerLabel.includes('name')) type = 'firstName';
            else if (lowerLabel.includes('phone')) type = 'phone';

            // Include if known type OR has a label (even if unknown)
            if (type !== 'unknown' || labelText) {
                distinctFields.push({
                    element: input,
                    type,
                    label: labelText || type,
                    currentValue: input.value
                });
                try {
                    markField(input, FillConfidence.SCANNED);
                } catch (e) { }
            }
        });

        this.pageFields = distinctFields;
        return distinctFields.map(f => ({
            type: f.label || f.type,
            tagName: f.element.tagName,
            standardType: f.type
        }));
    }

    // autofill() inherited from HeuristicStrategy (3-pass: profile + memory + LLM)
}
