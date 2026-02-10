// ========================================
// MAP CONFIGURATION
// ========================================

/**
 * Default configuration for map application
 */
const DEFAULT_MAP_CONFIG = {
    // Map settings
    map: {
        center: null, // null = auto from WMS, or [lat, lng]
        zoom: 6,
        minZoom: 2,
        maxZoom: 20,
    },

    // Tile layer settings (default basemap)
    tileLayer: {
        url: "http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}",
        options: {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
        },
    },

    // Basemap options
    basemaps: {
        default: "googleSatellite", // ID của basemap mặc định
        options: [
            {
                id: "googleSatellite",
                name: "Google Satellite",
                url: "http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}",
                options: {
                    maxZoom: 20,
                    subdomains: ["mt0", "mt1", "mt2", "mt3"],
                    attribution: "Google Maps"
                }
            },
            {
                id: "googleStreets",
                name: "Google Streets",
                url: "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
                options: {
                    maxZoom: 20,
                    subdomains: ["mt0", "mt1", "mt2", "mt3"],
                    attribution: "Google Maps"
                }
            },
            {
                id: "googleHybrid",
                name: "Google Hybrid",
                url: "http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
                options: {
                    maxZoom: 20,
                    subdomains: ["mt0", "mt1", "mt2", "mt3"],
                    attribution: "Google Maps"
                }
            },
            {
                id: "osm",
                name: "OpenStreetMap",
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                options: {
                    maxZoom: 19,
                    attribution: "OpenStreetMap contributors"
                }
            },
            {
                id: "cartoDB",
                name: "CartoDB Light",
                url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
                options: {
                    maxZoom: 19,
                    attribution: "CartoDB"
                }
            }
        ]
    },

    // WMS settings
    wms: {
        ranhgioiUrl: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
        ranhgioiLayers: [
            "ws_ranhgioi:rg_vn_tinh_2025",
            "ws_ranhgioi:rg_vn_xa_2025",
        ],
    },

    // Point Manager settings
    pointManager: {
        enableDefaultPoints: true,
        defaultIconSize: 32,
        popupEnabled: true,
    },

    // Sketch Manager settings
    sketchManager: {
        enableSave: true,
        enableMerge: true,
        enableSplit: true,
        maxElements: 1,
        apiEndpoint: "/api/polygons/save",
        redirectAfterSave: false,
    },

    // Sidebar settings
    sidebar: {
        containerId: "sidebar",
        defaultMode: "pinned", // "offcanvas" | "pinned"
        panels: {
            filter: { enabled: true, order: 1 },
            wms: { enabled: true, order: 2 },
            points: { enabled: true, order: 3 },
            sketch: { enabled: true, order: 4 },
        },
    },

    // Map Controls settings
    mapControls: {
        enabled: true,
        position: "topleft",
        buttons: [
            {
                id: "map-ctrl-tools",
                icon: "bi-tools",
                title: "Cong cu",
                action: "toggleSidebar",
            },
            {
                id: "map-ctrl-basemap",
                icon: "bi-layers",
                title: "Chon nen ban do",
                action: "toggleBasemap",
            },
            {
                id: "map-ctrl-fullscreen",
                icon: "bi-fullscreen",
                title: "Toan man hinh",
                action: "toggleFullscreen",
            },
        ],
    },
};

/**
 * Generate unique ID
 */
function uniqid(prefix = "", moreEntropy = false) {
    const sec = Date.now() * 1000 + Math.random() * 1000;
    const id = sec.toString(16).replace(/\./g, "").padEnd(14, "0");
    return `${prefix}${id}${moreEntropy ? "." + Math.trunc(Math.random() * 100000000) : ""}`;
}

function toFixedLengthNumberString(value, length, options = {}) {
    const {
        padChar = "0",
        truncate = false,
        truncateFrom = "left",
        keepSign = true,
    } = options;

    let num = String(value);
    let sign = "";

    if (keepSign && num.startsWith("-")) {
        sign = "-";
        num = num.slice(1);
    }

    if (truncate && num.length > length) {
        num =
            truncateFrom === "right"
                ? num.slice(0, length)
                : num.slice(-length);
    }

    num = num.padStart(length, padChar);

    return sign + num;
}

/**
 * Generate default WMS layers configuration
 */
function generateDefaultWMSLayers(wmsUrl) {
    return [
        {
            id: uniqid("wms_id_", true),
            name: "Ranh gioi tinh",
            url: wmsUrl,
            layer: "ws_ranhgioi:rg_vn_tinh_2025",
            version: "1.1.1",
            defaultVisible: true,
            zoomPriority: 10,
            zIndex: 1,
        },
        {
            id: uniqid("wms_id_", true),
            name: "Ranh gioi xa",
            url: wmsUrl,
            layer: "ws_ranhgioi:rg_vn_xa_2025",
            version: "1.1.1",
            defaultVisible: false,
            zoomPriority: 9,
            zIndex: 1,
        },
    ];
}
