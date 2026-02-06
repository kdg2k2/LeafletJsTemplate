/**
 * Module 3: PointManager
 * Quan ly cac diem marker tren ban do voi icon tuy chinh, popup, bat/tat hien thi.
 * Phu thuoc: Leaflet
 */
class PointManager {
    /**
     * @param {L.Map} map - Leaflet map instance
     * @param {Object} options - Cau hinh
     */
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            enableDefaultPoints: options.enableDefaultPoints !== undefined ? options.enableDefaultPoints : true,
            defaultIconSize: options.defaultIconSize || 32,
            popupEnabled: options.popupEnabled !== undefined ? options.popupEnabled : true,
        };
        this.points = new Map(); // Map<pointId, { marker, config }>
        this.pointLayerGroup = null;
        this.initializeLayer();

        if (this.options.enableDefaultPoints) {
            this.loadDefaultPoints();
        }
    }

    /**
     * Tao LayerGroup va add vao map
     */
    initializeLayer() {
        this.pointLayerGroup = L.featureGroup().addTo(this.map);
    }

    /**
     * Load diem Hoang Sa va Truong Sa
     */
    loadDefaultPoints() {
        this.addPoint({
            name: "Quan dao Hoang Sa",
            longitude: 112.0,
            latitude: 16.5,
            iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            iconSize: this.options.defaultIconSize,
            description: '<div class="text-center"><strong>Quan dao Hoang Sa</strong><br><small>Viet Nam</small></div>',
        });

        this.addPoint({
            name: "Quan dao Truong Sa",
            longitude: 114.0,
            latitude: 10.0,
            iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            iconSize: this.options.defaultIconSize,
            description: '<div class="text-center"><strong>Quan dao Truong Sa</strong><br><small>Viet Nam</small></div>',
        });
    }

    /**
     * Them 1 diem marker moi
     * @param {Object} pointConfig
     * @returns {string} pointId
     */
    addPoint(pointConfig) {
        const {
            id = null,
            name = "",
            longitude,
            latitude,
            iconUrl = null,
            iconSize = this.options.defaultIconSize,
            description = "",
            attributes = {},
        } = pointConfig;

        if (longitude === undefined || latitude === undefined) {
            console.error("PointManager: longitude va latitude la bat buoc");
            return null;
        }

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            console.error("PointManager: toa do khong hop le", { longitude, latitude });
            return null;
        }

        const pointId = id || this.generatePointId();

        let markerOptions = {};
        if (iconUrl) {
            markerOptions.icon = L.icon({
                iconUrl: iconUrl,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize],
                popupAnchor: [0, -iconSize],
            });
        }

        const marker = L.marker([latitude, longitude], markerOptions);

        if (description && this.options.popupEnabled) {
            marker.bindPopup(description);
        }

        this.pointLayerGroup.addLayer(marker);

        this.points.set(pointId, {
            marker,
            config: { id: pointId, name, longitude, latitude, iconUrl, iconSize, description, attributes },
        });

        return pointId;
    }

    /**
     * Xoa 1 diem
     * @param {string} pointId
     * @returns {boolean}
     */
    removePoint(pointId) {
        const point = this.points.get(pointId);
        if (!point) return false;

        this.pointLayerGroup.removeLayer(point.marker);
        this.points.delete(pointId);
        return true;
    }

    /**
     * Bat/tat hien thi 1 diem
     * @param {string} pointId
     * @param {boolean|null} visible - null = toggle
     */
    togglePointVisibility(pointId, visible = null) {
        const point = this.points.get(pointId);
        if (!point) return;

        const isOnMap = this.pointLayerGroup.hasLayer(point.marker);
        const shouldShow = visible !== null ? visible : !isOnMap;

        if (shouldShow && !isOnMap) {
            this.pointLayerGroup.addLayer(point.marker);
        } else if (!shouldShow && isOnMap) {
            this.pointLayerGroup.removeLayer(point.marker);
        }
    }

    /**
     * Bat/tat toan bo point layer
     * @param {boolean|null} visible - null = toggle
     */
    toggleLayerVisibility(visible = null) {
        const isOnMap = this.map.hasLayer(this.pointLayerGroup);
        const shouldShow = visible !== null ? visible : !isOnMap;

        if (shouldShow && !isOnMap) {
            this.map.addLayer(this.pointLayerGroup);
        } else if (!shouldShow && isOnMap) {
            this.map.removeLayer(this.pointLayerGroup);
        }
    }

    /**
     * Lay thong tin 1 diem
     * @param {string} pointId
     * @returns {Object|undefined}
     */
    getPoint(pointId) {
        return this.points.get(pointId);
    }

    /**
     * Lay tat ca cac diem
     * @returns {Array} Mang cac { pointId, marker, config }
     */
    getAllPoints() {
        const result = [];
        this.points.forEach((value, key) => {
            result.push({ pointId: key, ...value });
        });
        return result;
    }

    /**
     * Xoa tat ca cac diem
     */
    clearAllPoints() {
        this.pointLayerGroup.clearLayers();
        this.points.clear();
    }

    /**
     * Phong to den 1 diem
     * @param {string} pointId
     * @param {number} zoomLevel
     */
    async zoomToPoint(pointId, zoomLevel = 10) {
        const point = this.points.get(pointId);
        if (!point) return;

        this.map.flyTo(point.marker.getLatLng(), zoomLevel, { duration: 0.5 });
    }

    /**
     * Phong to de hien tat ca cac diem
     */
    async zoomToAllPoints() {
        if (this.points.size === 0) return;

        const bounds = this.pointLayerGroup.getBounds();
        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    /**
     * Them nhieu diem cung luc
     * @param {Array} pointsArray - Mang cac pointConfig
     * @returns {Array} Mang cac pointId
     */
    addMultiplePoints(pointsArray) {
        return pointsArray.map((config) => this.addPoint(config));
    }

    /**
     * Tao ID duy nhat cho diem
     * @returns {string}
     */
    generatePointId() {
        return `point_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Huy bo PointManager, xoa tat ca layers va event
     */
    destroy() {
        this.clearAllPoints();
        if (this.pointLayerGroup) {
            this.map.removeLayer(this.pointLayerGroup);
            this.pointLayerGroup = null;
        }
    }
}
