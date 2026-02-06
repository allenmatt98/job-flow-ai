import { BaseStrategy } from './BaseStrategy';
import { FIELD_MAPPINGS, getFieldType } from '../heuristics';
import { uploadResume } from '../utils/FileUploader';

export class HeuristicStrategy extends BaseStrategy {
    constructor(name = 'Heuristic') {
        super(name);
        this.pageFields = [];
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
                    if (!isHidden) input.style.border = '2px solid #3b82f6';
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

        for (const field of this.pageFields) {
            try {
                // Safety Bubble: Each field runs independently
                if (field.type !== 'unknown' && profile.userProfile && profile.userProfile[field.type]) {
                    const val = profile.userProfile[field.type];
                    // Sequential Execution: Wait for this field to finish
                    await this.fillFieldWithTimeout(field.element, val);
                    filledCount++;
                }
                else if (field.type === 'resume' && profile.resume) {
                    // Resume upload can take time, definitely await it or at least wrap in try-catch
                    // uploadResume is synchronous currently but might trigger events
                    console.log('Uploading resume...');
                    const success = uploadResume(field.element, profile.resume);
                    if (success) filledCount++;
                }
            } catch (err) {
                // Never stop the flow
                console.error(`Failed to fill field ${field.label || field.type}:`, err);
            }
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
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    async fillCombobox(element, value) {
        element.focus();
        element.click();

        // Try setting value + input event first (fastest)
        element.value = value;
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
}
