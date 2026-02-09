// ========================================
// UTILITY FUNCTIONS
// ========================================
function uniqid(prefix = "", moreEntropy = false) {
    const sec = Date.now() * 1000 + Math.random() * 1000;
    const id = sec.toString(16).replace(/\./g, "").padEnd(14, "0");
    return `${prefix}${id}${moreEntropy ? "." + Math.trunc(Math.random() * 100000000) : ""}`;
}

// ========================================
// CONSTANTS - CAU HINH HE THONG
// ========================================
const WMS_RANHGIOI = [
    "ws_ranhgioi:rg_vn_tinh_2025",
    "ws_ranhgioi:rg_vn_xa_2025",
];

const WMS_URL_RANHGIOI = "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms";

const MAP_CENTER = null; // null = tu dong lay tu WMS defaultVisible, hoac [lat, lng]
const MAP_ZOOM = 6;

const DEFAULT_WMS_LAYERS = [
    {
        id: uniqid("wms_id_", true),
        name: "Ranh gioi tinh",
        url: WMS_URL_RANHGIOI,
        layer: "ws_ranhgioi:rg_vn_tinh_2025",
        version: "1.1.1",
        defaultVisible: true,
        zoomPriority: 10,
        zIndex: 1,
    },
    {
        id: uniqid("wms_id_", true),
        name: "Ranh gioi xa",
        url: WMS_URL_RANHGIOI,
        layer: "ws_ranhgioi:rg_vn_xa_2025",
        version: "1.1.1",
        defaultVisible: false,
        zoomPriority: 9,
        zIndex: 1,
    },
];

// ========================================
// GLOBAL VARIABLES - BIEN TOAN CUC
// ========================================
var filterScope = {
    province_c: null,
    commune_c: null,
};

// ========================================
// MAP INITIALIZATION - KHOI TAO BAN DO
// ========================================
const map = L.map("map", {
    center: MAP_CENTER || [0, 0],
    zoom: MAP_CENTER ? MAP_ZOOM : 2,
    layers: [
        L.tileLayer("http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }),
    ],
});

// ========================================
// MANAGERS INITIALIZATION - KHOI TAO MANAGERS
// ========================================
const wmsManager = new WMSLayerManager(map, DEFAULT_WMS_LAYERS);
const pointManager = new PointManager(map, {
    enableDefaultPoints: true,
    defaultIconSize: 32,
    popupEnabled: true,
});
const sketchManager = new SketchManager(map, {
    enableSave: true,
    enableMerge: true,
    enableSplit: true,
    maxElements: 1,
    apiEndpoint: "/api/polygons/save",
    redirectAfterSave: false,
});

// ========================================
// HELPER FUNCTIONS - CAC HAM HO TRO
// ========================================
function zoomToDefaultExtent() {
    if (MAP_CENTER) {
        map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.5 });
    } else {
        const config = DEFAULT_WMS_LAYERS.find((c) => c.defaultVisible);
        if (config) {
            wmsManager.zoomToFilteredExtent(config.url, config.layer, null);
        }
    }
}

function clearHighlights() {
    if (map._highlightLayers) {
        Object.keys(map._highlightLayers).forEach((key) => {
            map.removeLayer(map._highlightLayers[key]);
            delete map._highlightLayers[key];
        });
    }
}

// ========================================
// FILTER FUNCTIONS - XU LY LOC TINH/XA
// ========================================
function resetFilter() {
    document.getElementById("province_code").value = "";
    document.getElementById("commune_code").value = "";
    fillSelect("commune_code", [], "code", "name", "[Chon xa/phuong]");

    filterScope.province_c = null;
    filterScope.commune_c = null;

    clearHighlights();
    wmsManager.clearAllFilters();

    // Reset WMS layers
    wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_tinh_2025", null, false);
    wmsManager.removeWmsLayerByNameLayer("ws_ranhgioi:rg_vn_xa_2025");

    zoomToDefaultExtent();
}

async function handleProvinceChange(provinceCode) {
    // Cap nhat filterScope
    filterScope.province_c = provinceCode || null;
    filterScope.commune_c = null;

    // Reset select xa
    await loadCommuneListByProvince(provinceCode);
    clearHighlights();

    if (provinceCode) {
        // Cap nhat WMS ranh gioi tinh voi CQL filter
        const cqlTinh = `matinh='${provinceCode}'`;
        await wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_tinh_2025", cqlTinh, true);

        // Bat lop ranh gioi xa voi CQL filter cung tinh
        const cqlXa = `matinh='${provinceCode}'`;
        await wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_xa_2025", cqlXa, false);
    } else {
        // Reset ve mac dinh: ranh tinh khong filter, an ranh xa
        await wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_tinh_2025", null, false);
        wmsManager.removeWmsLayerByNameLayer("ws_ranhgioi:rg_vn_xa_2025");
    }
}

async function handleCommuneChange(communeCode) {
    // Cap nhat filterScope
    filterScope.commune_c = communeCode || null;
    clearHighlights();

    if (communeCode) {
        // Xoa lop ranh gioi tinh
        wmsManager.removeWmsLayerByNameLayer("ws_ranhgioi:rg_vn_tinh_2025");

        // Cap nhat WMS ranh gioi xa voi CQL filter theo xa
        await wmsManager.updateWMSLayer(
            "ws_ranhgioi:rg_vn_xa_2025",
            `maxa='${communeCode}'`,
            true,
        );
    } else if (filterScope.province_c) {
        // Quay lai hien tat ca xa cua tinh
        const cql = `matinh='${filterScope.province_c}'`;
        await wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_xa_2025", cql, false);

        // Zoom lai ve tinh
        await wmsManager.zoomToFilteredExtent(
            WMS_URL_RANHGIOI,
            "ws_ranhgioi:rg_vn_tinh_2025",
            cql,
        );
    }
}

// ========================================
// POINT MANAGEMENT - QUAN LY DIEM
// ========================================
function renderPointList() {
    const container = document.getElementById("pointListContainer");
    const points = pointManager.getAllPoints();

    if (points.length === 0) {
        container.innerHTML =
            '<div class="text-muted small text-center py-1">Chua co diem nao</div>';
        return;
    }

    let html = '<div class="list-group list-group-flush" style="font-size:0.8rem;">';
    points.forEach(({ pointId, config }) => {
        html += `<div class="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                    <span class="text-truncate me-1" style="max-width:120px;" title="${config.name}">${config.name}</span>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary py-0 px-1" onclick="pointManager.zoomToPoint('${pointId}', 8)" title="Phong to"><i class="bi bi-search"></i></button>
                        <button class="btn btn-outline-danger py-0 px-1" onclick="removeAndRefresh('${pointId}')" title="Xoa"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
}

function addCustomPoint() {
    const lat = parseFloat(document.getElementById("pointLat").value);
    const lng = parseFloat(document.getElementById("pointLng").value);
    const name =
        document.getElementById("pointName").value ||
        `Diem ${pointManager.points.size + 1}`;

    if (isNaN(lat) || isNaN(lng)) return;

    const id = pointManager.addPoint({
        name,
        latitude: lat,
        longitude: lng,
        description: `<div class="text-center"><strong>${name}</strong><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small></div>`,
    });

    if (id) {
        renderPointList();
        document.getElementById("pointLat").value = "";
        document.getElementById("pointLng").value = "";
        document.getElementById("pointName").value = "";
    }
}

function removeAndRefresh(pointId) {
    pointManager.removePoint(pointId);
    renderPointList();
}

function toggleAllPoints() {
    pointManager.toggleLayerVisibility();
}

function zoomAllPoints() {
    if (pointManager.points.size === 0) return;
    pointManager.zoomToAllPoints();
}

function clearAllPoints() {
    pointManager.clearAllPoints();
    renderPointList();
}

// ========================================
// SKETCH MANAGEMENT - QUAN LY VE
// ========================================
function toggleSketchMode() {
    const isVisible = sketchManager.toggle();
    const btn = document.getElementById("sketch-toggle-btn");

    if (isVisible) {
        btn.classList.remove("btn-warning");
        btn.classList.add("btn-info");
        btn.innerHTML = '<i class="bi bi-pencil"></i> Tat sketch tools';
    } else {
        btn.classList.remove("btn-info");
        btn.classList.add("btn-warning");
        btn.innerHTML = '<i class="bi bi-pencil"></i> Bat sketch tools';
    }
}

const wfsClickHandler = (event) => {
    wmsManager.handleMapClick(event);
};

// ========================================
// EVENT LISTENERS - DANG KY SU KIEN
// ========================================
// Filter tinh/xa
document
    .getElementById("province_code")
    .addEventListener("change", async (e) => {
        await handleProvinceChange(e.target.value);
    });

document
    .getElementById("commune_code")
    .addEventListener("change", async (e) => {
        await handleCommuneChange(e.target.value);
    });

// Map click handler for WMS GetFeatureInfo
map.on("click", wfsClickHandler);

// ========================================
// INITIALIZATION - KHOI TAO BAN DAU
// ========================================
// Initialize WMS Manager
wmsManager.initializeWMSList(document.getElementById("wmsListContainer"));
wmsManager.loadDefaultWMSLayers();

// Initialize Sketch Manager
sketchManager.initialize();
sketchManager.setWFSClickHandler(wfsClickHandler);

// Initialize Point Manager
renderPointList();

// Load province list
loadProvinceList();

// Zoom to default extent
zoomToDefaultExtent();
