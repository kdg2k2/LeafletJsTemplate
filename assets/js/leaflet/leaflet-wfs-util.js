/**
 * Module 1: WFSUtil
 * Cung cap cac ham truy van WFS service va xu ly GeoJSON.
 * Day la module doc lap, khong phu thuoc vao Leaflet map.
 */
class WFSUtil {
    constructor(options = {}) {
        this.options = {
            defaultMaxFeatures: options.defaultMaxFeatures || 1000,
            timeout: options.timeout || 5000,
        };
    }

    /**
     * Chuyen WMS URL thanh WFS URL
     * @param {string} wmsUrl - VD: "https://server/geoserver/ws/wms"
     * @returns {string} - VD: "https://server/geoserver/ws/wfs"
     */
    generateWFSUrl(wmsUrl) {
        return wmsUrl.replace(/\/wms\/?$/i, "/wfs");
    }

    /**
     * Truy van WFS va tra ve GeoJSON
     * @param {string} wfsUrl - URL cua WFS service
     * @param {string} typeName - Ten layer, VD: "_2025_EUDR:land_use_status_data"
     * @param {string|null} cqlFilter - CQL filter, VD: "province_c='01'"
     * @param {number|null} maxFeatures - Ghi de so feature toi da
     * @param {Object} additionalParams - Tham so bo sung
     * @returns {Promise<Object>} GeoJSON FeatureCollection
     */
    async fetchFeatureGeoJSON(wfsUrl, typeName, cqlFilter = null, maxFeatures = null, additionalParams = {}) {
        const params = new URLSearchParams({
            service: "WFS",
            version: "1.1.0",
            request: "GetFeature",
            typeName: typeName,
            outputFormat: "application/json",
            srsName: "EPSG:4326",
            maxFeatures: String(maxFeatures || this.options.defaultMaxFeatures),
        });

        if (cqlFilter) {
            params.append("CQL_FILTER", cqlFilter);
        }

        Object.entries(additionalParams).forEach(([key, value]) => {
            params.append(key, value);
        });

        const url = `${wfsUrl}?${params.toString()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            const text = await response.text();

            if (text.trim().startsWith("<")) {
                throw new Error("WFS tra ve XML error: " + text.substring(0, 200));
            }

            return JSON.parse(text);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error("WFS request timeout sau " + this.options.timeout + "ms");
            }
            throw error;
        }
    }

    /**
     * Tinh bounding box tu danh sach GeoJSON features
     * @param {Array} features - Mang cac GeoJSON features
     * @returns {Object} { xmin, ymin, xmax, ymax }
     */
    calculateBounds(features) {
        let xmin = Infinity,
            ymin = Infinity,
            xmax = -Infinity,
            ymax = -Infinity;

        const processCoord = (coord) => {
            const [x, y] = coord;
            if (x < xmin) xmin = x;
            if (x > xmax) xmax = x;
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
        };

        const processCoords = (coords, type) => {
            switch (type) {
                case "Point":
                    processCoord(coords);
                    break;
                case "LineString":
                case "MultiPoint":
                    coords.forEach((c) => processCoord(c));
                    break;
                case "Polygon":
                case "MultiLineString":
                    coords.forEach((ring) => ring.forEach((c) => processCoord(c)));
                    break;
                case "MultiPolygon":
                    coords.forEach((polygon) =>
                        polygon.forEach((ring) => ring.forEach((c) => processCoord(c)))
                    );
                    break;
            }
        };

        features.forEach((feature) => {
            if (feature.geometry) {
                processCoords(feature.geometry.coordinates, feature.geometry.type);
            }
        });

        return { xmin, ymin, xmax, ymax };
    }

    /**
     * Tinh trung tam tu danh sach features
     * @param {Array} features - Mang cac GeoJSON features
     * @returns {Object} { longitude, latitude }
     */
    calculateCenterFromFeatures(features) {
        let totalX = 0,
            totalY = 0,
            count = 0;

        const processCoord = (coord) => {
            totalX += coord[0];
            totalY += coord[1];
            count++;
        };

        const processCoords = (coords, type) => {
            switch (type) {
                case "Point":
                    processCoord(coords);
                    break;
                case "LineString":
                case "MultiPoint":
                    coords.forEach((c) => processCoord(c));
                    break;
                case "Polygon":
                case "MultiLineString":
                    coords.forEach((ring) => ring.forEach((c) => processCoord(c)));
                    break;
                case "MultiPolygon":
                    coords.forEach((polygon) =>
                        polygon.forEach((ring) => ring.forEach((c) => processCoord(c)))
                    );
                    break;
            }
        };

        features.forEach((feature) => {
            if (feature.geometry) {
                processCoords(feature.geometry.coordinates, feature.geometry.type);
            }
        });

        if (count === 0) {
            return { longitude: 105.85, latitude: 21.0245 };
        }

        return {
            longitude: totalX / count,
            latitude: totalY / count,
        };
    }

    /**
     * Highlight polygon tren Leaflet map
     * @param {L.Map} map - Leaflet map instance
     * @param {Object} geojson - GeoJSON data
     * @param {string} layerId - ID de quan ly layer
     * @param {Object} styleOptions - Style tuy chinh
     */
    highlightPolygonOnMap(map, geojson, layerId = "highlightLayer", styleOptions = {}) {
        if (!map._highlightLayers) {
            map._highlightLayers = {};
        }

        if (map._highlightLayers[layerId]) {
            map.removeLayer(map._highlightLayers[layerId]);
            delete map._highlightLayers[layerId];
        }

        const defaultStyle = {
            fillColor: "#fff7bc",
            fillOpacity: 0.3,
            color: "#ffff86",
            weight: 2,
        };

        const style = { ...defaultStyle, ...styleOptions };

        const layer = L.geoJSON(geojson, { style: () => style });
        layer.addTo(map);

        map._highlightLayers[layerId] = layer;

        return layer;
    }

    /**
     * Query features voi nhieu filter
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     * @param {Object} filters - Object chua filter, VD: { province_c: '01', status: ['active', 'pending'] }
     * @returns {Promise<Object>} GeoJSON
     */
    async queryFeaturesWithFilters(wmsUrl, layerName, filters = {}) {
        const wfsUrl = this.generateWFSUrl(wmsUrl);
        const cqlParts = [];

        Object.entries(filters).forEach(([key, value]) => {
            if (value === null || value === undefined) return;

            if (Array.isArray(value)) {
                if (value.length > 0) {
                    const inValues = value.map((v) => `'${v}'`).join(",");
                    cqlParts.push(`${key} IN (${inValues})`);
                }
            } else {
                cqlParts.push(`${key}='${value}'`);
            }
        });

        const cqlFilter = cqlParts.length > 0 ? cqlParts.join(" AND ") : null;

        return this.fetchFeatureGeoJSON(wfsUrl, layerName, cqlFilter);
    }

    /**
     * Lay danh sach gia tri unique cua 1 field
     * @param {string} wmsUrl - WMS URL
     * @param {string} layerName - Ten layer
     * @param {string} fieldName - Ten field
     * @param {string|null} additionalFilter - CQL filter bo sung
     * @returns {Promise<Array>} Mang gia tri unique da sort
     */
    async getUniqueValues(wmsUrl, layerName, fieldName, additionalFilter = null) {
        const wfsUrl = this.generateWFSUrl(wmsUrl);
        const geojson = await this.fetchFeatureGeoJSON(wfsUrl, layerName, additionalFilter);

        const uniqueValues = new Set();

        if (geojson && geojson.features) {
            geojson.features.forEach((feature) => {
                if (feature.properties && feature.properties[fieldName] !== null && feature.properties[fieldName] !== undefined) {
                    uniqueValues.add(feature.properties[fieldName]);
                }
            });
        }

        return Array.from(uniqueValues).sort();
    }
}
