const SCROLL_PANEL_SELECTORS = [
    '.side-panel-tab-panels',
    '.create-layout-card-body',
    '.layout-objects-panel',
    '.object-details-modal-body',
    '.object-details-log-list',
    '.asset-library-modal-body',
    '.saved-asset-list',
    '.edit-object-panel-body',
    '.home-section-body',
    '.profile-layout-grid',
    '.notification-panel-body',
    '.messages-sidebar',
    '.messages-thread-body',
    '.scene-settings-modal',
];

export function bindScrollPanel(element) {
    if (!element || element.dataset.scrollPanelBound === 'true') return;
    element.dataset.scrollPanelBound = 'true';
    element.classList.add('scroll-panel');
}

export function initScrollPanels(root = document) {
    SCROLL_PANEL_SELECTORS.forEach((selector) => {
        if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) {
            bindScrollPanel(root);
        }
        (root.querySelectorAll?.(selector) ?? []).forEach(bindScrollPanel);
    });
}

export function observeScrollPanels(root = document.body) {
    initScrollPanels(root);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                initScrollPanels(node);
            });
        });
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
}
