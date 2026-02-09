// ========================================
// COORDINATE SYSTEM UTILITIES
// ========================================

/**
 * CoordinateConverter - Utility for converting between coordinate systems using API
 * Uses vn2000.vn API for coordinate conversion
 * Requires: fetch.js (http.getExternal)
 */
class CoordinateConverter {
    constructor() {
        this.apiBaseUrl = "https://vn2000.vn/api";

        // Central meridians for common VN2000 zones
        this.centralMeridians = {
            mui3: {
                103: 103,
                104: 104,
                105: 105,
                106: 106,
                107: 107,
                108: 108,
            },
            mui6: {
                102: 102,
                105: 105,
                108: 108,
            },
        };
    }

    /**
     * Get VN2000 zone options for select dropdown
     * @returns {Array} Array of zone options
     */
    getZoneOptions() {
        return [
            { value: "WGS84", label: "WGS84 (Kinh/Vi do)" },
            { value: "VN2000_MUI3", label: "VN2000 Mui 3" },
            { value: "VN2000_MUI6", label: "VN2000 Mui 6" },
        ];
    }

    /**
     * Parse coordinate system from select value
     * @param {string} systemValue - Value from select (e.g., "VN2000_MUI3")
     * @returns {Object} {type, muichieu, kinhtuyentruc}
     */
    parseCoordSystem(systemValue) {
        if (systemValue === "WGS84") {
            return { type: "WGS84" };
        }

        if (systemValue === "VN2000_MUI3") {
            return { type: "VN2000", muichieu: 3 };
        }

        if (systemValue === "VN2000_MUI6") {
            return { type: "VN2000", muichieu: 6 };
        }

        return { type: "WGS84" };
    }

    /**
     * Suggest central meridian based on longitude and zone type
     * @param {number} lng - Longitude
     * @param {number} muichieu - Zone type (3 or 6)
     * @returns {number} Central meridian
     */
    suggestCentralMeridian(lng, muichieu = 3) {
        if (muichieu === 6) {
            if (lng < 103.5) return 102;
            if (lng < 106.5) return 105;
            return 108;
        } else {
            // muichieu = 3
            const options = [103, 104, 105, 106, 107, 108];
            let closest = options[0];
            let minDiff = Math.abs(lng - closest);

            for (const meridian of options) {
                const diff = Math.abs(lng - meridian);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = meridian;
                }
            }

            return closest;
        }
    }

    /**
     * Convert from VN2000 to WGS84 using API
     * @param {number} x - VN2000 X (easting)
     * @param {number} y - VN2000 Y (northing)
     * @param {number} muichieu - Zone type (3 or 6)
     * @param {number} kinhtuyentruc - Central meridian
     * @returns {Promise<Object>} {lng, lat} or null
     */
    async vn2000ToWGS84(x, y, muichieu, kinhtuyentruc) {
        if (isNaN(x) || isNaN(y)) {
            console.error("Invalid coordinates");
            return null;
        }

        try {
            const apiUrl = `${this.apiBaseUrl}/vn2000sangwgs84`;
            const response = await http.getExternal(apiUrl, {
                x: x,
                y: y,
                muichieu: muichieu,
                kinhtuyentruc: kinhtuyentruc,
            });

            if (response.success && response.data) {
                return {
                    lng: response.data.kinhdo || response.data.lng,
                    lat: response.data.vido || response.data.lat,
                };
            }

            console.error("API conversion failed:", response.message);
            return null;
        } catch (error) {
            console.error("VN2000 to WGS84 conversion error:", error);
            return null;
        }
    }

    /**
     * Convert from WGS84 to VN2000 using API
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @param {number} muichieu - Zone type (3 or 6)
     * @param {number} kinhtuyentruc - Central meridian
     * @returns {Promise<Object>} {x, y} or null
     */
    async wgs84ToVN2000(lng, lat, muichieu, kinhtuyentruc) {
        if (isNaN(lng) || isNaN(lat)) {
            console.error("Invalid coordinates");
            return null;
        }

        try {
            const apiUrl = `${this.apiBaseUrl}/wgs84sangvn2000`;
            const response = await http.getExternal(apiUrl, {
                vido: lat,
                kinhdo: lng,
                muichieu: muichieu,
                kinhtuyentruc: kinhtuyentruc,
            });

            if (response.success && response.data) {
                return {
                    x: response.data.x,
                    y: response.data.y,
                };
            }

            console.error("API conversion failed:", response.message);
            return null;
        } catch (error) {
            console.error("WGS84 to VN2000 conversion error:", error);
            return null;
        }
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
