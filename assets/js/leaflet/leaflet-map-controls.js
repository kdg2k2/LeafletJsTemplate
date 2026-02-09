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
                "leaflet-bar leaflet-control"
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
 * Automatically creates entire layout structure - HTML only needs <div id="map"></div>
 */
class SidebarLayoutManager {
    /**
     * @param {Object} config
     * @param {L.Map} config.map - Leaflet map instance
     * @param {string} config.mapContainerId - ID of map div
     * @param {string} config.sidebarContentId - ID of sidebar content element
     * @param {string} [config.offcanvasId="sidebar-offcanvas"] - ID for offcanvas element
     */
    constructor({ map, mapContainerId, sidebarContentId, offcanvasId }) {
        this.map = map;
        this.mapContainerId = mapContainerId;
        this.sidebarContentId = sidebarContentId;
        this.offcanvasId = offcanvasId || "sidebar-offcanvas";

        // Generated element IDs
        this.rowId = `${mapContainerId}-row`;
        this.mapColId = `${mapContainerId}-col`;
        this.sidebarColId = `${mapContainerId}-sidebar-col`;

        this.offcanvasElement = null;
        this.bsOffcanvas = null;
        this.isPinnedState = false;
        this.unpinButton = null;

        // Store original map parent for cleanup
        this.originalMapParent = null;
        this.createdElements = [];
    }

    /**
     * Initialize the sidebar layout manager
     * Creates entire layout structure and offcanvas
     */
    init() {
        this._createLayoutStructure();
        this._createOffcanvas();
        this._setupDefaultLayout();
        this._setupEventListeners();
    }

    /**
     * Create the row/col layout structure dynamically
     * Wraps #map in a Bootstrap grid layout
     * @private
     */
    _createLayoutStructure() {
        const mapDiv = document.getElementById(this.mapContainerId);
        if (!mapDiv) {
            console.error(`Map container #${this.mapContainerId} not found`);
            return;
        }

        // Create row wrapper
        const row = document.createElement("div");
        row.id = this.rowId;
        row.className = "row g-2";

        // Create map column
        const mapCol = document.createElement("div");
        mapCol.id = this.mapColId;
        mapCol.className = "col-12"; // Fullscreen by default

        // Wrap the map card if it exists, or create one
        const mapCard = mapDiv.closest(".card");
        if (mapCard) {
            // Store original parent (container of the card)
            this.originalMapParent = mapCard.parentElement;

            // Move entire card into map column
            mapCard.parentNode.removeChild(mapCard);
            mapCol.appendChild(mapCard);
        } else {
            // Store original parent (container of the map div)
            this.originalMapParent = mapDiv.parentElement;

            // Just move map div into column
            mapDiv.parentNode.removeChild(mapDiv);
            mapCol.appendChild(mapDiv);
        }

        // Create sidebar column (hidden by default)
        const sidebarCol = document.createElement("div");
        sidebarCol.id = this.sidebarColId;
        sidebarCol.className = "col-lg-4";
        sidebarCol.style.display = "none";

        // Create panel-scroll wrapper inside sidebar column
        const panelScroll = document.createElement("div");
        panelScroll.className = "panel-scroll";
        sidebarCol.appendChild(panelScroll);

        // Assemble structure
        row.appendChild(mapCol);
        row.appendChild(sidebarCol);

        // Insert row in place of original structure
        this.originalMapParent.appendChild(row);

        // Track created elements for cleanup
        this.createdElements.push(row);
    }

    /**
     * Create offcanvas element and Bootstrap instance
     * @private
     */
    _createOffcanvas() {
        // Create offcanvas structure
        const offcanvas = document.createElement("div");
        offcanvas.className = "offcanvas offcanvas-end";
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

        // Append into layout parent (not document.body)
        // so offcanvas works inside fullscreen context
        this.originalMapParent.appendChild(offcanvas);

        this.offcanvasElement = offcanvas;
        this.bsOffcanvas = new bootstrap.Offcanvas(offcanvas, {
            backdrop: false,  // No backdrop - allow map interaction
            scroll: true      // Allow scrolling body (map) while offcanvas open
        });

        // Track for cleanup
        this.createdElements.push(offcanvas);
    }

    /**
     * Set up default layout: fullscreen map, sidebar in offcanvas
     * @private
     */
    _setupDefaultLayout() {
        // Sidebar element should already exist (created by MapApp._ensureSidebarElement)
        const sidebarContent = document.getElementById(this.sidebarContentId);
        const offcanvasBody = document.getElementById(
            `${this.offcanvasId}-body`
        );
        const mapCol = document.getElementById(this.mapColId);
        const sidebarCol = document.getElementById(this.sidebarColId);

        if (!sidebarContent) {
            console.error(`Sidebar element #${this.sidebarContentId} not found. Ensure _ensureSidebarElement() runs before _initMapControls().`);
            return;
        }

        if (!offcanvasBody) {
            console.error("Offcanvas body not found");
            return;
        }

        // Move sidebar content into offcanvas
        offcanvasBody.appendChild(sidebarContent);

        // Ensure fullscreen layout
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
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);
        });

        this.offcanvasElement.addEventListener("hidden.bs.offcanvas", () => {
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
     * Close the offcanvas
     */
    closeOffcanvas() {
        if (this.bsOffcanvas) {
            this.bsOffcanvas.hide();
        }
    }

    /**
     * Pin the sidebar to a fixed column layout
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

        if (this.bsOffcanvas) {
            this.bsOffcanvas.hide();
        }

        const panelScroll = sidebarCol.querySelector(".panel-scroll");
        if (!panelScroll) {
            console.error("panel-scroll not found");
            return;
        }

        panelScroll.appendChild(sidebarContent);

        this._createUnpinButton();
        if (this.unpinButton) {
            sidebarContent.insertBefore(
                this.unpinButton,
                sidebarContent.firstChild
            );
        }

        mapCol.className = "col-lg-8";
        sidebarCol.className = "col-lg-4";
        sidebarCol.style.display = "";

        this.isPinnedState = true;

        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }

    /**
     * Unpin the sidebar back to offcanvas mode
     */
    unpin() {
        if (!this.isPinnedState) return;

        const sidebarContent = document.getElementById(this.sidebarContentId);
        const offcanvasBody = document.getElementById(
            `${this.offcanvasId}-body`
        );
        const mapCol = document.getElementById(this.mapColId);
        const sidebarCol = document.getElementById(this.sidebarColId);

        if (!sidebarContent || !offcanvasBody) {
            console.error("Required elements not found for unpinning");
            return;
        }

        if (this.unpinButton && this.unpinButton.parentNode) {
            this.unpinButton.parentNode.removeChild(this.unpinButton);
            this.unpinButton = null;
        }

        offcanvasBody.appendChild(sidebarContent);

        if (mapCol) {
            mapCol.className = "col-12";
        }
        if (sidebarCol) {
            sidebarCol.style.display = "none";
        }

        this.isPinnedState = false;

        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }

    /**
     * Create the unpin button
     * @private
     */
    _createUnpinButton() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "sidebar-unpin-btn";
        btn.className = "btn btn-sm btn-outline-secondary w-100 mb-2";
        btn.innerHTML =
            '<i class="bi bi-pin-angle-fill"></i> Bỏ ghim sidebar';
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
     * Destroy and cleanup
     */
    destroy() {
        // Move sidebar content back if needed
        const sidebarContent = document.getElementById(this.sidebarContentId);
        if (sidebarContent && this.originalMapParent) {
            this.originalMapParent.appendChild(sidebarContent);
        }

        if (this.bsOffcanvas) {
            this.bsOffcanvas.dispose();
            this.bsOffcanvas = null;
        }

        this.createdElements.forEach((el) => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        this.createdElements = [];

        if (this.unpinButton && this.unpinButton.parentNode) {
            this.unpinButton.parentNode.removeChild(this.unpinButton);
            this.unpinButton = null;
        }

        this.offcanvasElement = null;
    }
}
