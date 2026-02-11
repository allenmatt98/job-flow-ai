import { HeuristicStrategy } from './HeuristicStrategy';
import { getFieldType } from '../heuristics';
import { SmartMatcher } from '../../utils/SmartMatcher';
import { waitForNewElements } from '../utils/DomWaiter';
import { markField, FillConfidence } from '../utils/FillFeedback';

const smartMatcher = new SmartMatcher();

export class GreenhouseStrategy extends HeuristicStrategy {
    constructor() {
        super('Greenhouse');
    }

    matches(hostname) {
        return hostname.includes('greenhouse.io');
    }

    async autofill(profile) {
        console.log('Starting Greenhouse Autofill (SmartMatcher Enabled)...');
        let count = 0;

        try {
            // 1. Standard Fill
            count += await super.autofill(profile);

            console.log('Post-Resume Wait (5s) for parsing...');
            await new Promise(r => setTimeout(r, 5000));

        } catch (e) {
            console.error('Standard autofill failed (non-fatal):', e);
        }

        // 2. Education
        if (profile.education && profile.education.length > 0) {
            try {
                console.log('Starting Education Section...');
                await this.scrollToSection('education');
                count += await this.fillComplexSection(
                    profile.education,
                    'education',
                    'school'
                );
            } catch (e) { console.error('Education failed:', e); }
        }

        // 3. Employment
        if (profile.experience && profile.experience.length > 0) {
            try {
                console.log('Starting Employment Section...');
                await this.scrollToSection('employment');
                count += await this.fillComplexSection(
                    profile.experience,
                    'employment',
                    'company'
                );
            } catch (e) { console.error('Employment failed:', e); }
        }

        // 4. Demographics
        try {
            console.log('Starting Demographics...');
            await this.scrollToSection('demographic');
            count += await this.fillDemographics(profile.userProfile);
        } catch (e) { console.error('Demographics failed:', e); }

        return count;
    }

    async scrollToSection(keyword) {
        const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, div.heading, .section-header'));
        const target = headers.find(h => h.innerText.toLowerCase().includes(keyword));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 500));
        }
    }

    async fillComplexSection(dataArray, sectionName, signatureType) {
        let count = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];

            // 1. ADD ANOTHER LOGIC
            let signatureFields = this.findFieldsByType(signatureType);

            if (i >= signatureFields.length) {
                console.log(`[Greenhouse] Adding row for ${sectionName} (index ${i})`);

                // Find the "Add another" button — try specific text first, then
                // fall back to generic "add another" within the section's fieldset/container
                const sectionHeader = Array.from(document.querySelectorAll('h1, h2, h3, h4, legend, .section-header'))
                    .find(h => h.innerText.toLowerCase().includes(sectionName));
                const sectionContainer = sectionHeader
                    ? (sectionHeader.closest('fieldset') || sectionHeader.parentElement)
                    : document;

                const buttons = Array.from(sectionContainer.querySelectorAll('a, button'));
                const addBtn = buttons.find(el => {
                    const t = el.innerText.toLowerCase().trim();
                    return (
                        t.includes(`add another ${sectionName}`) ||
                        t.includes(`add ${sectionName}`) ||
                        t === 'add another' ||
                        t.includes('add another')
                    ) && el.offsetParent !== null;
                });

                if (addBtn) {
                    // Find the container to observe for new elements
                    const container = addBtn.closest('fieldset')
                        || addBtn.closest('[id*="' + sectionName + '"]')
                        || sectionContainer;

                    // Determine selector for signature fields within this container
                    const selector = 'input, select, textarea';
                    const baselineCount = signatureFields.length;

                    addBtn.click();

                    // Wait for DOM mutation instead of fixed timeout
                    await waitForNewElements(container, selector, baselineCount);

                    // Small stabilization delay for React batched renders
                    await new Promise(r => setTimeout(r, 200));

                    signatureFields = this.findFieldsByType(signatureType);
                }
            }

            // 2. FILL FIELDS
            if (sectionName === 'education') {
                count += await this.fillSmartInput(i, 'school', item.school);
                count += await this.fillSmartDropdown(i, 'degree', item.degree);
                count += await this.fillAtIndex(i, 'startDate', { month: '', year: item.start });
                count += await this.fillAtIndex(i, 'endDate', { month: '', year: item.end });
            }
            else if (sectionName === 'employment') {
                count += await this.fillSmartInput(i, 'company', item.company);
                count += await this.fillSmartInput(i, 'title', item.title);
                count += await this.fillAtIndex(i, 'description', item.description);

                const startParams = this.parseDate(item.start);
                const endParams = this.parseDate(item.end);
                count += await this.fillAtIndex(i, 'startDate', startParams);
                count += await this.fillAtIndex(i, 'endDate', endParams);
            }
        }
        return count;
    }

    async fillSmartInput(index, fieldType, value) {
        if (!value) return 0;
        const matches = this.findFieldsByType(fieldType).filter(el => el.type !== 'hidden');
        const element = matches[index];

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const isCombobox = element.getAttribute('role') === 'combobox' ||
                element.className.includes('select') ||
                element.className.includes('chosen');

            if (isCombobox) {
                return await this.fillComboboxLikeWithFeedback(element, value);
            } else {
                await this.fillFieldWithTimeout(element, value);
                markField(element, FillConfidence.HIGH);
                return 1;
            }
        }
        return 0;
    }

    async fillSmartDropdown(index, fieldType, value) {
        if (!value) return 0;

        const matches = this.findFieldsByType(fieldType).filter(el => el.type !== 'hidden');
        const element = matches[index];

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Gather options if it's a native select
            let options = [];
            if (element.tagName.toLowerCase() === 'select') {
                options = Array.from(element.options).map(o => o.text);
            }

            if (options.length > 0) {
                const result = smartMatcher.findBestMatchTiered(value, options);
                console.log(`[SmartDropdown] '${value}' -> Tiered result:`, result);

                if (result) {
                    await this.fillFieldWithTimeout(element, result.match);
                    const confidence = result.confidence === 'high'
                        ? FillConfidence.HIGH
                        : FillConfidence.MEDIUM;
                    markField(element, confidence, `Matched "${value}" → "${result.match}" (${result.confidence}, ${result.score.toFixed(2)})`);
                    return 1;
                } else {
                    // No match — do NOT force fill
                    markField(element, FillConfidence.FAILED, `No match found for "${value}"`);
                    return 0;
                }
            }

            // Not a native select — try combobox-style fill
            return await this.fillComboboxLikeWithFeedback(element, value);
        }
        return 0;
    }

    async fillComboboxLikeWithFeedback(element, value) {
        try {
            element.focus();
            element.click();

            const proto = window.HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
            nativeSetter.call(element, value);

            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

            await new Promise(r => setTimeout(r, 800)); // Wait for dropdown results

            // Try to find the BEST option in the visible dropdown
            const visibleOptions = Array.from(document.querySelectorAll(
                '.select2-results__option, .select__option, [role="option"]'
            ));
            const optionTexts = visibleOptions.map(o => o.innerText);

            if (optionTexts.length > 0) {
                const result = smartMatcher.findBestMatchTiered(value, optionTexts);

                if (result) {
                    const bestOptionEl = visibleOptions.find(o => o.innerText === result.match);
                    if (bestOptionEl) {
                        bestOptionEl.click();
                        const confidence = result.confidence === 'high'
                            ? FillConfidence.HIGH
                            : FillConfidence.MEDIUM;
                        markField(element, confidence, `Matched "${value}" → "${result.match}" (${result.confidence})`);
                        return 1;
                    }
                }
            }

            // No match — clear the input and mark as failed (do NOT force Enter)
            nativeSetter.call(element, '');
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
            markField(element, FillConfidence.FAILED, `No dropdown match for "${value}"`);
            return 0;
        } catch (e) {
            console.warn('Combobox fill failed', e);
            markField(element, FillConfidence.FAILED, `Combobox error: ${e.message}`);
            return 0;
        }
    }

    async fillAtIndex(index, fieldType, value) {
        if (!value) return 0;
        const matches = this.findFieldsByType(fieldType).filter(el => el.type !== 'hidden');

        if (fieldType === 'startDate' || fieldType === 'endDate') {
            const monthMatches = matches.filter(el => this.getLabelText(el).includes('month'));
            const yearMatches = matches.filter(el => this.getLabelText(el).includes('year'));

            let c = 0;
            if (monthMatches[index] && value.month) {
                await this.fillFieldWithTimeout(monthMatches[index], value.month);
                markField(monthMatches[index], FillConfidence.HIGH);
                c++;
            }
            if (yearMatches[index] && value.year) {
                await this.fillFieldWithTimeout(yearMatches[index], value.year);
                markField(yearMatches[index], FillConfidence.HIGH);
                c++;
            }
            return c;
        }

        if (matches[index]) {
            await this.fillFieldWithTimeout(matches[index], value);
            markField(matches[index], FillConfidence.HIGH);
            return 1;
        }
        return 0;
    }

    async fillDemographics(userProfile) {
        let count = 0;
        const demoFields = ['gender', 'race', 'veteran', 'disability'];
        for (const type of demoFields) {
            if (userProfile[type]) {
                const matches = this.findFieldsByType(type);
                if (matches[0]) {
                    const element = matches[0];

                    // Use tiered matching for demographic selects
                    if (element.tagName.toLowerCase() === 'select') {
                        const options = Array.from(element.options).map(o => o.text);
                        const result = smartMatcher.findBestMatchTiered(userProfile[type], options);

                        if (result) {
                            await this.fillFieldWithTimeout(element, result.match);
                            const confidence = result.confidence === 'high'
                                ? FillConfidence.HIGH
                                : FillConfidence.MEDIUM;
                            markField(element, confidence, `Matched "${userProfile[type]}" → "${result.match}"`);
                            count++;
                        } else {
                            markField(element, FillConfidence.FAILED, `No match for "${userProfile[type]}"`);
                        }
                    } else {
                        await this.fillFieldWithTimeout(element, userProfile[type]);
                        markField(element, FillConfidence.HIGH);
                        count++;
                    }
                }
            }
        }
        return count;
    }

    findFieldsByType(type) {
        return Array.from(document.querySelectorAll('input, select, textarea')).filter(el => {
            if (el.type === 'hidden' || el.style.display === 'none') return false;
            return getFieldType(el).type === type;
        });
    }

    getLabelText(element) {
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
        return text ? text.toLowerCase() : '';
    }

    parseDate(dateStr) {
        if (!dateStr) return { month: '', year: '' };
        const parts = dateStr.split('-');
        return { year: parts[0], month: parts[1] };
    }
}
