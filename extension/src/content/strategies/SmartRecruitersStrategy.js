import { HeuristicStrategy } from './HeuristicStrategy';
import { findAllInputs, collectAllText } from '../utils/ShadowDom';
import { getFieldType } from '../heuristics';
import { markField, FillConfidence } from '../utils/FillFeedback';

export class SmartRecruitersStrategy extends HeuristicStrategy {
    constructor() {
        super('SmartRecruiters');
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

            // getFieldType returns { type, label }
            const { type, label } = getFieldType(input);

            if (type !== 'unknown' || label) {
                distinctFields.push({
                    element: input,
                    type,
                    label: label || type,
                    currentValue: input.value
                });
                try {
                    if (type !== 'unknown') {
                        markField(input, FillConfidence.SCANNED);
                    }
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

    getPageText() {
        return collectAllText(document.body).substring(0, 15000);
    }
}
