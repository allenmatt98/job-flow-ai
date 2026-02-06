import { HeuristicStrategy } from './HeuristicStrategy';
import { getFieldType } from '../heuristics';

export class GreenhouseStrategy extends HeuristicStrategy {
    constructor() {
        super('Greenhouse');
    }

    matches(hostname) {
        return hostname.includes('greenhouse.io');
    }

    async autofill(profile) {
        // 1. Run standard fill (Name, Email, Phone, Resume)
        // Heuristic strategy handles the basic #first_name, #last_name etc. quite well.
        console.log('Starting Greenhouse Autofill...');
        console.log('Profile Data received:', JSON.stringify({
            educationCount: profile.education ? profile.education.length : 0,
            experienceCount: profile.experience ? profile.experience.length : 0,
            hasResume: !!profile.resume
        }, null, 2));
        let count = 0;

        try {
            count += await super.autofill(profile);

            // CRITICAL: Resume upload often triggers a partial page reload/parsing overlay.
            // We MUST wait for this to settle before trying to find the next fields.
            console.log('Post-Resume Wait (2s) for DOM stability...');
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error('Standard autofill failed (non-fatal):', e);
        }

        // 2. Handle Education
        if (profile.education && profile.education.length > 0) {
            try {
                console.log('Starting Education Section...');
                count += await this.fillComplexSection(
                    profile.education,
                    'education',
                    'school_name' // Field signature to check if "Add" worked
                );
            } catch (e) {
                console.error('Education section failed:', e);
            }
        }

        // 3. Handle Employment
        if (profile.experience && profile.experience.length > 0) {
            try {
                console.log('Starting Employment Section...');
                count += await this.fillComplexSection(
                    profile.experience,
                    'employment',
                    'company_name'
                );
            } catch (e) {
                console.error('Employment section failed:', e);
            }
        }

        return count;
    }

    async fillComplexSection(dataArray, sectionName, signatureField) {
        let count = 0;

        // Find the main container for this section
        // Greenhouse usually separates sections, but let's try to find potential containers
        // OR, rely on finding specific "Add Another" buttons to anchor ourselves.

        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];

            // 1. Identify context for this item (the i-th set of fields)
            // Greenhouse often appends new sets of fields with specific classes or ID patterns.
            // But now we want to search via Label.
            // Problem: Multiple "School" fields exist.
            // Solution: Find ALL "School" fields, pick the i-th one.

            // Wait a bit if we just added a row
            if (i > 0) {
                await new Promise(r => setTimeout(r, 600));
            }

            // Check if we need to add a row
            // Strategy: Count how many "School" (or signature) fields exist.
            const signatureLabel = signatureField.replace(/_/g, ' '); // school_name -> school name
            const currentFields = this.findFieldsByLabelPattern(signatureLabel);

            if (currentFields.length <= i) {
                const addLink = Array.from(document.querySelectorAll('a, button')).find(el =>
                    el.innerText.toLowerCase().includes(`add another ${sectionName}`) ||
                    el.innerText.toLowerCase().includes(`add ${sectionName}`)
                );

                if (addLink) {
                    addLink.click();
                    await new Promise(r => setTimeout(r, 600)); // Wait for DOM
                }
            }

            // 2. Fill fields for index 'i'
            // We find ALL matching fields for a type, and take the i-th one.
            // This assumes the order of fields in DOM matches the logical order.

            if (sectionName === 'education') {
                count += this.fillAtIndex(i, 'school', item.school);
                count += this.fillAtIndex(i, 'degree', item.degree);
                count += this.fillAtIndex(i, 'start_date_year', item.start);
                count += this.fillAtIndex(i, 'end_date_year', item.end);
            }
            else if (sectionName === 'employment') {
                count += this.fillAtIndex(i, 'company_name', item.company); // map to company
                count += this.fillAtIndex(i, 'title', item.title);

                // Dates logic handling
                const startParams = this.parseDate(item.start);
                const endParams = this.parseDate(item.end);

                count += this.fillAtIndex(i, 'start_date_month', startParams.month);
                count += this.fillAtIndex(i, 'start_date_year', startParams.year);
                count += this.fillAtIndex(i, 'end_date_month', endParams.month);
                count += this.fillAtIndex(i, 'end_date_year', endParams.year);
            }
        }
        return count;
    }

    async fillAtIndex(index, fieldType, value) {
        if (!value) return 0;

        // Use heuristics to find all fields of this type
        // This relies on getFieldType from heuristics.js returning the TYPE
        // But getFieldType uses FIELD_MAPPINGS.
        // We need to temporarily force a search for this specific type label.

        const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
        const matches = allInputs.filter(input => {
            // We can use the text mapping from heuristics, or just search loosely
            // Let's reuse getFieldType logic but specifically for this target type?
            // Or simpler: filter by label text inclusion.
            const typeInfo = this.getFieldTypeWithLabel(input, fieldType);
            return typeInfo.type === fieldType || (fieldType === 'company_name' && typeInfo.type === 'company');
        });

        console.log(`[Greenhouse] fillAtIndex: Searched for '${fieldType}' (index ${index}), found ${matches.length} matches.`);
        if (matches.length <= index) {
            console.warn(`[Greenhouse] Warning: Could not find field '${fieldType}' at index ${index}. Matches: ${matches.length}`);
        }

        if (matches[index]) {
            // Use safe timeout wrapper
            await this.fillFieldWithTimeout(matches[index].element, value);
            return 1;
        }
        return 0;
    }

    // Helper to reuse the enhanced heuristics detection
    getFieldTypeWithLabel(element, targetType) {
        // Broaden the search to include ID and Name checks, which are very reliable on Greenhouse
        const labelText = this.getLabelText(element);
        const attributes = [
            labelText,
            element.id,
            element.name,
            element.getAttribute('aria-label')
        ].filter(Boolean).map(s => s.toLowerCase());

        // EXCLUSION: If we are looking for a 'year' but the field is about 'experience', skip it.
        // Handles "Years of Experience" (and typos like "Expereince")
        if (targetType.includes('year') && attributes.some(attr => attr.includes('exper'))) {
            return { type: 'unknown', element };
        }

        const strictMappings = {
            'start_date_year': ['start', 'year'],
            'end_date_year': ['end', 'year'],
            'start_date_month': ['start', 'month'],
            'end_date_month': ['end', 'month']
        };

        if (strictMappings[targetType]) {
            const requiredTokens = strictMappings[targetType];
            // Check if ANY attribute contains ALL required tokens
            // e.g. id="education_start_date_year" contains 'start' and 'year'
            const match = attributes.some(attr => requiredTokens.every(token => attr.includes(token)));
            if (match) return { type: targetType, element };
        }

        // Fallback or Standard Mappings
        const labels = {
            'school': ['school', 'university', 'institution'],
            'degree': ['degree', 'qualification'],
            'company_name': ['company', 'organization'],
            'title': ['title', 'role', 'position']
        }[targetType] || [targetType.replace(/_/g, ' ')];

        // For standard fields, just check if any attribute contains the keyword
        if (labels.some(l => attributes.some(attr => attr.includes(l)))) {
            return { type: targetType, element };
        }

        return { type: 'unknown', element };
    }

    getLabelText(element) {
        // Re-implement basic label finding
        let text = '';
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) text = label.innerText;
        }
        if (!text && element.getAttribute('aria-label')) text = element.getAttribute('aria-label');
        if (!text) {
            const parentLabel = element.closest('label');
            if (parentLabel) text = parentLabel.innerText;
        }
        // Common Greenhouse pattern: Label is a sibling or in the same container div
        if (!text) {
            const container = element.closest('div');
            if (container) {
                const siblingLabel = container.querySelector('label');
                if (siblingLabel) text = siblingLabel.innerText;
            }
        }

        return text ? text.toLowerCase().trim() : '';
    }

    findFieldsByLabelPattern(pattern) {
        return Array.from(document.querySelectorAll('input, select, textarea')).filter(el => {
            const label = this.getLabelText(el);
            return label.includes(pattern);
        });
    }

    parseDate(dateStr) {
        if (!dateStr) return { month: '', year: '' };
        // YYYY-MM
        const parts = dateStr.split('-');
        return { year: parts[0], month: parts[1] };
    }
}
