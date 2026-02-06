import { BaseStrategy } from './BaseStrategy';
import { findAllInputs, collectAllText } from '../utils/ShadowDom';
import { getFieldType } from '../heuristics';

export class SmartRecruitersStrategy extends BaseStrategy {
    constructor() {
        super('SmartRecruiters');
        this.pageFields = [];
    }

    matches(hostname) {
        return hostname.includes('smartrecruiters.com');
    }

    scan() {
        // Use our recursive Shadow DOM traverser
        const inputs = findAllInputs(document.body);
        const distinctFields = [];

        inputs.forEach(input => {
            if (input.type === 'hidden' || input.style.display === 'none') return;

            // Reuse the heuristic logic for field type detection, but applied to these deep elements
            const type = getFieldType(input);
            if (type !== 'unknown') {
                distinctFields.push({
                    element: input,
                    type,
                    currentValue: input.value
                });
                // Style might not work inside closed shadow root check, but for open it works
                try {
                    input.style.border = '2px solid #8b5cf6'; // Purple for SmartRecruiters
                } catch (e) { }
            }
        });

        this.pageFields = distinctFields;
        return distinctFields.map(f => ({ type: f.type, tagName: f.element.tagName }));
    }

    autofill(profile) {
        let filledCount = 0;
        this.pageFields.forEach(field => {
            // Handle Profile (Standard Fields)
            if (profile.userProfile && profile.userProfile[field.type]) {
                const val = profile.userProfile[field.type];

                field.element.value = val;
                field.element.dispatchEvent(new Event('input', { bubbles: true }));
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
            // Handle Resume
            else if (field.type === 'resume' && profile.resume) {
                // TODO: SmartRecruiters shadow dom file input might be tricky, usually standard input[type=file] works if found.
                // Import uploadResume if needed, but for now we assume standard behavior
            }
        });
        return filledCount;
    }

    getPageText() {
        return collectAllText(document.body).substring(0, 15000);
    }
}
