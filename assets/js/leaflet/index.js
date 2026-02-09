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
mapApp.init().then(() => {
    // Initialize coordinate system select after map is ready
    initCoordSystemSelect();
});

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
    const coord1 = parseFloat(document.getElementById("pointCoord1").value);
    const coord2 = parseFloat(document.getElementById("pointCoord2").value);
    const name = document.getElementById("pointName").value || "";
    const coordSystemSelect = document.getElementById("pointCoordSystem");
    const coordSystem = coordSystemSelect
        ? coordSystemSelect.value
        : "EPSG:4326";

    const id = mapApp.addPointWithCoordSystem(coord1, coord2, name, coordSystem);

    if (id) {
        // Clear form
        document.getElementById("pointCoord1").value = "";
        document.getElementById("pointCoord2").value = "";
        document.getElementById("pointName").value = "";
    }
}

/**
 * Add point at current location
 * Called from HTML button onclick
 */
async function addCurrentLocationPoint() {
    const btn = document.getElementById("currentLocationBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML =
            '<i class="bi bi-hourglass-split"></i> Dang xac dinh...';
    }

    try {
        await mapApp.addCurrentLocationPoint();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML =
                '<i class="bi bi-geo-alt-fill"></i> Vi tri hien tai';
        }
    }
}

/**
 * Handle coordinate system change
 * Updates form labels based on selected system
 */
function handleCoordSystemChange() {
    const selectElement = document.getElementById("pointCoordSystem");
    if (!selectElement) return;

    const selectedValue = selectElement.value;
    const isWGS84 = selectedValue === "EPSG:4326";

    // Update labels
    const label1 = document.getElementById("pointCoord1Label");
    const label2 = document.getElementById("pointCoord2Label");

    if (label1) {
        label1.textContent = isWGS84 ? "Kinh do (Lng)" : "X (Dong)";
    }
    if (label2) {
        label2.textContent = isWGS84 ? "Vi do (Lat)" : "Y (Bac)";
    }

    // Update placeholders
    const input1 = document.getElementById("pointCoord1");
    const input2 = document.getElementById("pointCoord2");

    if (input1) {
        input1.placeholder = isWGS84 ? "VD: 105.8542" : "VD: 500000";
    }
    if (input2) {
        input2.placeholder = isWGS84 ? "VD: 21.0285" : "VD: 2300000";
    }

    // Store current system in mapApp
    mapApp.setCoordinateSystem(selectedValue);
}

/**
 * Initialize coordinate system select options
 */
function initCoordSystemSelect() {
    const selectElement = document.getElementById("pointCoordSystem");
    if (!selectElement) return;

    // Clear existing options
    selectElement.innerHTML = "";

    // Add WGS84 option
    const wgs84Option = document.createElement("option");
    wgs84Option.value = "EPSG:4326";
    wgs84Option.textContent = "WGS84 (Kinh/Vi do)";
    selectElement.appendChild(wgs84Option);

    // Add VN2000 zones
    const zones = mapApp.getVN2000Zones();
    zones.forEach((zone) => {
        const option = document.createElement("option");
        option.value = `EPSG:${zone.epsg_code}`;
        option.textContent = `${zone.zone_name} (${zone.provinces})`;
        selectElement.appendChild(option);
    });

    // Add change event listener
    selectElement.addEventListener("change", handleCoordSystemChange);

    // Trigger initial update
    handleCoordSystemChange();
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
