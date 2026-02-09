// ========================================
// MAP CONTROL BUTTONS & SIDEBAR LAYOUT MANAGER
// ========================================

/**
 * Factory function to create custom map control buttons
 * @param {L.Map} map - Leaflet map instance
 * @param {Array<{id, icon, title, onClick}>} buttonConfigs - Button configurations
 * @param {Object} options - Control options { position: 'topleft' }
 * @returns {L.Control}
 */
function createMapControlButtons(map, buttonConfigs, options = {}) {
    const CustomControl = L.Control.extend({
        options: {
            position: options.position || "topleft",
        },
        onAdd(_map) {
            const container = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control",
            );
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            buttonConfigs.forEach((cfg) => {
                const a = L.DomUtil.create("a", "", container);
                a.href = "#";
                a.id = cfg.id || "";
                a.title = cfg.title || "";
                a.innerHTML = `<i class="${cfg.icon}"></i>`;
                a.style.width = "30px";
                a.style.height = "30px";
                a.style.lineHeight = "30px";
                a.style.display = "flex";
                a.style.alignItems = "center";
                a.style.justifyContent = "center";

                L.DomEvent.on(a, "click", (e) => {
                    L.DomEvent.preventDefault(e);
                    cfg.onClick?.(e, a);
                });
            });

            return container;
        },
    });

    const ctrl = new CustomControl();
    map.addControl(ctrl);
    return ctrl;
}

/**
 * SidebarLayoutManager - Manages sidebar layout between offcanvas and pinned modes
 * Handles DOM movement without cloning (preserving events and state)
 */
class SidebarLayoutManager {
    /**
     * @param {Object} config
     * @param {L.Map} config.map - Leaflet map instance
     * @param {string} config.mapColId - ID of map column element
     * @param {string} config.sidebarColId - ID of sidebar column element
     * @param {string} config.sidebarContentId - ID of sidebar content element
     * @param {string} [config.offcanvasId="sidebar-offcanvas"] - ID for offcanvas element
     */
    constructor({
        map,
        mapColId,
        sidebarColId,
        sidebarContentId,
        offcanvasId,
    }) {
        this.map = map;
        this.mapColId = mapColId;
        this.sidebarColId = sidebarColId;
        this.sidebarContentId = sidebarContentId;
        this.offcanvasId = offcanvasId || "sidebar-offcanvas";

        this.offcanvasElement = null;
        this.bsOffcanvas = null;
        this.isPinnedState = false;
        this.unpinButton = null;
    }

    /**
     * Initialize the sidebar layout manager
     * Creates offcanvas and sets up default layout (fullscreen map)
     */
    init() {
        this._createOffcanvas();
        this._setupDefaultLayout();
        this._setupEventListeners();
    }

    /**
     * Create offcanvas element and Bootstrap instance
     * @private
     */
    _createOffcanvas() {
        // Create offcanvas structure
        const offcanvas = document.createElement("div");
        offcanvas.className = "offcanvas offcanvas-start";
        offcanvas.id = this.offcanvasId;
        offcanvas.setAttribute("tabindex", "-1");
        offcanvas.style.width = "400px";
        offcanvas.style.maxWidth = "90vw";

        // Header
        const header = document.createElement("div");
        header.className = "offcanvas-header py-2 border-bottom";

        const title = document.createElement("h6");
        title.className = "mb-0";
        title.innerHTML = '<i class="bi bi-tools text-primary"></i> Công cụ';

        const buttonGroup = document.createElement("div");
        buttonGroup.className = "ms-auto d-flex align-items-center gap-1";

        // Pin button
        const pinBtn = document.createElement("button");
        pinBtn.type = "button";
        pinBtn.id = "sidebar-pin-btn";
        pinBtn.className = "btn btn-sm btn-outline-primary";
        pinBtn.title = "Ghim sidebar";
        pinBtn.innerHTML = '<i class="bi bi-pin-angle"></i>';
        pinBtn.addEventListener("click", () => this.pin());

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "btn-close";
        closeBtn.setAttribute("data-bs-dismiss", "offcanvas");
        closeBtn.setAttribute("aria-label", "Close");

        buttonGroup.appendChild(pinBtn);
        buttonGroup.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(buttonGroup);

        // Body
        const body = document.createElement("div");
        body.className = "offcanvas-body p-2";
        body.id = `${this.offcanvasId}-body`;

        offcanvas.appendChild(header);
        offcanvas.appendChild(body);
        document.body.appendChild(offcanvas);

        this.offcanvasElement = offcanvas;
        this.bsOffcanvas = new bootstrap.Offcanvas(offcanvas);
    }

    /**
     * Set up default layout: fullscreen map, sidebar in offcanvas
     * @private
     */
    _setupDefaultLayout() {
        const sidebarContent = document.getElementById(this.sidebarContentId);
        const offcanvasBody = document.getElementById(
            `${this.offcanvasId}-body`,
        );
        const mapCol = document.getElementById(this.mapColId);
        const sidebarCol = document.getElementById(this.sidebarColId);

        if (!sidebarContent || !offcanvasBody) {
            console.error("Sidebar content or offcanvas body not found");
            return;
        }

        // Move sidebar content into offcanvas
        offcanvasBody.appendChild(sidebarContent);

        // Set fullscreen layout
        if (mapCol) {
            mapCol.className = "col-12";
        }
        if (sidebarCol) {
            sidebarCol.style.display = "none";
        }

        this.isPinnedState = false;
    }

    /**
     * Set up event listeners for offcanvas show/hide
     * @private
     */
    _setupEventListeners() {
        if (!this.offcanvasElement) return;

        this.offcanvasElement.addEventListener("shown.bs.offcanvas", () => {
            // Invalidate map size after offcanvas is shown
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);
        });

        this.offcanvasElement.addEventListener("hidden.bs.offcanvas", () => {
            // Invalidate map size after offcanvas is hidden
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);
        });
    }

    /**
     * Open the offcanvas sidebar
     */
    openOffcanvas() {
        if (this.bsOffcanvas && !this.isPinnedState) {
            this.bsOffcanvas.show();
        }
    }

    /**
     * Pin the sidebar to a fixed column layout
     * Moves from offcanvas to 2-column layout (map col-lg-8 + sidebar col-lg-4)
     */
    pin() {
        if (this.isPinnedState) return;

        const sidebarContent = document.getElementById(this.sidebarContentId);
        const sidebarCol = document.getElementById(this.sidebarColId);
        const mapCol = document.getElementById(this.mapColId);

        if (!sidebarContent || !sidebarCol || !mapCol) {
            console.error("Required elements not found for pinning");
            return;
        }

        // Close offcanvas first
        if (this.bsOffcanvas) {
            this.bsOffcanvas.hide();
        }

        // Find or create .panel-scroll wrapper in sidebar column
        let panelScroll = sidebarCol.querySelector(".panel-scroll");
        if (!panelScroll) {
            panelScroll = document.createElement("div");
            panelScroll.className = "panel-scroll";
            sidebarCol.appendChild(panelScroll);
        }

        // Move sidebar content to column
        panelScroll.appendChild(sidebarContent);

        // Create unpin button
        this._createUnpinButton();
        if (this.unpinButton) {
            sidebarContent.insertBefore(
                this.unpinButton,
                sidebarContent.firstChild,
            );
        }

        // Switch layout to 2-column
        mapCol.className = "col-lg-8";
        sidebarCol.className = "col-lg-4";
        sidebarCol.style.display = "";

        this.isPinnedState = true;

        // Invalidate map size after layout change
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }

    /**
     * Unpin the sidebar back to offcanvas mode
     * Moves from 2-column layout back to fullscreen map with offcanvas
     */
    unpin() {
        if (!this.isPinnedState) return;

        const sidebarContent = document.getElementById(this.sidebarContentId);
        const offcanvasBody = document.getElementById(
            `${this.offcanvasId}-body`,
        );
        const mapCol = document.getElementById(this.mapColId);
        const sidebarCol = document.getElementById(this.sidebarColId);

        if (!sidebarContent || !offcanvasBody) {
            console.error("Required elements not found for unpinning");
            return;
        }

        // Remove unpin button
        if (this.unpinButton && this.unpinButton.parentNode) {
            this.unpinButton.parentNode.removeChild(this.unpinButton);
            this.unpinButton = null;
        }

        // Move sidebar content back to offcanvas
        offcanvasBody.appendChild(sidebarContent);

        // Switch layout to fullscreen
        if (mapCol) {
            mapCol.className = "col-12";
        }
        if (sidebarCol) {
            sidebarCol.style.display = "none";
        }

        this.isPinnedState = false;

        // Invalidate map size after layout change
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }

    /**
     * Create the unpin button that appears at top of pinned sidebar
     * @private
     */
    _createUnpinButton() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "sidebar-unpin-btn";
        btn.className = "btn btn-sm btn-outline-secondary w-100 mb-2";
        btn.innerHTML = '<i class="bi bi-pin-angle-fill"></i> Bỏ ghim sidebar';
        btn.addEventListener("click", () => this.unpin());
        this.unpinButton = btn;
    }

    /**
     * Check if sidebar is currently pinned
     * @returns {boolean}
     */
    isPinned() {
        return this.isPinnedState;
    }

    /**
     * Destroy the sidebar layout manager and cleanup
     */
    destroy() {
        // Remove event listeners
        if (this.offcanvasElement) {
            this.offcanvasElement.removeEventListener(
                "shown.bs.offcanvas",
                null,
            );
            this.offcanvasElement.removeEventListener(
                "hidden.bs.offcanvas",
                null,
            );
        }

        // Dispose Bootstrap offcanvas
        if (this.bsOffcanvas) {
            this.bsOffcanvas.dispose();
            this.bsOffcanvas = null;
        }

        // Remove offcanvas element
        if (this.offcanvasElement && this.offcanvasElement.parentNode) {
            this.offcanvasElement.parentNode.removeChild(this.offcanvasElement);
            this.offcanvasElement = null;
        }

        // Remove unpin button if exists
        if (this.unpinButton && this.unpinButton.parentNode) {
            this.unpinButton.parentNode.removeChild(this.unpinButton);
            this.unpinButton = null;
        }
    }
}
