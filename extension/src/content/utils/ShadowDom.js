/**
 * Recursively searches for inputs within a root element,
 * traversing into Open Shadow Roots.
 * 
 * @param {Element|ShadowRoot} root 
 * @returns {Array<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>}
 */
export function findAllInputs(root) {
    let inputs = [];
    if (!root) return inputs;

    // Standard inputs in this root
    const standardInputs = root.querySelectorAll('input, textarea, select');
    inputs = [...inputs, ...Array.from(standardInputs)];

    // Find all elements that might have a shadow root
    // Note: We can't querySelector for shadow roots, so we traverse all elements
    // This can be expensive, so we try to be smart or generic.
    // A generic approach:
    const allElements = root.querySelectorAll('*');

    for (const el of allElements) {
        if (el.shadowRoot) {
            inputs = [...inputs, ...findAllInputs(el.shadowRoot)];
        }
    }

    return inputs;
}

/**
 * Recursively gets text content, traversing Shadow Roots.
 * @param {Element|ShadowRoot} root
 * @returns {string}
 */
export function collectAllText(root) {
    let text = '';
    if (!root) return text;

    // Get direct text nodes? 
    // Easier: get innerText of current, but that ignores shadow.
    // So we iterate children.

    // For simplicity in this context, we can clone and flatten, 
    // or just walk the tree. Walking is safer.

    // However, innerText on a node DOES NOT include shadow root content.
    // So we need to:
    // 1. Get text of non-slot, non-shadow children.
    // 2. Recurse into shadow roots.

    // A simplified approach: traverse all nodes.
    const treeWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        { acceptNode: () => NodeFilter.FILTER_ACCEPT }
    );

    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            text += currentNode.textContent + ' ';
        } else if (currentNode.shadowRoot) {
            text += collectAllText(currentNode.shadowRoot) + ' ';
        }
        currentNode = treeWalker.nextNode();
    }

    // Cleanup whitespace
    return text.replace(/\s+/g, ' ');
}
