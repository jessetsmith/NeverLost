const SCROLL_AUTO_HIDE_SELECTORS = [
    '.side-panel',
    '.create-layout-card',
    '.layout-objects-panel',
    '.object-details-modal-body',
    '.object-details-log-list',
    '.asset-library-modal-body',
    '.saved-asset-list',
];

const scrollTimeouts = new WeakMap();

export function bindAutoHideScrollbar(element) {
    if (!element || element.dataset.scrollAutoHideBound === 'true') return;
    element.dataset.scrollAutoHideBound = 'true';
    element.classList.add('scroll-auto-hide');

    const onScroll = () => {
        element.classList.add('is-scrolling');
        const existing = scrollTimeouts.get(element);
        if (existing) clearTimeout(existing);
        scrollTimeouts.set(
            element,
            setTimeout(() => {
                element.classList.remove('is-scrolling');
                scrollTimeouts.delete(element);
            }, 800)
        );
    };

    element.addEventListener('scroll', onScroll, { passive: true });
}

export function initAutoHideScrollbars(root = document) {
    SCROLL_AUTO_HIDE_SELECTORS.forEach((selector) => {
        if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) {
            bindAutoHideScrollbar(root);
        }
        (root.querySelectorAll?.(selector) ?? []).forEach(bindAutoHideScrollbar);
    });
}

export function observeAutoHideScrollbars(root = document.body) {
    initAutoHideScrollbars(root);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                initAutoHideScrollbars(node);
            });
        });
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
}
