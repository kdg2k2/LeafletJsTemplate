// ========================================
// BIEN TOAN CUC
// ========================================
function uniqid(prefix = "", moreEntropy = false) {
    const sec = Date.now() * 1000 + Math.random() * 1000;
    const id = sec.toString(16).replace(/\./g, "").padEnd(14, "0");
    return `${prefix}${id}${moreEntropy ? "." + Math.trunc(Math.random() * 100000000) : ""}`;
}

var filterScope = {
    province_c: null,
    commune_c: null,
};

const WMS_RANHGIOI = [
    "ws_ranhgioi:rg_vn_tinh_2025",
    "ws_ranhgioi:rg_vn_xa_2025",
];

const WMS_URL_RANHGIOI =
    "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms";

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
// KHOI TAO BAN DO
// ========================================
const basemapHybrid = L.tileLayer(
    "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    { maxZoom: 20, attribution: "" },
);

const map = L.map("map", {
    center: [21.0245, 105.85],
    zoom: 6,
    layers: [basemapHybrid],
});

// ========================================
// KHOI TAO MANAGERS
// ========================================
const wmsManager = new WMSLayerManager(map, DEFAULT_WMS_LAYERS);
const pointManager = new PointManager(map, {
    enableDefaultPoints: true,
    defaultIconSize: 32,
    popupEnabled: true,
});

// Render WMS list + load mac dinh
wmsManager.initializeWMSList(document.getElementById("wmsListContainer"));
wmsManager.loadDefaultWMSLayers();

// ========================================
// LOC TINH / XA -> CQL FILTER -> WMS
// ========================================
// Xu ly chon tinh
document
    .getElementById("province_code")
    .addEventListener("change", async (e) => {
        const provinceCode = e.target.value;

        // Cap nhat filterScope
        filterScope.province_c = provinceCode || null;
        filterScope.commune_c = null;

        // Reset select xa
        await loadCommuneListByProvince(provinceCode);

        // Xoa highlight cu
        clearHighlights();

        if (provinceCode) {
            // Cap nhat WMS ranh gioi tinh voi CQL filter
            const cqlTinh = `matinh='${provinceCode}'`;
            await wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
                cqlTinh,
                true,
            );

            // Bat lop ranh gioi xa voi CQL filter cung tinh
            const cqlXa = `matinh='${provinceCode}'`;
            await wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cqlXa,
                false,
            );
        } else {
            // Reset ve mac dinh: ranh tinh khong filter, an ranh xa
            await wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_tinh_2025",
                null,
                false,
            );

            // Xoa ranh xa
            const xaConfig = wmsManager.getWmsConfigWithNameLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
            );
            if (xaConfig) wmsManager.removeWMSLayer(xaConfig.id);
        }
    });

// Xu ly chon xa
document
    .getElementById("commune_code")
    .addEventListener("change", async (e) => {
        const communeCode = e.target.value;

        // Cap nhat filterScope
        filterScope.commune_c = communeCode || null;

        // Xoa highlight cu
        clearHighlights();

        if (communeCode) {
            // Cap nhat WMS ranh gioi xa voi CQL filter theo xa
            const cqlXa = `maxa='${communeCode}'`;
            await wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cqlXa,
                true,
            );

            // Highlight ranh xa
            await wmsManager.highlightSelectedFeature(
                wmsManager.getWmsConfigWithNameLayer(
                    "ws_ranhgioi:rg_vn_xa_2025",
                ),
                cqlXa,
            );
        } else if (filterScope.province_c) {
            // Quay lai hien tat ca xa cua tinh
            const cqlXa = `matinh='${filterScope.province_c}'`;
            await wmsManager.updateWMSLayer(
                "ws_ranhgioi:rg_vn_xa_2025",
                cqlXa,
                false,
            );

            // Zoom lai ve tinh
            const cqlTinh = `matinh='${filterScope.province_c}'`;
            await wmsManager.zoomToFilteredExtent(
                WMS_URL_RANHGIOI,
                "ws_ranhgioi:rg_vn_tinh_2025",
                cqlTinh,
            );
        }
    });

// Reset bo loc
function resetFilter() {
    document.getElementById("province_code").value = "";
    document.getElementById("commune_code").value = "";
    fillSelect("commune_code", [], "code", "name", "[Chon xa/phuong]");

    filterScope.province_c = null;
    filterScope.commune_c = null;

    clearHighlights();

    // Reset WMS layers
    wmsManager.updateWMSLayer("ws_ranhgioi:rg_vn_tinh_2025", null, false);
    const xaConfig = wmsManager.getWmsConfigWithNameLayer(
        "ws_ranhgioi:rg_vn_xa_2025",
    );
    if (xaConfig) wmsManager.removeWMSLayer(xaConfig.id);

    map.flyTo([21.0245, 105.85], 6, { duration: 0.5 });
}

// Load danh sach tinh khi trang tai xong
loadProvinceList();

// ========================================
// TRUY VAN WFS (test)
// ========================================
let lastFetchedGeoJSON = null;

async function testFetchGeoJSON() {
    const layerName = document.getElementById("layerName").value;
    const cqlFilter = document.getElementById("cqlFilter").value || null;
    const maxFeatures =
        parseInt(document.getElementById("maxFeatures").value) || 10;

    const wfsUrl = wmsManager.wfsUtil.generateWFSUrl(WMS_URL_RANHGIOI);

    try {
        const geojson = await wmsManager.wfsUtil.fetchFeatureGeoJSON(
            wfsUrl,
            layerName,
            cqlFilter,
            maxFeatures,
        );
        lastFetchedGeoJSON = geojson;
    } catch (error) {
        console.error("Loi:", error);
    }
}

async function testHighlight() {
    if (!lastFetchedGeoJSON) return;
    wmsManager.wfsUtil.highlightPolygonOnMap(
        map,
        lastFetchedGeoJSON,
        "testHighlight",
    );
}

function testZoomToBounds() {
    if (
        !lastFetchedGeoJSON ||
        !lastFetchedGeoJSON.features ||
        lastFetchedGeoJSON.features.length === 0
    )
        return;
    const bounds = wmsManager.wfsUtil.calculateBounds(
        lastFetchedGeoJSON.features,
    );
    map.fitBounds(
        [
            [bounds.ymin, bounds.xmin],
            [bounds.ymax, bounds.xmax],
        ],
        { padding: [20, 20] },
    );
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
// QUAN LY DIEM
// ========================================
function renderPointList() {
    const container = document.getElementById("pointListContainer");
    const points = pointManager.getAllPoints();
    if (points.length === 0) {
        container.innerHTML =
            '<div class="text-muted small text-center py-1">Chua co diem nao</div>';
        return;
    }
    let html =
        '<div class="list-group list-group-flush" style="font-size:0.8rem;">';
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
renderPointList();

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
    const point = pointManager.getPoint(pointId);
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
// SKETCH MANAGER - MODULE 4
// ========================================
const sketchManager = new SketchManager(map, {
    enableSave: true,
    enableMerge: true,
    enableSplit: true,
    apiEndpoint: "/api/polygons/save",
    redirectAfterSave: false,
});

sketchManager.initialize();

// ========================================
// WFS CLICK HANDLER - Che do GetFeatureInfo
// ========================================
const wfsClickHandler = (event) => {
    wmsManager.handleMapClick(event);
};

// Register handler with sketch manager so it can be disabled/restored
sketchManager.setWFSClickHandler(wfsClickHandler);

// Initially attach WFS click handler
map.on("click", wfsClickHandler);

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
