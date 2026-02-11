export const FIELD_MAPPINGS = {
    firstName: ['first name', 'firstname', 'fname', 'given name'],
    lastName: ['last name', 'lastname', 'lname', 'surname', 'family name'],
    email: ['email', 'e-mail'],
    phone: ['phone', 'mobile', 'cell', 'contact number'],
    linkedin: ['linkedin', 'linked in'],
    portfolio: ['portfolio', 'website', 'personal site'],
    resume: ['resume', 'cv', 'curriculum vitae'],
    coverLetter: ['cover letter', 'coverletter'],
    school: ['school', 'university', 'college', 'institution', 'alma mater'],
    degree: ['degree', 'qualification', 'major'],
    company: ['company', 'organization', 'employer', 'work experience'],
    title: ['job title', 'title', 'role', 'position'],
    startDate: ['start date', 'from', 'start'],
    endDate: ['end date', 'to', 'end'],
    location: ['location', 'city', 'address'],
    currentRole: ['current role', 'current position'],
    description: ['description', 'responsibilities', 'duties', 'summary', 'accomplishments'],
    gender: ['gender', 'sex', 'how do you identify'],
    race: ['race', 'ethnicity', 'latino', 'hispanic'],
    veteran: ['veteran', 'active duty', 'armed forces'],
    disability: ['disability', 'handicapped', 'impairment']
};

export const getFieldType = (element) => {
    // 1. Collect potential label sources
    const attributes = [
        element.id,
        element.name,
        element.getAttribute('aria-label'),
        element.placeholder,
    ].filter(Boolean).map(s => s.toLowerCase());

    // 2. Find label text (the most reliable source for display)
    let labelText = '';

    // Check explicit label for
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) labelText = label.innerText;
    }

    // Check aria-labelledby
    if (!labelText && element.getAttribute('aria-labelledby')) {
        const labelId = element.getAttribute('aria-labelledby');
        const label = document.getElementById(labelId);
        if (label) labelText = label.innerText;
    }

    // Check parent label (implicit)
    if (!labelText) {
        const parentLabel = element.closest('label');
        if (parentLabel) labelText = parentLabel.innerText;
    }

    // Clean up label text
    const cleanLabel = labelText ? labelText.toLowerCase().trim() : '';

    if (cleanLabel) attributes.push(cleanLabel);

    // 3. Match against mappings
    for (const [key, keywords] of Object.entries(FIELD_MAPPINGS)) {
        if (keywords.some(k => attributes.some(attr => attr.includes(k)))) {
            return { type: key, label: labelText || key };
        }
    }

    return { type: 'unknown', label: labelText };
};
