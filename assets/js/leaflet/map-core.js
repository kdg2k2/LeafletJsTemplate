// ========================================
// MAP APPLICATION CLASS
// ========================================

/**
 * MapApp - Reusable map application class
 * Manages a complete map instance with WMS layers, points, and sketch tools
 *
 * @example
 * const app = new MapApp('map-container', {
 *     wmsListContainerId: 'wms-list',
 *     pointListContainerId: 'point-list',
 *     provinceSelectId: 'province-select',
 *     communeSelectId: 'commune-select'
 * });
 * app.init();
 */
class MapApp {
    /**
     * @param {string} mapContainerId - ID of the map container element
     * @param {Object} options - Configuration options
     * @param {Object} options.config - Map configuration (from map-config.js)
     * @param {string} options.wmsListContainerId - ID for WMS list container
     * @param {string} options.pointListContainerId - ID for point list container
     * @param {string} options.provinceSelectId - ID for province select element
     * @param {string} options.communeSelectId - ID for commune select element
     */
    constructor(mapContainerId, options = {}) {
        // Validate container
        if (!document.getElementById(mapContainerId)) {
            throw new Error(`Map container #${mapContainerId} not found`);
        }

        // Store configuration
        this.containerId = mapContainerId;
        this.config = options.config || DEFAULT_MAP_CONFIG;
        this.elementIds = {
            wmsListContainer: options.wmsListContainerId,
            pointListContainer: options.pointListContainerId,
            provinceSelect: options.provinceSelectId,
            communeSelect: options.communeSelectId,
        };

        // State
        this.filterScope = {
            province_c: null,
            commune_c: null,
        };

        // Managers (will be initialized in init())
        this.map = null;
        this.wmsManager = null;
        this.pointManager = null;
        this.sketchManager = null;

        // Coordinate converter
        this.coordConverter = new CoordinateConverter();

        // Current coordinate system
        this.currentCoordSystem = "WGS84"; // Default to WGS84

        // Geolocation watch ID
        this.geolocationWatchId = null;

        // Generate WMS layers
        this.wmsLayers = generateDefaultWMSLayers(this.config.wms.ranhgioiUrl);

        // Bind methods
        this._bindMethods();
    }

    /**
     * Bind all methods to this instance
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

    /**
     * Initialize the map application
     * @returns {Promise<void>}
     */
    async init() {
        this._initMap();
        this._initManagers();
        this._attachEventListeners();
        await this._loadInitialData();
    }

    /**
     * Initialize Leaflet map
     * @private
     */
    _initMap() {
        const mapConfig = this.config.map;
        const tileConfig = this.config.tileLayer;

        this.map = L.map(this.containerId, {
            center: mapConfig.center || [0, 0],
            zoom: mapConfig.center ? mapConfig.zoom : 2,
            minZoom: mapConfig.minZoom,
            maxZoom: mapConfig.maxZoom,
            layers: [L.tileLayer(tileConfig.url, tileConfig.options)],
        });
    }

    /**
     * Initialize managers (WMS, Point, Sketch)
     * @private
     */
    _initManagers() {
        // WMS Manager
        this.wmsManager = new WMSLayerManager(
            this.map,
            this.wmsLayers,
            this.config.wms.ranhgioiLayers,
        );
        if (this.elementIds.wmsListContainer) {
            const container = document.getElementById(
                this.elementIds.wmsListContainer,
            );
            if (container) {
                this.wmsManager.initializeWMSList(container);
            }
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

        // Map click handler for WMS GetFeatureInfo
        this.map.on("click", this.wfsClickHandler);
    }

    /**
     * Attach event listeners to UI elements
     * @private
     */
    _attachEventListeners() {
        // Province select
        if (this.elementIds.provinceSelect) {
            const provinceEl = document.getElementById(
                this.elementIds.provinceSelect,
            );
            if (provinceEl) {
                provinceEl.addEventListener(
                    "change",
                    this.handleProvinceChange,
                );
            }
        }

        // Commune select
        if (this.elementIds.communeSelect) {
            const communeEl = document.getElementById(
                this.elementIds.communeSelect,
            );
            if (communeEl) {
                communeEl.addEventListener("change", this.handleCommuneChange);
            }
        }
    }

    /**
     * Load initial data
     * @private
     */
    async _loadInitialData() {
        // Render point list
        if (this.elementIds.pointListContainer) {
            this.renderPointList();
        }

        // Load province list (if external function exists)
        if (typeof loadProvinceList === "function") {
            await loadProvinceList();
        }

        // Zoom to default extent
        this.zoomToDefaultExtent();
    }

    // ========================================
    // FILTER MANAGEMENT
    // ========================================

    /**
     * Handle province selection change
     * @param {Event} e - Change event
     */
    async handleProvinceChange(e) {
        const provinceCode = toFixedLengthNumberString(e.target.value, 2);

        // Update filter scope
        this.filterScope.province_c = provinceCode || null;
        this.filterScope.commune_c = null;

        // Reset commune select (if external function exists)
        if (typeof loadCommuneListByProvince === "function") {
            await loadCommuneListByProvince(provinceCode);
        }

        this.clearHighlights();

        if (provinceCode) {
            // Update WMS layers with filter
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
            // Reset to default
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

    /**
     * Handle commune selection change
     * @param {Event} e - Change event
     */
    async handleCommuneChange(e) {
        const communeCode = toFixedLengthNumberString(e.target.value, 5);

        // Update filter scope
        this.filterScope.commune_c = communeCode || null;
        this.clearHighlights();

        if (communeCode) {
            // Remove province layer, show only commune
            this.wmsManager.removeWmsLayerByNameLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
            );

            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                `maxa='${communeCode}'`,
                true,
            );
        } else if (this.filterScope.province_c) {
            // Show all communes in province
            const cql = `matinh='${this.filterScope.province_c}'`;
            await this.wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cql,
                false,
            );

            // Zoom back to province
            await this.wmsManager.zoomToFilteredExtent(
                this.config.wms.ranhgioiUrl,
                "ws_ranhgioi:rg_vn_tinh_2025",
                cql,
            );
        }
    }

    /**
     * Reset all filters
     */
    resetFilter() {
        if (this.elementIds.provinceSelect) {
            const el = document.getElementById(this.elementIds.provinceSelect);
            if (el) el.value = "";
        }

        if (this.elementIds.communeSelect) {
            const el = document.getElementById(this.elementIds.communeSelect);
            if (el) el.value = "";

            // Reset commune select options (if external function exists)
            if (typeof fillSelect === "function") {
                fillSelect(
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

        // Reset WMS layers
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

    /**
     * Render point list in UI
     */
    renderPointList() {
        if (!this.elementIds.pointListContainer) return;

        const container = document.getElementById(
            this.elementIds.pointListContainer,
        );
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

    /**
     * Add a custom point to the map
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} name - Point name
     * @returns {string|null} Point ID or null if failed
     */
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

    /**
     * Remove a point from the map
     * @param {string} pointId - Point ID
     */
    removePoint(pointId) {
        this.pointManager.removePoint(pointId);
        this.renderPointList();
    }

    /**
     * Zoom to a specific point
     * @param {string} pointId - Point ID
     * @param {number} zoom - Zoom level
     */
    zoomToPoint(pointId, zoom = 8) {
        this.pointManager.zoomToPoint(pointId, zoom);
    }

    /**
     * Toggle all points visibility
     */
    toggleAllPoints() {
        this.pointManager.toggleLayerVisibility();
    }

    /**
     * Zoom to show all points
     */
    zoomToAllPoints() {
        if (this.pointManager.points.size === 0) return;
        this.pointManager.zoomToAllPoints();
    }

    /**
     * Clear all points from the map
     */
    clearAllPoints() {
        this.pointManager.clearAllPoints();
        this.renderPointList();
    }

    /**
     * Add point with coordinate system conversion using API
     * @param {number} coord1 - X or Longitude
     * @param {number} coord2 - Y or Latitude
     * @param {string} name - Point name
     * @param {string} coordSystemValue - Coordinate system value (WGS84, VN2000_MUI3, VN2000_MUI6)
     * @returns {Promise<string|null>} Point ID or null if failed
     */
    async addPointWithCoordSystem(
        coord1,
        coord2,
        name,
        coordSystemValue = "WGS84",
    ) {
        // Parse coordinate system
        const coordSys = this.coordConverter.parseCoordSystem(coordSystemValue);

        let lat, lng;

        if (coordSys.type === "WGS84") {
            lng = coord1;
            lat = coord2;
        } else {
            // VN2000: need to convert to WGS84 using API
            // Auto-suggest central meridian based on map center
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
                console.error("Failed to convert coordinates");
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
            // Zoom to the added point
            this.zoomToPoint(id, 15);
        }

        return id;
    }

    /**
     * Get current location and add point
     * @param {string} name - Point name (optional)
     * @returns {Promise<string|null>} Point ID or null
     */
    async addCurrentLocationPoint(name = null) {
        try {
            const position = await GeolocationHelper.getCurrentPosition();

            const pointName =
                name || `Vi tri hien tai ${new Date().toLocaleTimeString()}`;

            const id = this.addPoint(position.lat, position.lng, pointName);

            if (id) {
                // Zoom to the point
                this.zoomToPoint(id, 15);

                // Show notification
                if (typeof console !== "undefined") {
                    console.log(
                        `Added point at: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} (accuracy: ${Math.round(position.accuracy)}m)`,
                    );
                }
            }

            return id;
        } catch (error) {
            console.error("Geolocation error:", error);
            alert(`Khong the xac dinh vi tri: ${error.message}`);
            return null;
        }
    }

    /**
     * Set current coordinate system
     * @param {string} systemValue - Coordinate system value (WGS84, VN2000_MUI3, VN2000_MUI6)
     */
    setCoordinateSystem(systemValue) {
        this.currentCoordSystem = systemValue;
    }

    /**
     * Get current coordinate system
     * @returns {string} Coordinate system value
     */
    getCoordinateSystem() {
        return this.currentCoordSystem;
    }

    /**
     * Get available coordinate system options
     * @returns {Array} Array of zone options
     */
    getCoordSystemOptions() {
        return this.coordConverter.getZoneOptions();
    }

    /**
     * Convert coordinates and update form labels
     * @param {number} coord1 - First coordinate
     * @param {number} coord2 - Second coordinate
     * @param {string} fromEPSG - Source EPSG
     * @param {string} toEPSG - Target EPSG
     * @returns {Object|null} {coord1, coord2} or null
     */
    convertCoordinates(coord1, coord2, fromEPSG, toEPSG) {
        const result = this.coordConverter.convert(
            coord1,
            coord2,
            fromEPSG,
            toEPSG,
        );
        if (!result) return null;

        return {
            coord1: result.x,
            coord2: result.y,
        };
    }

    // ========================================
    // SKETCH MANAGEMENT
    // ========================================

    /**
     * Toggle sketch mode on/off
     * @param {string} buttonId - ID of the toggle button
     */
    toggleSketchMode(buttonId) {
        const isVisible = this.sketchManager.toggle();

        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn) {
                if (isVisible) {
                    btn.classList.remove("btn-warning");
                    btn.classList.add("btn-info");
                    btn.innerHTML =
                        '<i class="bi bi-pencil"></i> Tat sketch tools';
                } else {
                    btn.classList.remove("btn-info");
                    btn.classList.add("btn-warning");
                    btn.innerHTML =
                        '<i class="bi bi-pencil"></i> Bat sketch tools';
                }
            }
        }

        return isVisible;
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Zoom to default extent
     */
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

    /**
     * Clear all map highlights
     */
    clearHighlights() {
        if (this.map._highlightLayers) {
            Object.keys(this.map._highlightLayers).forEach((key) => {
                this.map.removeLayer(this.map._highlightLayers[key]);
                delete this.map._highlightLayers[key];
            });
        }
    }

    /**
     * WFS click handler for GetFeatureInfo
     * @param {Event} event - Map click event
     */
    wfsClickHandler(event) {
        this.wmsManager.handleMapClick(event);
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Get the Leaflet map instance
     * @returns {L.Map}
     */
    getMap() {
        return this.map;
    }

    /**
     * Get the WMS manager instance
     * @returns {WMSLayerManager}
     */
    getWMSManager() {
        return this.wmsManager;
    }

    /**
     * Get the point manager instance
     * @returns {PointManager}
     */
    getPointManager() {
        return this.pointManager;
    }

    /**
     * Get the sketch manager instance
     * @returns {SketchManager}
     */
    getSketchManager() {
        return this.sketchManager;
    }

    /**
     * Get current filter scope
     * @returns {Object}
     */
    getFilterScope() {
        return { ...this.filterScope };
    }

    /**
     * Destroy the map application
     */
    destroy() {
        // Remove event listeners
        if (this.elementIds.provinceSelect) {
            const el = document.getElementById(this.elementIds.provinceSelect);
            if (el) {
                el.removeEventListener("change", this.handleProvinceChange);
            }
        }

        if (this.elementIds.communeSelect) {
            const el = document.getElementById(this.elementIds.communeSelect);
            if (el) {
                el.removeEventListener("change", this.handleCommuneChange);
            }
        }

        // Remove map
        if (this.map) {
            this.map.off("click", this.wfsClickHandler);
            this.map.remove();
        }

        // Clear references
        this.map = null;
        this.wmsManager = null;
        this.pointManager = null;
        this.sketchManager = null;
    }
}
