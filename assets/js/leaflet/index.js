// ========================================
// APPLICATION INITIALIZATION
// ========================================

/**
 * Initialize the main map application
 * This file demonstrates how to use the MapApp class
 */

// Create map instance - element IDs sinh dong tu containerId "map"
const mapApp = new MapApp("map", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        // Custom WMS layers specific to this instance
        wmsLayers: [
            {
                id: uniqid("wms_id_", true),
                name: "F4_DBR_2024:hanoi",
                url: "https://wms.tanmaixanh.vn:8453/geoserver/F4_DBR_2024/wms",
                layer: "F4_DBR_2024:hanoi",
                version: "1.1.1",
                defaultVisible: false,
                zoomPriority: 8,
                zIndex: 2,
                // Auto-filter by province/commune: specify attribute names in the GeoServer layer
                filterConfig: {
                    provinceField: "matinh", // attribute name for province code
                    communeField: "maxa",   // attribute name for commune code
                },
            },
        ],
    },
    // Custom handler for province change - for additional logic beyond auto-filtering
    // Note: Layers with filterConfig are auto-filtered by province/commune automatically
    onProvinceChange: async ({ provinceCode }) => {
        console.log(`Province changed to: ${provinceCode || 'none'}`);
    },
    // Custom handler for commune change - for additional logic beyond auto-filtering
    onCommuneChange: async ({ communeCode }) => {
        console.log(`Commune changed to: ${communeCode || 'none'}`);
    },
});

// Initialize the map
mapApp.init().then(() => {
    // Populate VN2000 zone options sau khi map san sang
    initCoordSystemSelect();
});

// Expose to global scope for HTML onclick handlers
window.mapApp = mapApp;

// ========================================
// COORDINATE SYSTEM HELPERS
// ========================================

/**
 * Initialize coordinate system select options
 * Populate VN2000 zone options tu CoordinateConverter
 */
function initCoordSystemSelect() {
    const selectElement = document.getElementById(mapApp.elementIds.pointCoordSystem);
    if (!selectElement) return;

    // Clear existing options
    selectElement.innerHTML = "";

    // Get options from mapApp
    const options = mapApp.getCoordSystemOptions();
    options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        selectElement.appendChild(optionElement);
    });

    // Add change event listener
    selectElement.addEventListener("change", handleCoordSystemChange);

    // Trigger initial update
    handleCoordSystemChange();
}

/**
 * Handle coordinate system change
 * Updates form labels based on selected system
 */
function handleCoordSystemChange() {
    const ids = mapApp.elementIds;
    const selectElement = document.getElementById(ids.pointCoordSystem);
    if (!selectElement) return;

    const selectedValue = selectElement.value;
    const isWGS84 = selectedValue === "WGS84";

    // Update labels
    const label1 = document.getElementById(ids.pointCoord1Label);
    const label2 = document.getElementById(ids.pointCoord2Label);

    if (label1) {
        label1.textContent = isWGS84 ? "Kinh do (Lng)" : "X (Dong)";
    }
    if (label2) {
        label2.textContent = isWGS84 ? "Vi do (Lat)" : "Y (Bac)";
    }

    // Update placeholders
    const input1 = document.getElementById(ids.pointCoord1);
    const input2 = document.getElementById(ids.pointCoord2);

    if (input1) {
        input1.placeholder = isWGS84 ? "VD: 105.8542" : "VD: 580000";
    }
    if (input2) {
        input2.placeholder = isWGS84 ? "VD: 21.0285" : "VD: 2330000";
    }

    // Store current system in mapApp
    mapApp.setCoordinateSystem(selectedValue);
}

// ========================================
// EXAMPLE: MULTIPLE MAP INSTANCES
// ========================================
/*
// You can create multiple map instances like this:

const mapApp1 = new MapApp('map-container-1', {
    config: DEFAULT_MAP_CONFIG,
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
});
mapApp2.init();

// Access map instances
window.mapApps = {
    main: mapApp1,
    secondary: mapApp2
};
*/
