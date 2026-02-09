// ========================================
// MAP APPLICATION CLASS
// ========================================

/**
 * MapApp - Reusable map application class
 * Manages a complete map instance with WMS layers, points, and sketch tools
 *
 * @example
 * const app = new MapApp('map', {
 *     config: DEFAULT_MAP_CONFIG,
 * });
 * app.init();
 */
class MapApp {
    /**
     * @param {string} mapContainerId - ID of the map container element
     * @param {Object} options - Configuration options
     * @param {Object} options.config - Map configuration (from map-config.js)
     */
    constructor(mapContainerId, options = {}) {
        if (!document.getElementById(mapContainerId)) {
            throw new Error(`Map container #${mapContainerId} not found`);
        }

        this.containerId = mapContainerId;
        this.config = options.config || DEFAULT_MAP_CONFIG;

        // Auto-generate element IDs tu containerId
        const id = mapContainerId;
        this.elementIds = {
            provinceSelect: `${id}-province-select`,
            communeSelect: `${id}-commune-select`,
            wmsListContainer: `${id}-wms-list`,
            pointListContainer: `${id}-point-list`,
            pointCoordSystem: `${id}-point-coord-system`,
            pointCoord1: `${id}-point-coord1`,
            pointCoord2: `${id}-point-coord2`,
            pointCoord1Label: `${id}-point-coord1-label`,
            pointCoord2Label: `${id}-point-coord2-label`,
            pointName: `${id}-point-name`,
            sketchToggleBtn: `${id}-sketch-toggle-btn`,
            resetFilterBtn: `${id}-reset-filter-btn`,
            currentLocationBtn: `${id}-current-location-btn`,
        };

        // State
        this.filterScope = {
            province_c: null,
            commune_c: null,
        };

        // Managers
        this.map = null;
        this.wmsManager = null;
        this.pointManager = null;
        this.sketchManager = null;
        this.controlManager = null;
        this.sidebarLayoutManager = null;
        this._mapControlButtons = null;
        this.basemapOffcanvas = null;
        this.currentBasemapLayer = null;
        this.currentBasemapId = this.config.basemaps?.default || "googleSatellite";

        // Coordinate converter
        this.coordConverter = new CoordinateConverter();
        this.currentCoordSystem = "WGS84";
        this.geolocationWatchId = null;

        // Generate WMS layers
        this.wmsLayers = generateDefaultWMSLayers(this.config.wms.ranhgioiUrl);

        this._bindMethods();
    }

    /**
     * @private
     */
    _bindMethods() {
        this.handleProvinceChange = this.handleProvinceChange.bind(this);
        this.handleCommuneChange = this.handleCommuneChange.bind(this);
        this.wfsClickHandler = this.wfsClickHandler.bind(this);
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    async init() {
        this._initMap();
        this._initSidebar();
        this._initMapControls();
        this._initManagers();
        this._attachEventListeners();
        await this._loadInitialData();
    }

    /**
     * @private
     */
    _initMap() {
        const mapConfig = this.config.map;
        const tileConfig = this.config.tileLayer;

        // Create and store basemap layer
        this.currentBasemapLayer = L.tileLayer(tileConfig.url, tileConfig.options);

        this.map = L.map(this.containerId, {
            center: mapConfig.center || [0, 0],
            zoom: mapConfig.center ? mapConfig.zoom : 2,
            minZoom: mapConfig.minZoom,
            maxZoom: mapConfig.maxZoom,
            layers: [this.currentBasemapLayer],
        });

        // Create basemap selector offcanvas
        this._createBasemapOffcanvas();
    }

    /**
     * Tao sidebar panels dong bang ControlManager
     * @private
     */
    _initSidebar() {
        const sidebarConfig = this.config.sidebar;
        if (!sidebarConfig || !sidebarConfig.containerId) return;

        this.controlManager = new ControlManager(sidebarConfig.containerId);
        const panels = sidebarConfig.panels || {};

        // Panel 1: Loc theo dia gioi
        if (panels.filter?.enabled !== false) {
            this.controlManager.registerPanel({
                id: "filter",
                title: "Loc theo dia gioi",
                icon: "bi-funnel-fill",
                iconColor: "text-primary",
                collapsible: false,
                collapsed: false,
                order: panels.filter?.order || 1,
                render: (body) => this._renderFilterPanel(body),
            });
        }

        // Panel 2: Quan ly lop WMS
        if (panels.wms?.enabled !== false) {
            this.controlManager.registerPanel({
                id: "wms",
                title: "Quan ly lop WMS",
                icon: "bi-layers-fill",
                iconColor: "text-success",
                collapsible: true,
                collapsed: false,
                order: panels.wms?.order || 2,
                bodyClass: "card-body p-0",
                render: (body) => {
                    body.id = this.elementIds.wmsListContainer;
                },
            });
        }

        // Panel 3: Quan ly diem
        if (panels.points?.enabled !== false) {
            this.controlManager.registerPanel({
                id: "points",
                title: "Quan ly diem",
                icon: "bi-geo-fill",
                iconColor: "text-danger",
                collapsible: true,
                collapsed: true,
                order: panels.points?.order || 3,
                render: (body) => this._renderPointsPanel(body),
            });
        }

        // Panel 4: Ve va chinh sua
        if (panels.sketch?.enabled !== false) {
            this.controlManager.registerPanel({
                id: "sketch",
                title: "Ve va chinh sua",
                icon: "bi-pencil-square",
                iconColor: "text-warning",
                collapsible: true,
                collapsed: true,
                order: panels.sketch?.order || 4,
                render: (body) => this._renderSketchPanel(body),
            });
        }

        this.controlManager.render();
    }

    /**
     * Render noi dung panel Loc theo dia gioi
     * @private
     */
    _renderFilterPanel(body) {
        const ids = this.elementIds;

        body.innerHTML = `
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">Tinh / Thanh pho</label>
                <select class="form-select form-select-sm" id="${ids.provinceSelect}">
                    <option value="">[Chon tinh/thanh pho]</option>
                </select>
            </div>
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">Xa / Phuong</label>
                <select class="form-select form-select-sm" id="${ids.communeSelect}">
                    <option value="">[Chon xa/phuong]</option>
                </select>
            </div>
            <button class="btn btn-outline-secondary btn-sm w-100" id="${ids.resetFilterBtn}">
                <i class="bi bi-arrow-counterclockwise"></i> Xoa bo loc
            </button>
        `;

        body.querySelector(`#${ids.resetFilterBtn}`)
            .addEventListener("click", () => this.resetFilter());
    }

    /**
     * Render noi dung panel Quan ly diem
     * @private
     */
    _renderPointsPanel(body) {
        const ids = this.elementIds;

        body.innerHTML = `
            <div id="${ids.pointListContainer}" class="mb-2"></div>
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">He toa do</label>
                <select class="form-select form-select-sm" id="${ids.pointCoordSystem}">
                    <option value="WGS84">WGS84 (Kinh/Vi do)</option>
                </select>
            </div>
            <div class="row g-1 mb-2">
                <div class="col-6">
                    <label class="form-label small fw-semibold mb-1" id="${ids.pointCoord1Label}">Kinh do (Lng)</label>
                    <input type="number" step="any" class="form-control form-control-sm" id="${ids.pointCoord1}" placeholder="VD: 105.8542" />
                </div>
                <div class="col-6">
                    <label class="form-label small fw-semibold mb-1" id="${ids.pointCoord2Label}">Vi do (Lat)</label>
                    <input type="number" step="any" class="form-control form-control-sm" id="${ids.pointCoord2}" placeholder="VD: 21.0285" />
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">Ten diem</label>
                <input type="text" class="form-control form-control-sm" id="${ids.pointName}" placeholder="Ten diem" />
            </div>
            <div class="d-grid gap-1">
                <button class="btn btn-success btn-sm" id="${ids.currentLocationBtn}">
                    <i class="bi bi-geo-alt-fill"></i> Vi tri hien tai
                </button>
                <button class="btn btn-danger btn-sm" id="${this.containerId}-add-point-btn">
                    <i class="bi bi-plus-circle"></i> Them diem
                </button>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" id="${this.containerId}-toggle-points-btn">
                        <i class="bi bi-eye"></i> An/Hien
                    </button>
                    <button class="btn btn-outline-secondary" id="${this.containerId}-zoom-points-btn">
                        <i class="bi bi-arrows-fullscreen"></i> Xem tat ca
                    </button>
                    <button class="btn btn-outline-danger" id="${this.containerId}-clear-points-btn">
                        <i class="bi bi-trash"></i> Xoa het
                    </button>
                </div>
            </div>
        `;

        // Bind events
        const addBtn = body.querySelector(`#${this.containerId}-add-point-btn`);
        const toggleBtn = body.querySelector(`#${this.containerId}-toggle-points-btn`);
        const zoomBtn = body.querySelector(`#${this.containerId}-zoom-points-btn`);
        const clearBtn = body.querySelector(`#${this.containerId}-clear-points-btn`);
        const locationBtn = body.querySelector(`#${ids.currentLocationBtn}`);

        if (addBtn) addBtn.addEventListener("click", () => this._handleAddCustomPoint());
        if (toggleBtn) toggleBtn.addEventListener("click", () => this.toggleAllPoints());
        if (zoomBtn) zoomBtn.addEventListener("click", () => this.zoomToAllPoints());
        if (clearBtn) clearBtn.addEventListener("click", () => this.clearAllPoints());
        if (locationBtn) locationBtn.addEventListener("click", () => this._handleAddCurrentLocation());
    }

    /**
     * Render noi dung panel Ve va chinh sua
     * @private
     */
    _renderSketchPanel(body) {
        const ids = this.elementIds;

        body.innerHTML = `
            <button class="btn btn-warning btn-sm w-100" id="${ids.sketchToggleBtn}">
                <i class="bi bi-pencil"></i> Bat sketch tools
            </button>
        `;

        body.querySelector(`#${ids.sketchToggleBtn}`)
            .addEventListener("click", () => this.toggleSketchMode());
    }

    /**
     * Create basemap selector offcanvas
     * @private
     */
    _createBasemapOffcanvas() {
        const basemapsConfig = this.config.basemaps;
        if (!basemapsConfig?.options) return;

        // Create offcanvas element
        const offcanvas = document.createElement("div");
        offcanvas.className = "offcanvas offcanvas-end";
        offcanvas.id = "basemap-offcanvas";
        offcanvas.setAttribute("tabindex", "-1");

        offcanvas.innerHTML = `
            <div class="offcanvas-header">
                <h5 class="offcanvas-title">Chon nen ban do</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <div class="list-group" id="basemap-list">
                    ${basemapsConfig.options.map(basemap => `
                        <label class="list-group-item list-group-item-action" style="cursor: pointer;">
                            <input class="form-check-input me-2" type="radio" name="basemap-radio" value="${basemap.id}"
                                ${basemap.id === this.currentBasemapId ? 'checked' : ''}>
                            ${basemap.name}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(offcanvas);

        // Initialize Bootstrap offcanvas
        this.basemapOffcanvas = new bootstrap.Offcanvas(offcanvas);

        // Add event listeners for radio buttons
        offcanvas.querySelectorAll('input[name="basemap-radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchBasemap(e.target.value);
            });
        });
    }

    /**
     * Switch basemap layer
     * @param {string} basemapId - ID of basemap to switch to
     */
    switchBasemap(basemapId) {
        const basemapsConfig = this.config.basemaps;
        const basemap = basemapsConfig?.options.find(b => b.id === basemapId);

        if (!basemap || !this.currentBasemapLayer) return;

        // Remove current basemap
        this.map.removeLayer(this.currentBasemapLayer);

        // Add new basemap
        this.currentBasemapLayer = L.tileLayer(basemap.url, basemap.options);
        this.currentBasemapLayer.addTo(this.map);
        this.currentBasemapId = basemapId;

        // Move basemap to back (below WMS layers)
        this.currentBasemapLayer.bringToBack();
    }

    /**
     * Initialize map controls (buttons and sidebar layout manager)
     * @private
     */
    _initMapControls() {
        const controlsConfig = this.config.mapControls;
        const sidebarConfig = this.config.sidebar;

        // 1. Create SidebarLayoutManager
        if (sidebarConfig?.containerId) {
            this.sidebarLayoutManager = new SidebarLayoutManager({
                map: this.map,
                mapContainerId: this.containerId,
                sidebarContentId: sidebarConfig.containerId,
            });
            this.sidebarLayoutManager.init();

            // Apply default mode
            if (sidebarConfig.defaultMode === "pinned") {
                this.sidebarLayoutManager.pin();
            }
        }

        // 2. Create map control buttons
        if (controlsConfig?.enabled !== false && controlsConfig?.buttons) {
            const btnConfigs = controlsConfig.buttons.map((cfg) => {
                const config = { ...cfg };

                // Handle special actions
                if (config.action === "toggleSidebar") {
                    config.onClick = () => {
                        if (this.sidebarLayoutManager?.isPinned()) {
                            this.sidebarLayoutManager.unpin();
                        } else {
                            this.sidebarLayoutManager?.openOffcanvas();
                        }
                    };
                }
                // Handle toggleBasemap action
                else if (config.action === "toggleBasemap") {
                    config.onClick = () => {
                        if (this.basemapOffcanvas) {
                            this.basemapOffcanvas.toggle();
                        }
                    };
                }
                // Handle resetView action
                else if (config.action === "resetView") {
                    config.onClick = () => {
                        const defaultCenter = this.config.map.center;
                        const defaultZoom = this.config.map.zoom;
                        if (defaultCenter) {
                            this.map.setView(defaultCenter, defaultZoom, {
                                animate: true,
                                duration: 0.5
                            });
                        }
                    };
                }
                // Handle toggleFullscreen action
                else if (config.action === "toggleFullscreen") {
                    config.onClick = () => {
                        const mapContainer = this.map.getContainer();
                        if (!document.fullscreenElement) {
                            mapContainer.requestFullscreen().catch(err => {
                                console.error("Fullscreen error:", err);
                            });
                        } else {
                            document.exitFullscreen();
                        }

                        // Trigger resize after fullscreen change
                        setTimeout(() => this.map.invalidateSize(), 200);
                    };
                }
                // Fallback: if onClick function is provided in config, keep it
                else if (typeof config.onClick === 'function') {
                    // Keep custom onClick function from config
                }

                return config;
            });

            this._mapControlButtons = createMapControlButtons(
                this.map,
                btnConfigs,
                { position: controlsConfig.position || "topleft" }
            );
        }
    }

    /**
     * @private
     */
    _initManagers() {
        // WMS Manager
        this.wmsManager = new WMSLayerManager(
            this.map,
            this.wmsLayers,
            this.config.wms.ranhgioiLayers,
        );
        const wmsContainer = document.getElementById(this.elementIds.wmsListContainer);
        if (wmsContainer) {
            this.wmsManager.initializeWMSList(wmsContainer);
        }
        this.wmsManager.loadDefaultWMSLayers();

        // Point Manager
        this.pointManager = new PointManager(
            this.map,
            this.config.pointManager,
        );

        // Sketch Manager
        this.sketchManager = new SketchManager(
            this.map,
            this.config.sketchManager,
        );
        this.sketchManager.initialize();
        this.sketchManager.setWFSClickHandler(this.wfsClickHandler);

        // Map click handler
        this.map.on("click", this.wfsClickHandler);
    }

    /**
     * @private
     */
    _attachEventListeners() {
        const provinceEl = document.getElementById(this.elementIds.provinceSelect);
        if (provinceEl) {
            provinceEl.addEventListener("change", this.handleProvinceChange);
        }

        const communeEl = document.getElementById(this.elementIds.communeSelect);
        if (communeEl) {
            communeEl.addEventListener("change", this.handleCommuneChange);
        }
    }

    /**
     * @private
     */
    async _loadInitialData() {
        this.renderPointList();

        // Load province list - goi truc tiep loadProvinces tu events.js
        if (typeof loadProvinces === "function") {
            await loadProvinces(this.elementIds.provinceSelect);
        }

        this.zoomToDefaultExtent();
    }

    // ========================================
    // FILTER MANAGEMENT
    // ========================================

    async handleProvinceChange(e) {
        const provinceCode = toFixedLengthNumberString(e.target.value, 2);

        this.filterScope.province_c = provinceCode || null;
        this.filterScope.commune_c = null;

        // Load communes - goi truc tiep loadCommunes tu events.js
        if (typeof loadCommunes === "function") {
            await loadCommunes(
                this.elementIds.communeSelect,
                { province: provinceCode },
            );
        }

        this.clearHighlights();

        if (provinceCode) {
            const cqlTinh = `matinh='${provinceCode}'`;
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
                cqlTinh,
                true,
            );

            const cqlXa = `matinh='${provinceCode}'`;
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cqlXa,
                false,
            );
        } else {
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
                null,
                false,
            );
            this.wmsManager.removeWmsLayerByNameLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
            );
        }
    }

    async handleCommuneChange(e) {
        const communeCode = toFixedLengthNumberString(e.target.value, 5);

        this.filterScope.commune_c = communeCode || null;
        this.clearHighlights();

        if (communeCode) {
            this.wmsManager.removeWmsLayerByNameLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
            );
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                `maxa='${communeCode}'`,
                true,
            );
        } else if (this.filterScope.province_c) {
            const cql = `matinh='${this.filterScope.province_c}'`;
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cql,
                false,
            );
            await this.wmsManager.zoomToFilteredExtent(
                this.config.wms.ranhgioiUrl,
                "ws_ranhgioi:rg_vn_tinh_2025",
                cql,
            );
        }
    }

    resetFilter() {
        const provinceEl = document.getElementById(this.elementIds.provinceSelect);
        if (provinceEl) provinceEl.value = "";

        const communeEl = document.getElementById(this.elementIds.communeSelect);
        if (communeEl) {
            communeEl.value = "";
            if (typeof fillSelectId === "function") {
                fillSelectId(
                    this.elementIds.communeSelect,
                    [],
                    "code",
                    "name",
                    "[Chon xa/phuong]",
                );
            }
        }

        this.filterScope.province_c = null;
        this.filterScope.commune_c = null;

        this.clearHighlights();
        this.wmsManager.clearAllFilters();

        this.wmsManager.updateWMSLayer(
            "ws_ranhgioi:rg_vn_tinh_2025",
            null,
            false,
        );
        this.wmsManager.removeWmsLayerByNameLayer("ws_ranhgioi:rg_vn_xa_2025");

        this.zoomToDefaultExtent();
    }

    // ========================================
    // POINT MANAGEMENT
    // ========================================

    renderPointList() {
        const container = document.getElementById(this.elementIds.pointListContainer);
        if (!container) return;

        const points = this.pointManager.getAllPoints();

        if (points.length === 0) {
            container.innerHTML =
                '<div class="text-muted small text-center py-1">Chua co diem nao</div>';
            return;
        }

        let html =
            '<div class="list-group list-group-flush" style="font-size:0.8rem;">';
        points.forEach(({ pointId, config }) => {
            html += `<div class="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                        <span class="text-truncate me-1" style="max-width:120px;" title="${config.name}">${config.name}</span>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary py-0 px-1"
                                    onclick="window.mapApp.zoomToPoint('${pointId}')"
                                    title="Phong to">
                                <i class="bi bi-search"></i>
                            </button>
                            <button class="btn btn-outline-danger py-0 px-1"
                                    onclick="window.mapApp.removePoint('${pointId}')"
                                    title="Xoa">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>`;
        });
        html += "</div>";
        container.innerHTML = html;
    }

    addPoint(lat, lng, name) {
        if (isNaN(lat) || isNaN(lng)) return null;

        const pointName = name || `Diem ${this.pointManager.points.size + 1}`;

        const id = this.pointManager.addPoint({
            name: pointName,
            latitude: lat,
            longitude: lng,
            description: `<div class="text-center"><strong>${pointName}</strong><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small></div>`,
        });

        if (id) {
            this.renderPointList();
        }

        return id;
    }

    removePoint(pointId) {
        this.pointManager.removePoint(pointId);
        this.renderPointList();
    }

    zoomToPoint(pointId, zoom = 8) {
        this.pointManager.zoomToPoint(pointId, zoom);
    }

    toggleAllPoints() {
        this.pointManager.toggleLayerVisibility();
    }

    zoomToAllPoints() {
        if (this.pointManager.points.size === 0) return;
        this.pointManager.zoomToAllPoints();
    }

    clearAllPoints() {
        this.pointManager.clearAllPoints();
        this.renderPointList();
    }

    async addPointWithCoordSystem(
        coord1,
        coord2,
        name,
        coordSystemValue = "WGS84",
    ) {
        const coordSys = this.coordConverter.parseCoordSystem(coordSystemValue);

        let lat, lng;

        if (coordSys.type === "WGS84") {
            lng = coord1;
            lat = coord2;
        } else {
            const mapCenter = this.map.getCenter();
            const kinhtuyentruc = this.coordConverter.suggestCentralMeridian(
                mapCenter.lng,
                coordSys.muichieu,
            );

            const converted = await this.coordConverter.vn2000ToWGS84(
                coord1,
                coord2,
                coordSys.muichieu,
                kinhtuyentruc,
            );

            if (!converted) {
                alert(
                    "Khong the chuyen doi toa do. Vui long kiem tra lai input.",
                );
                return null;
            }

            lng = converted.lng;
            lat = converted.lat;
        }

        const id = this.addPoint(lat, lng, name);

        if (id) {
            this.zoomToPoint(id, 15);
        }

        return id;
    }

    async addCurrentLocationPoint(name = null) {
        try {
            const position = await GeolocationHelper.getCurrentPosition();

            const pointName =
                name || `Vi tri hien tai ${new Date().toLocaleTimeString()}`;

            const id = this.addPoint(position.lat, position.lng, pointName);

            if (id) {
                this.zoomToPoint(id, 15);
            }

            return id;
        } catch (error) {
            console.error("Geolocation error:", error);
            alert(`Khong the xac dinh vi tri: ${error.message}`);
            return null;
        }
    }

    /**
     * Xu ly them diem tu form nhap lieu
     * @private
     */
    async _handleAddCustomPoint() {
        const ids = this.elementIds;
        const coord1 = parseFloat(document.getElementById(ids.pointCoord1)?.value);
        const coord2 = parseFloat(document.getElementById(ids.pointCoord2)?.value);
        const name = document.getElementById(ids.pointName)?.value || "";
        const coordSystemSelect = document.getElementById(ids.pointCoordSystem);
        const coordSystem = coordSystemSelect ? coordSystemSelect.value : "WGS84";

        const id = await this.addPointWithCoordSystem(
            coord1,
            coord2,
            name,
            coordSystem,
        );

        if (id) {
            const c1 = document.getElementById(ids.pointCoord1);
            const c2 = document.getElementById(ids.pointCoord2);
            const n = document.getElementById(ids.pointName);
            if (c1) c1.value = "";
            if (c2) c2.value = "";
            if (n) n.value = "";
        }
    }

    /**
     * Xu ly them diem vi tri hien tai
     * @private
     */
    async _handleAddCurrentLocation() {
        const btn = document.getElementById(this.elementIds.currentLocationBtn);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Dang xac dinh...';
        }

        try {
            await this.addCurrentLocationPoint();
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Vi tri hien tai';
            }
        }
    }

    setCoordinateSystem(systemValue) {
        this.currentCoordSystem = systemValue;
    }

    getCoordinateSystem() {
        return this.currentCoordSystem;
    }

    getCoordSystemOptions() {
        return this.coordConverter.getZoneOptions();
    }

    // ========================================
    // SKETCH MANAGEMENT
    // ========================================

    toggleSketchMode() {
        const isVisible = this.sketchManager.toggle();
        const btn = document.getElementById(this.elementIds.sketchToggleBtn);

        if (btn) {
            if (isVisible) {
                btn.classList.remove("btn-warning");
                btn.classList.add("btn-info");
                btn.innerHTML = '<i class="bi bi-pencil"></i> Tat sketch tools';
            } else {
                btn.classList.remove("btn-info");
                btn.classList.add("btn-warning");
                btn.innerHTML = '<i class="bi bi-pencil"></i> Bat sketch tools';
            }
        }

        return isVisible;
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    zoomToDefaultExtent() {
        const mapConfig = this.config.map;

        if (mapConfig.center) {
            this.map.flyTo(mapConfig.center, mapConfig.zoom, {
                duration: 0.5,
            });
        } else {
            const config = this.wmsLayers.find((c) => c.defaultVisible);
            if (config) {
                this.wmsManager.zoomToFilteredExtent(
                    config.url,
                    config.layer,
                    null,
                );
            }
        }
    }

    clearHighlights() {
        if (this.map._highlightLayers) {
            Object.keys(this.map._highlightLayers).forEach((key) => {
                this.map.removeLayer(this.map._highlightLayers[key]);
                delete this.map._highlightLayers[key];
            });
        }
    }

    wfsClickHandler(event) {
        this.wmsManager.handleMapClick(event);
    }

    // ========================================
    // PUBLIC API
    // ========================================

    getMap() {
        return this.map;
    }

    getWMSManager() {
        return this.wmsManager;
    }

    getPointManager() {
        return this.pointManager;
    }

    getSketchManager() {
        return this.sketchManager;
    }

    getControlManager() {
        return this.controlManager;
    }

    getFilterScope() {
        return { ...this.filterScope };
    }

    destroy() {
        const provinceEl = document.getElementById(this.elementIds.provinceSelect);
        if (provinceEl) {
            provinceEl.removeEventListener("change", this.handleProvinceChange);
        }

        const communeEl = document.getElementById(this.elementIds.communeSelect);
        if (communeEl) {
            communeEl.removeEventListener("change", this.handleCommuneChange);
        }

        if (this.controlManager) {
            this.controlManager.destroy();
            this.controlManager = null;
        }

        if (this.basemapOffcanvas) {
            const offcanvasEl = document.getElementById("basemap-offcanvas");
            if (offcanvasEl) {
                this.basemapOffcanvas.dispose();
                offcanvasEl.remove();
            }
            this.basemapOffcanvas = null;
        }

        if (this.sidebarLayoutManager) {
            this.sidebarLayoutManager.destroy();
            this.sidebarLayoutManager = null;
        }

        if (this._mapControlButtons && this.map) {
            this.map.removeControl(this._mapControlButtons);
            this._mapControlButtons = null;
        }

        if (this.map) {
            this.map.off("click", this.wfsClickHandler);
            this.map.remove();
        }

        this.map = null;
        this.wmsManager = null;
        this.pointManager = null;
        this.sketchManager = null;
    }
}
