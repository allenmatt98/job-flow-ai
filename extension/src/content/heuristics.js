export const FIELD_MAPPINGS = {
    firstName: ['first name', 'firstname', 'fname', 'given name'],
    lastName: ['last name', 'lastname', 'lname', 'surname', 'family name'],
    email: ['email', 'e-mail'],
    phone: ['phone', 'mobile', 'cell', 'contact number'],
    linkedin: ['linkedin', 'linked in'],
    portfolio: ['portfolio', 'website', 'personal site'],
    resume: ['resume', 'cv', 'curriculum vitae'],
    coverLetter: ['cover letter', 'coverletter']
};

export const getFieldType = (element) => {
    const attributes = [
        element.id,
        element.name,
        element.getAttribute('aria-label'),
        element.placeholder,
        // Label text needs to be found from a corresponding label tag
    ].filter(Boolean).map(s => s.toLowerCase());

    // Also check associated label
    let labelText = '';
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) labelText = label.innerText.toLowerCase();
    }
    // Or parent label
    const parentLabel = element.closest('label');
    if (parentLabel) labelText += ' ' + parentLabel.innerText.toLowerCase();

    if (labelText) attributes.push(labelText);

    for (const [key, keywords] of Object.entries(FIELD_MAPPINGS)) {
        if (keywords.some(k => attributes.some(attr => attr.includes(k)))) {
            return key;
        }
    }

    return 'unknown';
};
