/**
 * Converts a Base64 Data URL to a Blob
 */
export function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Automates file upload on a given input element
 * @param {HTMLInputElement} inputElement - The file input
 * @param {Object} resumeData - { name, data (base64), type }
 */
export function uploadResume(inputElement, resumeData) {
    if (!resumeData || !resumeData.data) {
        console.warn('Job Flow AI: No resume data found to upload.');
        return false;
    }

    try {
        const blob = dataURLtoBlob(resumeData.data);
        const file = new File([blob], resumeData.name, { type: resumeData.type });

        // Modern way to set files on an input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        inputElement.files = dataTransfer.files;

        // Trigger events so React/Angular frameworks detect the change
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Some sites verify 'focus' or 'blur'
        inputElement.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        inputElement.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

        console.log(`Job Flow AI: Uploaded ${resumeData.name}`);
        return true;
    } catch (e) {
        console.error('Job Flow AI: Upload failed', e);
        return false;
    }
}
