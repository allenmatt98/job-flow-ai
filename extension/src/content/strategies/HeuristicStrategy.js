import { BaseStrategy } from './BaseStrategy';
import { FIELD_MAPPINGS, getFieldType } from '../heuristics';
import { uploadResume } from '../utils/FileUploader';
import { markField, FillConfidence } from '../utils/FillFeedback';

export class HeuristicStrategy extends BaseStrategy {
    constructor(name = 'Heuristic') {
        super(name);
        this.pageFields = [];
        this.isPaused = false;

        // Bind pause toggle
        window.addEventListener('JOB_FLOW_PAUSE_TOGGLE', (e) => {
            this.isPaused = e.detail.paused;
            console.log(`[Strategy] Paused: ${this.isPaused}`);
        });

        window.addEventListener('JOB_FLOW_STOP', () => {
            this.stopRequested = true;
        });
    }

    async waitIfPaused() {
        if (!this.isPaused) return;
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (!this.isPaused) {
                    clearInterval(check);
                    resolve();
                }
            }, 200);
        });
    }

    // Helper to update widget
    updateWidget(filled, total, status) {
        import('../ui/ProgressWidget.js').then(({ progressWidget }) => {
            progressWidget.update(filled, total, status);
        });
    }

    matches(hostname) {
        return true;
    }

    scan() {
        const inputs = document.querySelectorAll('input, textarea, select');
        const distinctFields = [];

        inputs.forEach(input => {
            // Allow hidden resume inputs, and file inputs generally even if hidden
            const isHidden = input.type === 'hidden' || input.style.display === 'none' || input.classList.contains('visually-hidden');
            if (isHidden && input.type !== 'file' && input.name !== 'resume') return;

            const fieldInfo = getFieldType(input);
            const { type, label } = fieldInfo;

            // Include if known type OR if it has a label (even if unknown)
            if (type !== 'unknown' || label) {
                // Avoid duplicates if possible, or just push all
                distinctFields.push({
                    element: input,
                    type: type,
                    label: label || type, // Fallback to type if label missing
                    currentValue: input.value
                });

                // Visual highlight
                try {
                    if (!isHidden) markField(input, FillConfidence.SCANNED);
                } catch (e) { }
            }
        });

        this.pageFields = distinctFields;
        // Return a simplified list for the UI
        return distinctFields.map(f => ({
            type: f.label || f.type, // Prefer label for display 
            tagName: f.element.tagName,
            standardType: f.type // Keep internal type for logic
        }));
    }

    async autofill(profile) {
        let filledCount = 0;
        console.log('Starting Heuristic Autofill...');
        this.stopRequested = false;

        // Initialize Widget
        this.updateWidget(0, this.pageFields.length, 'Autofilling...');

        // Pass 1: Profile data fill
        for (const [index, field] of this.pageFields.entries()) {
            if (this.stopRequested) {
                this.updateWidget(filledCount, this.pageFields.length, 'Stopped');
                return filledCount;
            }

            try {
                // Check Pause State
                await this.waitIfPaused();

                // update widget progress
                this.updateWidget(filledCount, this.pageFields.length, `Filling ${field.label}...`);

                // Safety Bubble: Each field runs independently
                if (field.type !== 'unknown' && profile.userProfile && profile.userProfile[field.type]) {
                    const val = profile.userProfile[field.type];
                    // Sequential Execution: Wait for this field to finish
                    await this.fillFieldWithTimeout(field.element, val);
                    markField(field.element, FillConfidence.HIGH);
                    filledCount++;
                }
                else if (field.type === 'resume' && profile.resume) {
                    console.log('Uploading resume...');
                    const success = uploadResume(field.element, profile.resume);
                    if (success) filledCount++;
                }
            } catch (err) {
                // Never stop the flow
                console.error(`Failed to fill field ${field.label || field.type}:`, err);
                markField(field.element, FillConfidence.FAILED, `Fill failed: ${err.message}`);
            }
        }

        // Pass 2: Memory recall for unknown fields
        try {
            const { recallAnswer } = await import('../../utils/AnswerMemory.js');
            const unknownFields = this.pageFields.filter(f =>
                f.type === 'unknown' && f.label && !f.element.value
            );

            for (const field of unknownFields) {
                try {
                    const recalled = await recallAnswer(field.label);
                    if (recalled) {
                        await this.fillFieldWithTimeout(field.element, recalled.answer);
                        const confidence = recalled.confidence === 'high'
                            ? FillConfidence.HIGH
                            : FillConfidence.MEDIUM;
                        markField(field.element, confidence, `Memory: "${recalled.answer}"`);
                        filledCount++;
                    }
                } catch (err) {
                    console.error(`Memory fill failed for "${field.label}":`, err);
                }
            }
        } catch (err) {
            console.error('Memory recall module load failed:', err);
        }

        // Pass 3: LLM-generated answers for remaining empty unknown text fields
        try {
            const remainingFields = this.pageFields.filter(f =>
                f.type === 'unknown' && f.label && !f.element.value &&
                (f.element.tagName.toLowerCase() === 'input' && (f.element.type === 'text' || f.element.type === '') ||
                 f.element.tagName.toLowerCase() === 'textarea')
            );

            if (remainingFields.length > 0) {
                const { answerQuestion } = await import('../../utils/api.js');
                const { getProfile } = await import('../../utils/storage.js');
                const stored = await getProfile();
                const userProfile = stored?.userProfile || {};
                const jobDescription = document.body.innerText.substring(0, 3000);

                for (const field of remainingFields) {
                    if (this.stopRequested) break;
                    await this.waitIfPaused();

                    try {
                        this.updateWidget(filledCount, this.pageFields.length, `AI: ${field.label.substring(0, 30)}...`);

                        const fieldType = field.element.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text';
                        const result = await answerQuestion({
                            question: field.label,
                            fieldType,
                            userProfile,
                            jobDescription,
                            maxLength: field.element.maxLength > 0 ? field.element.maxLength : undefined
                        });

                        if (result?.answer) {
                            await this.fillFieldWithTimeout(field.element, result.answer);
                            markField(field.element, FillConfidence.MEDIUM, `AI: "${result.answer.substring(0, 50)}..."`);
                            filledCount++;
                        }
                    } catch (err) {
                        console.error(`LLM fill failed for "${field.label}":`, err);
                    }
                }
            }
        } catch (err) {
            console.error('LLM pass module load failed (non-fatal):', err);
        }

        return filledCount;
    }

    async fillFieldWithTimeout(element, value, timeoutMs = 3000) {
        // Enforce Timeout: If interaction takes > 3s, give up on this field
        const fillPromise = this.fillField(element, value);

        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
        });

        return Promise.race([fillPromise, timeoutPromise])
            .finally(() => clearTimeout(timeoutHandle));
    }

    async fillField(element, value) {
        if (!element || value === undefined || value === null) return;

        const tagName = element.tagName.toLowerCase();
        const type = (element.type || '').toLowerCase();
        const role = (element.getAttribute('role') || '').toLowerCase();

        // Handle Select / Dropdowns
        if (tagName === 'select') {
            this.fillSelect(element, value);
        }
        // Handle Checkboxes
        else if (type === 'checkbox') {
            this.fillCheckbox(element, value);
        }
        // Handle Radio Buttons
        else if (type === 'radio') {
            this.fillRadio(element, value);
        }
        // Handle Comboboxes (React Select, etc.)
        else if (role === 'combobox' || element.classList.contains('select__input')) {
            await this.fillCombobox(element, value);
        }
        // Handle Standard Inputs
        else {
            this.fillStandardInput(element, value);
        }
    }

    fillStandardInput(element, value) {
        element.focus();

        // React Hack: Call native value setter to trigger internal state update
        const proto = element.tagName.toLowerCase() === 'textarea'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeInputValueSetter.call(element, value);

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    async fillCombobox(element, value) {
        element.focus();
        element.click();

        // 1. Try setting value + input event (fastest) via React Hack
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Wait for dropdown
        await new Promise(r => setTimeout(r, 800));

        // Try to find an option to click
        // React-select usually puts options in a portal or nearby
        const options = Array.from(document.querySelectorAll('[role="option"], .select__option'));
        const match = options.find(opt => opt.innerText.toLowerCase().includes(String(value).toLowerCase()));

        if (match) {
            match.click();
        } else {
            // Fallback: Just hit Enter
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
    }

    fillSelect(element, value) {
        const options = Array.from(element.options);
        const lowerValue = String(value).toLowerCase();

        // 1. Exact Match
        let match = options.find(opt => opt.value.toLowerCase() === lowerValue || opt.text.toLowerCase() === lowerValue);

        // 2. Partial Match
        if (!match) {
            match = options.find(opt => opt.text.toLowerCase().includes(lowerValue));
        }

        if (match) {
            element.value = match.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    fillCheckbox(element, value) {
        // If value is boolean true, or string 'true'/'yes', or strictly matches label logic if implemented
        const shouldCheck = value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';

        if (element.checked !== shouldCheck) {
            element.click(); // Click is often better for checkboxes to trigger events
            // Fallback if click didn't work
            if (element.checked !== shouldCheck) {
                element.checked = shouldCheck;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    fillRadio(element, value) {
        // Radio is usually part of a group.
        // We probably passed the specific radio button here?
        // If we passed one radio button, we might need to find its group if the value doesn't match THIS button.
        // But simplified: if the value matches this button's value/label, click it.
        const valStr = String(value).toLowerCase();
        if (element.value.toLowerCase() === valStr || (element.nextSibling && element.nextSibling.textContent && element.nextSibling.textContent.toLowerCase() === valStr)) {
            element.click();
        }
    }

    /**
     * Capture current values of unknown fields for saving to memory.
     * @returns {Array<{question: string, answer: string, fieldTag: string}>}
     */
    captureUnknownAnswers() {
        const entries = [];

        for (const field of this.pageFields) {
            if (field.type !== 'unknown' || !field.label) continue;

            const el = field.element;
            const tag = el.tagName.toLowerCase();
            let answer = '';

            if (tag === 'select') {
                const selected = el.options[el.selectedIndex];
                // Skip if default/placeholder option (index 0 with empty value)
                if (selected && el.selectedIndex > 0) {
                    answer = selected.text.trim();
                }
            } else if (el.type === 'radio') {
                // Find the checked radio in the same group
                if (el.name) {
                    const checked = document.querySelector(`input[name="${el.name}"]:checked`);
                    if (checked) {
                        // Get label for the checked radio
                        const radioLabel = checked.nextSibling?.textContent?.trim()
                            || checked.closest('label')?.textContent?.trim()
                            || checked.value;
                        answer = radioLabel;
                    }
                }
            } else if (el.type === 'checkbox') {
                answer = el.checked ? 'Yes' : '';
            } else {
                answer = el.value.trim();
            }

            if (answer) {
                entries.push({
                    question: field.label,
                    answer,
                    fieldTag: tag
                });
            }
        }

        return entries;
    }
}
