/**
 * Module 5: ControlManager
 * Quan ly sidebar panels dong - tao, an/hien, xoa panels tu config.
 * Khong phu thuoc MapApp - co the dung doc lap.
 */
class ControlManager {
    /**
     * @param {string} containerId - ID cua sidebar container element
     * @param {Object} options - Tuy chon
     */
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.panels = new Map();
        this.options = {
            panelClass: "card shadow-sm mb-2",
            ...options,
        };
    }

    /**
     * Dang ky 1 panel
     * @param {Object} config
     * @param {string} config.id - ID duy nhat cua panel
     * @param {string} config.title - Tieu de hien thi
     * @param {string} config.icon - Bootstrap icon class (VD: "bi-funnel-fill")
     * @param {string} config.iconColor - CSS class mau icon (VD: "text-primary")
     * @param {boolean} config.collapsed - Thu gon mac dinh (default: true)
     * @param {boolean} config.collapsible - Cho phep thu gon (default: true)
     * @param {number} config.order - Thu tu hien thi
     * @param {string} config.bodyClass - CSS class cho body (default: "card-body")
     * @param {Function} config.render - Callback render noi dung: (bodyEl) => void
     */
    registerPanel(config) {
        this.panels.set(config.id, {
            collapsed: true,
            collapsible: true,
            order: 0,
            bodyClass: "card-body",
            ...config,
        });
    }

    /**
     * Render tat ca panels ra DOM theo thu tu order
     */
    render() {
        if (!this.container) return;
        this.container.innerHTML = "";

        const sorted = [...this.panels.values()].sort(
            (a, b) => (a.order || 0) - (b.order || 0),
        );

        sorted.forEach((panel) => {
            const card = this._createPanelCard(panel);
            this.container.appendChild(card);
        });
    }

    /**
     * Tao 1 panel card element
     * @private
     */
    _createPanelCard(panel) {
        const card = document.createElement("div");
        card.className = this.options.panelClass;
        card.id = `panel-${panel.id}`;

        // Header
        const header = document.createElement("div");
        header.className = "card-header py-1";

        if (panel.collapsible !== false) {
            header.setAttribute("role", "button");
            header.setAttribute("data-bs-toggle", "collapse");
            header.setAttribute("data-bs-target", `#${panel.id}-body`);
        }

        header.innerHTML = `<h6 class="mb-0 small"><i class="bi ${panel.icon} ${panel.iconColor || ""}"></i> ${panel.title}</h6>`;

        // Collapse wrapper
        const collapseWrapper = document.createElement("div");
        if (panel.collapsible !== false) {
            collapseWrapper.className = `collapse${panel.collapsed === false ? " show" : ""}`;
            collapseWrapper.id = `${panel.id}-body`;
        } else {
            collapseWrapper.id = `${panel.id}-body`;
        }

        // Body
        const body = document.createElement("div");
        body.className = panel.bodyClass || "card-body";
        body.id = `${panel.id}-content`;

        collapseWrapper.appendChild(body);
        card.appendChild(header);
        card.appendChild(collapseWrapper);

        // Luu reference
        panel._contentEl = body;
        panel._cardEl = card;

        // Goi render callback
        if (typeof panel.render === "function") {
            panel.render(body);
        }

        return card;
    }

    /**
     * Lay content element cua 1 panel
     * @param {string} panelId
     * @returns {HTMLElement|null}
     */
    getPanelContent(panelId) {
        const panel = this.panels.get(panelId);
        return panel?._contentEl || null;
    }

    /**
     * An/hien 1 panel
     * @param {string} panelId
     * @param {boolean} visible - true = hien, false = an
     */
    togglePanel(panelId, visible) {
        const panel = this.panels.get(panelId);
        if (panel?._cardEl) {
            panel._cardEl.style.display = visible === false ? "none" : "";
        }
    }

    /**
     * Xoa 1 panel khoi DOM
     * @param {string} panelId
     */
    removePanel(panelId) {
        const panel = this.panels.get(panelId);
        if (panel?._cardEl) {
            panel._cardEl.remove();
        }
        this.panels.delete(panelId);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = "";
        }
        this.panels.clear();
    }
}
