/**
 * DomWaiter — Promise-based MutationObserver utility.
 * Replaces fixed setTimeout delays when waiting for DOM changes
 * (e.g., after clicking "Add Another" in Greenhouse forms).
 */

/**
 * Waits for new elements matching `selector` to appear inside `container`.
 *
 * @param {Element} container - The parent element to observe
 * @param {string} selector - CSS selector for the elements to count
 * @param {number} baselineCount - Number of matching elements before the triggering action
 * @param {object} opts
 * @param {number} opts.timeoutMs - Max wait time before giving up (default 8000)
 * @param {number} opts.minNewElements - How many new elements must appear (default 1)
 * @returns {Promise<Element[]>} Resolves with array of ALL matching elements (including new ones)
 */
export function waitForNewElements(container, selector, baselineCount, {
    timeoutMs = 8000,
    minNewElements = 1
} = {}) {
    return new Promise((resolve) => {
        // Check immediately — the elements may already be there
        const current = container.querySelectorAll(selector);
        if (current.length >= baselineCount + minNewElements) {
            resolve(Array.from(current));
            return;
        }

        let settled = false;
        let timeoutHandle;

        const observer = new MutationObserver(() => {
            if (settled) return;
            const elements = container.querySelectorAll(selector);
            if (elements.length >= baselineCount + minNewElements) {
                settled = true;
                observer.disconnect();
                clearTimeout(timeoutHandle);
                resolve(Array.from(elements));
            }
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        // Safety-net timeout — resolve with whatever we have
        timeoutHandle = setTimeout(() => {
            if (settled) return;
            settled = true;
            observer.disconnect();
            console.warn(`[DomWaiter] Timed out after ${timeoutMs}ms waiting for new "${selector}" elements`);
            resolve(Array.from(container.querySelectorAll(selector)));
        }, timeoutMs);
    });
}
