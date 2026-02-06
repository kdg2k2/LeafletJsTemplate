/**
 * Module 2: WMSLayerManager
 * Quan ly cac lop WMS tren Leaflet map: them, xoa, bat/tat, loc CQL,
 * query GetFeatureInfo khi click, highlight feature.
 * Phu thuoc: WFSUtil (Module 1), Leaflet
 */
class WMSLayerManager {
    /**
     * @param {L.Map} map - Leaflet map instance
     * @param {Array} wmsLayers - Mang cau hinh WMS layers
     */
    constructor(map, wmsLayers = DEFAULT_WMS_LAYERS) {
        this.map = map;
        this.wmsLayers = new Map(); // Map<configId, L.TileLayer.WMS>
        this.wmsConfigs = [...wmsLayers];
        this.wfsUtil = new WFSUtil({
            defaultMaxFeatures: 1000,
            timeout: 10000,
        });
        this.onMapClick = null;
        this._highlightLayers = {};
    }

    /**
     * Thay doi URL cua WMS layers neu dang chay tren localhost
     */
    replaceDomainIfIsLocalhost() {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            this.wmsConfigs.forEach((config) => {
                const isBoundaryLayer = WMS_RANHGIOI.some(
                    (rg) => config.layer === rg,
                );
                if (!isBoundaryLayer) {
                    try {
                        const urlObj = new URL(config.url);
                        config.url = `http://localhost:8080${urlObj.pathname}`;
                    } catch (e) {
                        // URL khong hop le, bo qua
                    }
                }
            });
        }
    }

    /**
     * Tim config theo ten layer
     * @param {string} layerName - VD: "_2025_EUDR:gardens"
     * @returns {Object|undefined}
     */
    getWmsConfigWithNameLayer(layerName) {
        return this.wmsConfigs.find((c) => c.layer === layerName);
    }

    /**
     * Cap nhat WMS layer (xoa cu, tao moi voi filter)
     * @param {string} layerName - Ten layer
     * @param {string|null} cqlFilter - CQL filter
     * @param {boolean} shouldZoom - Co zoom den extent khong
     */
    async updateWMSLayer(layerName, cqlFilter = null, shouldZoom = false) {
        const config = this.getWmsConfigWithNameLayer(layerName);
        if (!config) return;

        this.removeWMSLayer(config.id);
        await this.createAndAddWMSLayer(config, { cqlFilter });
        this.reorderWMSLayers();

        if (shouldZoom) {
            await this.zoomToFilteredExtent(config.url, layerName, cqlFilter);
        }
    }

    /**
     * Tao va them WMS layer vao map
     * @param {Object} config - Cau hinh WMS layer
     * @param {Object} options - { cqlFilter }
     * @returns {L.TileLayer.WMS}
     */
    createAndAddWMSLayer(config, options = {}) {
        const cqlFilter = this.buildCQLFilter(
            config.cqlFilter || null,
            options.cqlFilter || null,
        );

        const params = {
            layers: config.layer,
            format: "image/png",
            transparent: true,
            version: config.version || "1.1.1",
            opacity: 0.8,
        };

        if (cqlFilter) {
            params.CQL_FILTER = cqlFilter;
        }

        const layer = L.tileLayer.wms(config.url, params);
        layer.addTo(this.map);

        this.wmsLayers.set(config.id, layer);
        layer._cqlFilter = cqlFilter;
        layer._configId = config.id;

        this._updateToggleButtonState(config.id, true);

        return layer;
    }

    /**
     * Xoa WMS layer khoi map
     * @param {string} wmsId - ID cua WMS config
     */
    removeWMSLayer(wmsId) {
        const layer = this.wmsLayers.get(wmsId);
        if (layer) {
            this.map.removeLayer(layer);
            this.wmsLayers.delete(wmsId);
            this._updateToggleButtonState(wmsId, false);
        }
    }

    /**
     * Sap xep lai thu tu WMS layers theo zoomPriority
     */
    reorderWMSLayers() {
        const sortedConfigs = [...this.wmsConfigs].sort(
            (a, b) => (a.zoomPriority || 0) - (b.zoomPriority || 0),
        );

        sortedConfigs.forEach((config, index) => {
            const layer = this.wmsLayers.get(config.id);
            if (layer) {
                layer.setZIndex((config.zIndex || 1) * 100 + index);
            }
        });
    }

    /**
     * Bat/tat WMS layer
     * @param {string} wmsId - ID cua WMS config
     * @param {HTMLElement|null} button - Nut toggle
     */
    async toggleWMSLayer(wmsId, button = null) {
        const isVisible = this.wmsLayers.has(wmsId);
        const config = this.wmsConfigs.find((c) => c.id === wmsId);
        if (!config) return;

        if (button) {
            const icon = button.querySelector("i");
            if (icon) {
                icon.className = "bi bi-hourglass-split";
            }
        }

        if (isVisible) {
            this.removeWMSLayer(wmsId);
        } else {
            this.createAndAddWMSLayer(config);
            this.reorderWMSLayers();
        }

        if (button) {
            const icon = button.querySelector("i");
            const nowVisible = this.wmsLayers.has(wmsId);
            if (icon) {
                icon.className = nowVisible ? "bi bi-eye-fill" : "bi bi-eye";
            }
        }
    }

    /**
     * Xay dung CQL Filter tu nhieu dieu kien
     * @param {string|null} baseFilter
     * @param {string|null} additionalFilter
     * @returns {string|null}
     */
    buildCQLFilter(baseFilter, additionalFilter) {
        const parts = [];
        if (baseFilter && baseFilter.trim()) {
            parts.push(`(${baseFilter.trim()})`);
        }
        if (additionalFilter && additionalFilter.trim()) {
            parts.push(`(${additionalFilter.trim()})`);
        }
        return parts.length > 0 ? parts.join(" AND ") : null;
    }

    /**
     * Load cac WMS layers mac dinh (co defaultVisible = true)
     */
    async loadDefaultWMSLayers() {
        this.replaceDomainIfIsLocalhost();

        const defaultConfigs = this.wmsConfigs.filter((c) => c.defaultVisible);

        for (const config of defaultConfigs) {
            this.createAndAddWMSLayer(config);
        }

        this.reorderWMSLayers();
    }

    /**
     * Tao danh sach WMS layers trong HTML container
     * @param {HTMLElement} container - Container element
     */
    initializeWMSList(container) {
        if (!container) return;

        const ul = document.createElement("ul");
        ul.className = "list-group list-group-flush";

        this.wmsConfigs.forEach((config) => {
            const li = document.createElement("li");
            li.className =
                "list-group-item d-flex justify-content-between align-items-center py-2";

            const nameSpan = document.createElement("span");
            nameSpan.className = "small";
            nameSpan.textContent = config.name;

            const btn = document.createElement("button");
            btn.className = "btn btn-sm btn-outline-secondary py-0 px-1";
            btn.id = `wms-toggle-${config.id}`;
            btn.title = config.defaultVisible ? "An lop" : "Hien lop";

            const isVisible = this.wmsLayers.has(config.id);
            btn.innerHTML = `<i class="bi ${isVisible ? "bi-eye-fill" : "bi-eye"}"></i>`;

            btn.addEventListener("click", () => {
                this.toggleWMSLayer(config.id, btn);
            });

            li.appendChild(nameSpan);
            li.appendChild(btn);
            ul.appendChild(li);
        });

        container.innerHTML = "";
        container.appendChild(ul);
    }

    /**
     * Dat callback xu ly khi click map co ket qua WMS
     * @param {Function} callback - (event, validResult) => {}
     */
    setMapClickHandler(callback) {
        this.onMapClick = callback;
    }

    /**
     * Xu ly su kien click tren map de query WMS GetFeatureInfo
     * @param {Object} event - Leaflet click event
     */
    async handleMapClick(event) {
        const latlng = event.latlng;

        // Lay tat ca visible WMS layers, sort theo zoomPriority (cao nhat truoc)
        const visibleLayers = [];
        this.wmsConfigs.forEach((config) => {
            const layer = this.wmsLayers.get(config.id);
            if (layer) {
                visibleLayers.push({ config, layer });
            }
        });

        if (visibleLayers.length === 0) return;

        visibleLayers.sort(
            (a, b) =>
                (b.config.zoomPriority || 0) - (a.config.zoomPriority || 0),
        );

        // Hien popup loading
        const loadingPopup = L.popup()
            .setLatLng(latlng)
            .setContent(
                '<div class="text-center p-2"><div class="spinner-border spinner-border-sm" role="status"></div> <small>Dang tai...</small></div>',
            )
            .openOn(this.map);

        try {
            // Query song song tat ca layers
            const results = await Promise.all(
                visibleLayers.map(({ config, layer }) =>
                    this.quickCheckFeatureInfo(event, layer, config),
                ),
            );

            // Tim layer dau tien co data (da sort theo priority)
            const validResult = results.find(
                (r) => r && r.data && r.data.length > 0,
            );

            if (validResult) {
                if (this.onMapClick) {
                    this.onMapClick(event, validResult);
                }
                this.displayFeatureInfo(validResult, latlng);
            } else {
                loadingPopup.setContent(
                    '<div class="text-center p-2"><small class="text-muted">Khong tim thay thong tin</small></div>',
                );
            }
        } catch (error) {
            loadingPopup.setContent(
                `<div class="text-center p-2"><small class="text-danger">Loi: ${error.message}</small></div>`,
            );
        }
    }

    /**
     * Quick check GetFeatureInfo (timeout 3s)
     * @param {Object} event - Leaflet click event
     * @param {L.TileLayer.WMS} wmsLayerObj - WMS layer
     * @param {Object} wmsConfig - Cau hinh WMS
     * @returns {Promise<Object|null>}
     */
    async quickCheckFeatureInfo(event, wmsLayerObj, wmsConfig) {
        return this._getFeatureInfoRequest(event, wmsLayerObj, wmsConfig, 3000);
    }

    /**
     * GetFeatureInfo day du (khong timeout)
     * @param {Object} event - Leaflet click event
     * @param {L.TileLayer.WMS} wmsLayerObj - WMS layer
     * @param {Object} wmsConfig - Cau hinh WMS
     * @returns {Promise<Object|null>}
     */
    async getFeatureInfo(event, wmsLayerObj, wmsConfig) {
        return this._getFeatureInfoRequest(event, wmsLayerObj, wmsConfig, 0);
    }

    /**
     * Thuc hien WMS GetFeatureInfo request
     * @private
     */
    async _getFeatureInfoRequest(
        event,
        wmsLayerObj,
        wmsConfig,
        timeout = 3000,
    ) {
        const latlng = event.latlng;
        const bounds = this.map.getBounds();
        const size = this.map.getSize();
        const point = this.map.latLngToContainerPoint(latlng);

        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

        const version = wmsConfig.version || "1.1.1";

        const params = new URLSearchParams({
            SERVICE: "WMS",
            VERSION: version,
            REQUEST: "GetFeatureInfo",
            LAYERS: wmsConfig.layer,
            QUERY_LAYERS: wmsConfig.layer,
            STYLES: "",
            BBOX: bbox,
            WIDTH: String(size.x),
            HEIGHT: String(size.y),
            FORMAT: "image/png",
            INFO_FORMAT: "application/json",
            SRS: "EPSG:4326",
            X: String(Math.round(point.x)),
            Y: String(Math.round(point.y)),
            TRANSPARENT: "true",
        });

        if (wmsLayerObj._cqlFilter) {
            params.append("CQL_FILTER", wmsLayerObj._cqlFilter);
        }

        const url = `${wmsConfig.url}?${params.toString()}`;

        try {
            const fetchOptions = {};
            let controller, timeoutId;

            if (timeout > 0) {
                controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), timeout);
                fetchOptions.signal = controller.signal;
            }

            const response = await fetch(url, fetchOptions);
            if (timeoutId) clearTimeout(timeoutId);

            const data = await response.json();

            const features = data.features || [];
            if (features.length === 0) return null;

            return {
                layerId: wmsConfig.id,
                layerName: wmsConfig.layer,
                data: features,
                clickPoint: latlng,
                layerInfo: wmsConfig,
            };
        } catch (error) {
            if (error.name === "AbortError") return null;
            return null;
        }
    }

    /**
     * Trigger map click programmatically tai mot diem
     * @param {Object} latlng - { lat, lng } hoac L.LatLng
     */
    async triggerMapClickAtPoint(latlng) {
        const mockEvent = {
            latlng: L.latLng(latlng.lat || latlng[0], latlng.lng || latlng[1]),
        };
        await this.handleMapClick(mockEvent);
    }

    /**
     * Hien thi thong tin feature trong popup
     * @param {Object} result - Ket qua tu GetFeatureInfo
     * @param {L.LatLng} latlng - Vi tri hien popup
     */
    displayFeatureInfo(result, latlng) {
        const content = this.createPopupContent(result);
        L.popup({ maxWidth: 350, maxHeight: 300 })
            .setLatLng(latlng)
            .setContent(content)
            .openOn(this.map);
    }

    /**
     * Tao noi dung HTML cho popup
     * @param {Object} result - Ket qua tu GetFeatureInfo
     * @returns {string} HTML string
     */
    createPopupContent(result) {
        if (!result || !result.data || result.data.length === 0) {
            return '<div class="p-2"><small>Khong co du lieu</small></div>';
        }

        const feature = result.data[0];
        const props = feature.properties || {};

        let html = '<div class="p-1" style="font-size:12px;">';
        html += `<div class="fw-bold mb-1 border-bottom pb-1">${result.layerInfo?.name || result.layerName}</div>`;
        html +=
            '<table class="table table-sm table-borderless mb-0" style="font-size:11px;">';

        const skipKeys = ["bbox", "geometry", "the_geom", "geom", "shape"];

        Object.entries(props).forEach(([key, value]) => {
            if (skipKeys.includes(key.toLowerCase())) return;
            if (value === null || value === undefined) return;

            const label = this.getPropertyLabel(key);
            const formattedValue = this.getFieldFormat(key, value);

            html += `<tr><td class="text-muted pe-2" style="white-space:nowrap;">${label}</td><td class="fw-semibold">${formattedValue}</td></tr>`;
        });

        html += "</table></div>";
        return html;
    }

    /**
     * Map label tieng Viet cho tung field
     * @param {string} key - Ten field
     * @returns {string} Label tieng Viet
     */
    getPropertyLabel(key) {
        const labelMap = {
            tinh: "Tinh/TP",
            huyen: "Quan/Huyen",
            xa: "Phuong/Xa",
            province_c: "Ma tinh",
            district_c: "Ma huyen",
            commune_c: "Ma xa",
            maxa: "Ma xa",
            ten: "Ten",
            name: "Ten",
            dien_tich: "Dien tich (ha)",
            area: "Dien tich",
            area_ha: "Dien tich (ha)",
            tt: "Trang thai",
            status: "Trang thai",
            loai_dat: "Loai dat",
            land_type: "Loai dat",
            nguon: "Nguon",
            source: "Nguon",
            ghi_chu: "Ghi chu",
            note: "Ghi chu",
            nam: "Nam",
            year: "Nam",
            ma_vuon: "Ma vuon",
            garden_code: "Ma vuon",
            chu_vuon: "Chu vuon",
            owner: "Chu vuon",
        };

        return labelMap[key.toLowerCase()] || key;
    }

    /**
     * Format so cho tung field
     * @param {string} key - Ten field
     * @param {*} value - Gia tri
     * @returns {string} Gia tri da format
     */
    getFieldFormat(key, value) {
        const numberFields = ["dien_tich", "area", "area_ha", "shape_area"];
        if (
            numberFields.includes(key.toLowerCase()) &&
            typeof value === "number"
        ) {
            return value.toLocaleString("vi-VN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
            });
        }
        return String(value);
    }

    /**
     * Highlight feature theo CQL filter
     * @param {Object} wmsConfig - Cau hinh WMS
     * @param {string} cqlFilter - CQL filter
     */
    async highlightSelectedFeature(wmsConfig, cqlFilter) {
        try {
            const wfsUrl = this.wfsUtil.generateWFSUrl(wmsConfig.url);
            const geojson = await this.wfsUtil.fetchFeatureGeoJSON(
                wfsUrl,
                wmsConfig.layer,
                cqlFilter,
                10,
            );

            if (geojson && geojson.features && geojson.features.length > 0) {
                this.wfsUtil.highlightPolygonOnMap(
                    this.map,
                    geojson,
                    "selectedFeature",
                );
            }
        } catch (error) {
            console.error("Loi highlight feature:", error);
        }
    }

    // --- Cac method zoom ---

    /**
     * Zoom den extent cua WMS layer (qua WFS query)
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     * @param {string|null} cqlFilter - CQL filter
     */
    async zoomToWMSExtent(wmsUrl, layerName, cqlFilter = null) {
        await this.zoomToFilteredExtent(wmsUrl, layerName, cqlFilter);
    }

    /**
     * Zoom den extent co filter
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     * @param {string|null} cqlFilter - CQL filter
     */
    async zoomToWMSExtentWithFilter(wmsUrl, layerName, cqlFilter = null) {
        const config = this.getWmsConfigWithNameLayer(layerName);
        const fullFilter = this.buildCQLFilter(
            config?.cqlFilter || null,
            cqlFilter,
        );
        await this.zoomToFilteredExtent(wmsUrl, layerName, fullFilter);
    }

    /**
     * Query WFS, tinh bounds, zoom
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     * @param {string|null} cqlFilter - CQL filter
     */
    async zoomToFilteredExtent(wmsUrl, layerName, cqlFilter = null) {
        try {
            const wfsUrl = this.wfsUtil.generateWFSUrl(wmsUrl);
            const geojson = await this.wfsUtil.fetchFeatureGeoJSON(
                wfsUrl,
                layerName,
                cqlFilter,
                100,
            );

            if (geojson && geojson.features && geojson.features.length > 0) {
                const bounds = this.wfsUtil.calculateBounds(geojson.features);
                if (!this.isDefaultBoundingBox(bounds)) {
                    this.zoomToBounds(bounds);
                }
            }
        } catch (error) {
            console.error("Loi zoom to extent:", error);
        }
    }

    /**
     * Zoom den center tinh tu WFS
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     */
    async zoomToCenterFromWFS(wmsUrl, layerName) {
        try {
            const wfsUrl = this.wfsUtil.generateWFSUrl(wmsUrl);
            const geojson = await this.wfsUtil.fetchFeatureGeoJSON(
                wfsUrl,
                layerName,
                null,
                100,
            );

            if (geojson && geojson.features && geojson.features.length > 0) {
                const center = this.wfsUtil.calculateCenterFromFeatures(
                    geojson.features,
                );
                this.zoomToCenter(center);
            }
        } catch (error) {
            console.error("Loi zoom to center:", error);
        }
    }

    /**
     * Kiem tra bbox co phai la mac dinh (qua rong) khong
     * @param {Object} bbox - { xmin, ymin, xmax, ymax }
     * @returns {boolean}
     */
    isDefaultBoundingBox(bbox) {
        if (!bbox) return true;
        const width = Math.abs(bbox.xmax - bbox.xmin);
        const height = Math.abs(bbox.ymax - bbox.ymin);
        return width > 180 || height > 90;
    }

    /**
     * Zoom den center point
     * @param {Object} centerPoint - { longitude, latitude }
     * @param {number} zoom - Muc zoom
     */
    zoomToCenter(centerPoint, zoom = 12) {
        this.map.flyTo([centerPoint.latitude, centerPoint.longitude], zoom, {
            duration: 0.5,
        });
    }

    /**
     * Zoom den bounding box
     * @param {Object} bounds - { xmin, ymin, xmax, ymax }
     */
    zoomToBounds(bounds) {
        this.map.fitBounds(
            [
                [bounds.ymin, bounds.xmin],
                [bounds.ymax, bounds.xmax],
            ],
            {
                padding: [20, 20],
                animate: true, // bật animation
                duration: 1, // thời gian (giây)
                easeLinearity: 0.25, // độ mượt (0 → 1)
            },
        );
    }

    /**
     * Cap nhat trang thai nut toggle WMS (internal)
     * @private
     */
    _updateToggleButtonState(wmsId, isVisible) {
        const btn = document.getElementById(`wms-toggle-${wmsId}`);
        if (btn) {
            const icon = btn.querySelector("i");
            if (icon) {
                icon.className = isVisible ? "bi bi-eye-fill" : "bi bi-eye";
            }
            btn.title = isVisible ? "An lop" : "Hien lop";
        }
    }
}
