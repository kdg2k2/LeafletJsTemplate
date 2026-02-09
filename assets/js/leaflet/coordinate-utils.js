// ========================================
// COORDINATE SYSTEM UTILITIES
// ========================================

/**
 * CoordinateConverter - Utility for converting between coordinate systems
 * Requires: proj4.js and vn2000.js to be loaded
 */
class CoordinateConverter {
    constructor() {
        this.wgs84 = "EPSG:4326";
        this.defaultVN2000 = "EPSG:5897"; // VN-2000 / TM-3 105-00 (Hanoi area)
    }

    /**
     * Check if proj4 is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof proj4 !== "undefined";
    }

    /**
     * Convert coordinates from one system to another
     * @param {number} x - X coordinate (or longitude)
     * @param {number} y - Y coordinate (or latitude)
     * @param {string} fromEPSG - Source EPSG code (e.g., "EPSG:4326")
     * @param {string} toEPSG - Target EPSG code
     * @returns {Object} {x, y} or null if conversion fails
     */
    convert(x, y, fromEPSG, toEPSG) {
        if (!this.isAvailable()) {
            console.warn("proj4 is not available");
            return null;
        }

        if (isNaN(x) || isNaN(y)) {
            return null;
        }

        try {
            // If same system, return as-is
            if (fromEPSG === toEPSG) {
                return { x, y };
            }

            const result = proj4(fromEPSG, toEPSG, [x, y]);
            return {
                x: result[0],
                y: result[1],
            };
        } catch (error) {
            console.error("Coordinate conversion error:", error);
            return null;
        }
    }

    /**
     * Convert from VN2000 to WGS84
     * @param {number} x - VN2000 X (easting)
     * @param {number} y - VN2000 Y (northing)
     * @param {string} vn2000EPSG - VN2000 zone EPSG code
     * @returns {Object} {lng, lat} or null
     */
    vn2000ToWGS84(x, y, vn2000EPSG) {
        const result = this.convert(x, y, vn2000EPSG, this.wgs84);
        if (!result) return null;
        return {
            lng: result.x,
            lat: result.y,
        };
    }

    /**
     * Convert from WGS84 to VN2000
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @param {string} vn2000EPSG - VN2000 zone EPSG code
     * @returns {Object} {x, y} or null
     */
    wgs84ToVN2000(lng, lat, vn2000EPSG) {
        return this.convert(lng, lat, this.wgs84, vn2000EPSG);
    }

    /**
     * Get all available VN2000 zones
     * @returns {Array}
     */
    getVN2000Zones() {
        if (typeof VN2000_ZONES === "undefined") {
            return [];
        }
        return VN2000_ZONES;
    }

    /**
     * Find VN2000 zone by EPSG code
     * @param {number} epsgCode
     * @returns {Object|null}
     */
    findZoneByEPSG(epsgCode) {
        const zones = this.getVN2000Zones();
        return zones.find((z) => z.epsg_code === epsgCode) || null;
    }

    /**
     * Suggest best VN2000 zone for a WGS84 coordinate
     * Based on longitude proximity to zone's central meridian
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @returns {Object|null} VN2000 zone object
     */
    suggestVN2000Zone(lng, lat) {
        const zones = this.getVN2000Zones();
        if (zones.length === 0) return null;

        let bestZone = null;
        let minDiff = Infinity;

        zones.forEach((zone) => {
            // Extract central meridian from proj4 definition
            const match = zone.proj4_defs.match(/\+lon_0=([\d.]+)/);
            if (match) {
                const centralMeridian = parseFloat(match[1]);
                const diff = Math.abs(lng - centralMeridian);

                if (diff < minDiff) {
                    minDiff = diff;
                    bestZone = zone;
                }
            }
        });

        return bestZone;
    }

    /**
     * Format coordinate for display
     * @param {number} value - Coordinate value
     * @param {string} system - "WGS84" or "VN2000"
     * @param {number} decimals - Number of decimal places
     * @returns {string}
     */
    formatCoordinate(value, system = "WGS84", decimals = null) {
        if (isNaN(value)) return "N/A";

        if (system === "WGS84") {
            decimals = decimals !== null ? decimals : 6;
        } else {
            decimals = decimals !== null ? decimals : 2;
        }

        return value.toFixed(decimals);
    }

    /**
     * Validate coordinate range
     * @param {number} value1 - First coordinate (lng or x)
     * @param {number} value2 - Second coordinate (lat or y)
     * @param {string} system - "WGS84" or "VN2000"
     * @returns {boolean}
     */
    validateCoordinates(value1, value2, system = "WGS84") {
        if (isNaN(value1) || isNaN(value2)) return false;

        if (system === "WGS84") {
            // Longitude: -180 to 180, Latitude: -90 to 90
            return (
                value1 >= -180 && value1 <= 180 && value2 >= -90 && value2 <= 90
            );
        } else {
            // VN2000: reasonable ranges for Vietnam
            // X (easting): typically 100,000 - 900,000
            // Y (northing): typically 1,000,000 - 3,000,000
            return (
                value1 >= 0 &&
                value1 <= 1000000 &&
                value2 >= 0 &&
                value2 <= 4000000
            );
        }
    }
}

// ========================================
// GEOLOCATION UTILITY
// ========================================

/**
 * GeolocationHelper - Helper for getting user's current location
 */
class GeolocationHelper {
    /**
     * Check if geolocation is supported
     * @returns {boolean}
     */
    static isSupported() {
        return "geolocation" in navigator;
    }

    /**
     * Get current position
     * @param {Object} options - Geolocation options
     * @returns {Promise<Object>} {lat, lng, accuracy}
     */
    static getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject(new Error("Geolocation is not supported"));
                return;
            }

            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
                ...options,
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp,
                    });
                },
                (error) => {
                    let message = "Unable to get location";
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = "User denied geolocation permission";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = "Location information unavailable";
                            break;
                        case error.TIMEOUT:
                            message = "Location request timed out";
                            break;
                    }
                    reject(new Error(message));
                },
                defaultOptions,
            );
        });
    }

    /**
     * Watch position changes
     * @param {Function} callback - Called with position on each update
     * @param {Function} errorCallback - Called on error
     * @param {Object} options - Geolocation options
     * @returns {number} Watch ID (use to clear watch)
     */
    static watchPosition(callback, errorCallback, options = {}) {
        if (!this.isSupported()) {
            if (errorCallback) {
                errorCallback(new Error("Geolocation is not supported"));
            }
            return null;
        }

        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            ...options,
        };

        return navigator.geolocation.watchPosition(
            (position) => {
                callback({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                if (errorCallback) {
                    errorCallback(error);
                }
            },
            defaultOptions,
        );
    }

    /**
     * Clear watch position
     * @param {number} watchId - Watch ID from watchPosition
     */
    static clearWatch(watchId) {
        if (watchId !== null && this.isSupported()) {
            navigator.geolocation.clearWatch(watchId);
        }
    }
}
