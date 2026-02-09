// ========================================
// APPLICATION INITIALIZATION
// ========================================

/**
 * Initialize the main map application
 * This file demonstrates how to use the MapApp class
 */

// Create map instance
const mapApp = new MapApp("map", {
    config: DEFAULT_MAP_CONFIG,
    wmsListContainerId: "wmsListContainer",
    pointListContainerId: "pointListContainer",
    provinceSelectId: "province_code",
    communeSelectId: "commune_code",
});

// Initialize the map
mapApp.init();

// Expose to global scope for HTML onclick handlers
window.mapApp = mapApp;

// ========================================
// GLOBAL HELPER FUNCTIONS FOR HTML
// ========================================

/**
 * Add a custom point from form inputs
 * Called from HTML button onclick
 */
function addCustomPoint() {
    const lat = parseFloat(document.getElementById("pointLat").value);
    const lng = parseFloat(document.getElementById("pointLng").value);
    const name = document.getElementById("pointName").value || "";

    const id = mapApp.addPoint(lat, lng, name);

    if (id) {
        // Clear form
        document.getElementById("pointLat").value = "";
        document.getElementById("pointLng").value = "";
        document.getElementById("pointName").value = "";
    }
}

/**
 * Toggle all points visibility
 * Called from HTML button onclick
 */
function toggleAllPoints() {
    mapApp.toggleAllPoints();
}

/**
 * Zoom to show all points
 * Called from HTML button onclick
 */
function zoomAllPoints() {
    mapApp.zoomToAllPoints();
}

/**
 * Clear all points from map
 * Called from HTML button onclick
 */
function clearAllPoints() {
    mapApp.clearAllPoints();
}

/**
 * Reset filter to default
 * Called from HTML button onclick
 */
function resetFilter() {
    mapApp.resetFilter();
}

/**
 * Toggle sketch mode
 * Called from HTML button onclick
 */
function toggleSketchMode() {
    mapApp.toggleSketchMode("sketch-toggle-btn");
}

// ========================================
// EXAMPLE: MULTIPLE MAP INSTANCES
// ========================================
/*
// You can create multiple map instances like this:

const mapApp1 = new MapApp('map-container-1', {
    config: DEFAULT_MAP_CONFIG,
    wmsListContainerId: 'wms-list-1',
    pointListContainerId: 'point-list-1',
    provinceSelectId: 'province-select-1',
    communeSelectId: 'commune-select-1'
});
mapApp1.init();

const mapApp2 = new MapApp('map-container-2', {
    config: {
        ...DEFAULT_MAP_CONFIG,
        map: {
            center: [21.0285, 105.8542], // Hanoi
            zoom: 10
        }
    },
    wmsListContainerId: 'wms-list-2',
    pointListContainerId: 'point-list-2',
    provinceSelectId: 'province-select-2',
    communeSelectId: 'commune-select-2'
});
mapApp2.init();

// Access map instances
window.mapApps = {
    main: mapApp1,
    secondary: mapApp2
};
*/
