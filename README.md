# Leaflet Map Template

Template ban do tuong tac dua tren Leaflet.js, thiet ke cho ung dung GIS Viet Nam. Ho tro quan ly lop WMS, ve polygon, loc theo dia gioi hanh chinh, chuyen doi toa do VN2000.

---

## Muc luc

1. [Cau truc thu muc](#1-cau-truc-thu-muc)
2. [Cai dat nhanh](#2-cai-dat-nhanh)
3. [Kien truc tong quan](#3-kien-truc-tong-quan)
4. [Cau hinh (map-config.js)](#4-cau-hinh-map-configjs)
5. [Khoi tao ung dung (index.js)](#5-khoi-tao-ung-dung-indexjs)
6. [Them lop WMS tu GeoServer](#6-them-lop-wms-tu-geoserver)
7. [Tu dong loc WMS theo tinh/xa](#7-tu-dong-loc-wms-theo-tinhxa)
8. [Them menu sidebar tuy chinh](#8-them-menu-sidebar-tuy-chinh)
9. [Quan ly diem (Point)](#9-quan-ly-diem-point)
10. [Ve polygon (Sketch)](#10-ve-polygon-sketch)
11. [Chuyen doi toa do VN2000](#11-chuyen-doi-toa-do-vn2000)
12. [Chon nen ban do (Basemap)](#12-chon-nen-ban-do-basemap)
13. [Tich hop vao Laravel Blade](#13-tich-hop-vao-laravel-blade)
14. [Nhieu ban do tren 1 trang](#14-nhieu-ban-do-tren-1-trang)
15. [API cong khai cua MapApp](#15-api-cong-khai-cua-mapapp)
16. [Luu y quan trong](#16-luu-y-quan-trong)

---

## 1. Cau truc thu muc

```
LeafletJsTemplate/
├── map.html                              # File HTML mau
├── README.md
└── assets/js/
    ├── http-request/
    │   └── fetch.js                      # HTTP client (ho tro Laravel CSRF)
    ├── auto-fill/
    │   └── fill-select.js                # Util dien du lieu vao <select>
    ├── province-commune-select/
    │   └── events.js                     # Load danh sach tinh/xa tu API
    └── leaflet/
        ├── leaflet-wfs-util.js           # Module 1: WFS query & GeoJSON
        ├── leaflet-wms-manager.js        # Module 2: Quan ly lop WMS
        ├── leaflet-point-manager.js      # Module 3: Quan ly diem/marker
        ├── leaflet-sketch-manager.js     # Module 4: Ve polygon, cat, gop
        ├── leaflet-control-manager.js    # Module 5: Quan ly panel sidebar
        ├── leaflet-map-controls.js       # Module 5.5: Nut dieu khien + layout
        ├── coordinate-utils.js           # Module 6: Chuyen doi toa do
        ├── map-config.js                 # Module 7: Cau hinh mac dinh
        ├── map-core.js                   # Module 8: Class MapApp (loi chinh)
        └── index.js                      # Module 9: Diem khoi tao ung dung
```

---

## 2. Cai dat nhanh

### Buoc 1: Copy thu muc `assets/` vao du an

### Buoc 2: Tao file HTML

Chi can 1 the `<div id="map">`, moi thu con lai (sidebar, offcanvas, layout) deu duoc JS tu dong tao.

```html
<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ban do</title>

    <!-- CSS (bat buoc) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" />

    <style>
        html, body { height: 100%; overflow: hidden; }
        #map { height: calc(98vh - 40px); width: 100%; border-radius: 0.375rem; }
        .panel-scroll { height: 98vh; overflow-y: auto; }
        #sidebar-offcanvas .panel-scroll { height: auto; overflow-y: visible; }
        .wms-feature-popup .leaflet-popup-content-wrapper {
            padding: 0; border-radius: 6px; overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        .wms-feature-popup .leaflet-popup-content { margin: 0; line-height: 1.4; }
    </style>
</head>
<body class="bg-light">

    <div class="container-fluid mt-2">
        <div class="card shadow-sm h-100">
            <div class="card-header py-1">
                <h6 class="mb-0 small">
                    <i class="bi bi-geo-alt-fill text-danger"></i> Ban do
                </h6>
            </div>
            <div class="card-body p-1">
                <div id="map"></div>    <!-- Chi can the nay -->
            </div>
        </div>
    </div>

    <!-- JS: Thu vien ben ngoai -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/@turf/turf@7/turf.min.js"></script>
    <script src="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js"></script>

    <!-- JS: Cac module (THU TU LOAD RAT QUAN TRONG) -->
    <script src="assets/js/leaflet/leaflet-wfs-util.js"></script>
    <script src="assets/js/leaflet/leaflet-wms-manager.js"></script>
    <script src="assets/js/leaflet/leaflet-point-manager.js"></script>
    <script src="assets/js/leaflet/leaflet-sketch-manager.js"></script>
    <script src="assets/js/http-request/fetch.js"></script>
    <script src="assets/js/auto-fill/fill-select.js"></script>
    <script src="assets/js/province-commune-select/events.js"></script>
    <script src="assets/js/leaflet/coordinate-utils.js"></script>
    <script src="assets/js/leaflet/leaflet-control-manager.js"></script>
    <script src="assets/js/leaflet/leaflet-map-controls.js"></script>
    <script src="assets/js/leaflet/map-config.js"></script>
    <script src="assets/js/leaflet/map-core.js"></script>
    <script src="assets/js/leaflet/index.js"></script>
</body>
</html>
```

### Buoc 3: Mo file HTML trong trinh duyet

Ban do se tu dong hien thi voi day du chuc nang.

---

## 3. Kien truc tong quan

```
MapApp (map-core.js) ← Lop chinh, dieu phoi moi thu
  ├── WMSLayerManager     ← Quan ly cac lop ban do WMS
  │     └── WFSUtil       ← Truy van WFS, tinh bounds, highlight
  ├── PointManager        ← Quan ly diem/marker tren ban do
  ├── SketchManager       ← Ve polygon, cat, gop, luu
  ├── ControlManager      ← Tao sidebar panels dong
  └── SidebarLayoutManager ← Chuyen doi offcanvas <-> ghim sidebar
```

**Luong khoi tao:**

```
new MapApp("map", options)
    │
    ├── 1. _initMap()            → Tao Leaflet map + basemap tile layer
    ├── 2. _ensureSidebarElement() → Tao <div id="sidebar"> neu chua co
    ├── 3. _initSidebar()        → Dang ky 4 panel mac dinh + custom panels
    ├── 4. _initMapControls()    → Tao layout + nut dieu khien goc trai
    ├── 5. _initManagers()       → Khoi tao WMS, Point, Sketch managers
    ├── 6. _attachEventListeners() → Gan su kien chon tinh/xa
    └── 7. _loadInitialData()    → Load danh sach tinh, zoom mac dinh
```

---

## 4. Cau hinh (map-config.js)

File `map-config.js` chua doi tuong `DEFAULT_MAP_CONFIG`. Ban co the ghi de tung phan khi khoi tao.

```javascript
const DEFAULT_MAP_CONFIG = {
    // Vi tri ban do
    map: {
        center: null,       // null = tu dong, hoac [lat, lng] VD: [21.0285, 105.8542]
        zoom: 6,
        minZoom: 2,
        maxZoom: 20,
    },

    // Tile layer mac dinh (hien thi truoc khi nguoi dung chon basemap)
    tileLayer: {
        url: "http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        options: { maxZoom: 20, subdomains: ["mt0", "mt1", "mt2", "mt3"] },
    },

    // Danh sach nen ban do co the chon
    basemaps: {
        default: "googleHybrid",
        options: [
            { id: "googleSatellite", name: "Google Satellite", url: "...lyrs=s..." },
            { id: "googleStreets",   name: "Google Streets",   url: "...lyrs=m..." },
            { id: "googleHybrid",    name: "Google Hybrid",    url: "...lyrs=y..." },
            { id: "osm",            name: "OpenStreetMap",    url: "..." },
            { id: "cartoDB",        name: "CartoDB Light",    url: "..." },
        ],
    },

    // WMS ranh gioi hanh chinh (mac dinh)
    wms: {
        ranhgioiUrl: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
        ranhgioiLayers: [
            "ws_ranhgioi:rg_vn_tinh_2025",
            "ws_ranhgioi:rg_vn_xa_2025",
        ],
    },

    // Quan ly diem
    pointManager: {
        enableDefaultPoints: true,   // Hien diem Hoang Sa, Truong Sa
        defaultIconSize: 32,
        popupEnabled: true,
    },

    // Cong cu ve
    sketchManager: {
        enableSave: true,
        enableMerge: true,           // Cho phep gop polygon
        enableSplit: true,           // Cho phep cat polygon
        maxElements: 1,              // 0 = khong gioi han
        apiEndpoint: "/api/polygons/save",
    },

    // Sidebar
    sidebar: {
        containerId: "sidebar",
        defaultMode: "pinned",       // "offcanvas" hoac "pinned"
        panels: {
            filter:  { enabled: true, order: 1 },   // Loc theo tinh/xa
            wms:     { enabled: true, order: 2 },   // Quan ly lop WMS
            points:  { enabled: true, order: 3 },   // Quan ly diem
            sketch:  { enabled: true, order: 4 },   // Ve polygon
        },
    },

    // Nut dieu khien tren ban do
    mapControls: {
        enabled: true,
        position: "topleft",
        buttons: [
            { id: "map-ctrl-tools",      icon: "bi-tools",      action: "toggleSidebar" },
            { id: "map-ctrl-basemap",    icon: "bi-layers",     action: "toggleBasemap" },
            { id: "map-ctrl-fullscreen", icon: "bi-fullscreen", action: "toggleFullscreen" },
        ],
    },
};
```

### Tat chuc nang khong can

```javascript
const mapApp = new MapApp("map", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        sidebar: {
            ...DEFAULT_MAP_CONFIG.sidebar,
            panels: {
                filter: { enabled: true, order: 1 },
                wms:    { enabled: true, order: 2 },
                points: { enabled: false },          // Tat quan ly diem
                sketch: { enabled: false },          // Tat ve polygon
            },
        },
    },
});
```

---

## 5. Khoi tao ung dung (index.js)

### Toi gian nhat

```javascript
const mapApp = new MapApp("map", {
    config: DEFAULT_MAP_CONFIG,
});
mapApp.init();
window.mapApp = mapApp;
```

### Day du options

```javascript
const mapApp = new MapApp("map", {
    // Cau hinh ban do
    config: {
        ...DEFAULT_MAP_CONFIG,
        map: { center: [21.0285, 105.8542], zoom: 10 },  // Ghi de vi tri
        wmsLayers: [ /* Them lop WMS tuy chinh (xem muc 6) */ ],
    },

    // Callback khi chon tinh (sau khi auto-filter da chay)
    onProvinceChange: async ({ provinceCode, filterScope, wmsManager }) => {
        console.log("Ma tinh:", provinceCode);
    },

    // Callback khi chon xa
    onCommuneChange: async ({ communeCode, filterScope, wmsManager }) => {
        console.log("Ma xa:", communeCode);
    },

    // Panel sidebar tuy chinh (xem muc 8)
    sidebarPanels: [],
});

mapApp.init().then(() => {
    console.log("Ban do da san sang");
});
window.mapApp = mapApp;
```

---

## 6. Them lop WMS tu GeoServer

Khai bao trong `config.wmsLayers` khi tao MapApp:

```javascript
const mapApp = new MapApp("map", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        wmsLayers: [
            {
                id: uniqid("wms_id_", true),   // ID duy nhat (bat buoc)
                name: "Su dung dat Ha Noi",    // Ten hien thi trong sidebar
                url: "https://geoserver.example.com/geoserver/workspace/wms",
                layer: "workspace:ten_layer",  // Ten layer tren GeoServer
                version: "1.1.1",
                defaultVisible: true,          // true = hien khi load trang
                zoomPriority: 8,               // Do uu tien khi click (cao = uu tien)
                zIndex: 2,                     // Thu tu chong (cao = nam tren)
            },
            // Them nhieu layer...
        ],
    },
});
```

### Cac truong cau hinh WMS layer

| Truong | Bat buoc | Mo ta |
|--------|----------|-------|
| `id` | Co | ID duy nhat, dung `uniqid("wms_id_", true)` |
| `name` | Co | Ten hien thi trong danh sach sidebar |
| `url` | Co | URL WMS endpoint cua GeoServer |
| `layer` | Co | Ten layer dang `workspace:layer_name` |
| `version` | Khong | Phien ban WMS, mac dinh `"1.1.1"` |
| `defaultVisible` | Khong | Hien thi khi load trang, mac dinh `false` |
| `zoomPriority` | Khong | Do uu tien khi click query, mac dinh `0` |
| `zIndex` | Khong | Thu tu chong lop, mac dinh `1` |
| `cqlFilter` | Khong | CQL filter co dinh (luon ap dung) |
| `filterConfig` | Khong | Auto-filter theo tinh/xa (xem muc 7) |

---

## 7. Tu dong loc WMS theo tinh/xa

Khi nguoi dung chon tinh hoac xa, cac lop WMS co `filterConfig` se tu dong duoc loc ma khong can viet code xu ly.

### Cach dung

Them `filterConfig` vao cau hinh WMS layer:

```javascript
{
    id: uniqid("wms_id_", true),
    name: "Rung Ha Noi",
    url: "https://geoserver.example.com/geoserver/workspace/wms",
    layer: "workspace:rung_hanoi",
    defaultVisible: true,
    zIndex: 2,
    filterConfig: {
        provinceField: "matinh",    // Ten attribute ma tinh trong GeoServer
        communeField: "maxa",       // Ten attribute ma xa trong GeoServer
    },
}
```

### Cach hoat dong

| Nguoi dung chon | CQL Filter tu dong ap dung |
|-----------------|---------------------------|
| Tinh "01" (Ha Noi) | `matinh='01'` |
| Xa "00001" | `maxa='00001'` |
| Xoa xa (con tinh) | `matinh='01'` (quay ve loc theo tinh) |
| Xoa tat ca | Xoa filter, hien toan bo du lieu |

### Luu y

- Ten truong (`provinceField`, `communeField`) phai khop voi ten attribute trong layer tren GeoServer.
- Filter duoc luu lai khi bat/tat layer (toggle), khi bat lai se tu dong ap dung filter cu.
- Neu can xu ly them logic ngoai auto-filter, dung callback `onProvinceChange` / `onCommuneChange`.

---

## 8. Them menu sidebar tuy chinh

Sidebar mac dinh co 4 panel: Loc dia gioi, WMS, Quan ly diem, Ve polygon. Ban co the them panel tuy chinh qua `sidebarPanels`:

```javascript
const mapApp = new MapApp("map", {
    config: DEFAULT_MAP_CONFIG,
    sidebarPanels: [
        {
            id: "thong-ke",                // ID duy nhat
            title: "Thong ke dien tich",   // Tieu de hien thi
            icon: "bi-bar-chart-fill",     // Icon Bootstrap (xem https://icons.getbootstrap.com)
            iconColor: "text-info",        // Mau icon (Bootstrap class)
            collapsible: true,             // Cho phep thu gon
            collapsed: true,              // Mac dinh thu gon
            order: 5,                      // Vi tri (mac dinh: filter=1, wms=2, points=3, sketch=4)
            render: (body) => {
                // body la <div> container, ban tu do tao noi dung HTML
                body.innerHTML = `
                    <div class="mb-2">
                        <strong>Tong dien tich:</strong>
                        <span id="total-area">0 ha</span>
                    </div>
                    <button class="btn btn-sm btn-primary w-100"
                            onclick="tinhToanDienTich()">
                        <i class="bi bi-calculator"></i> Tinh toan
                    </button>
                `;
            },
        },
        {
            id: "tim-kiem",
            title: "Tim kiem thua dat",
            icon: "bi-search",
            iconColor: "text-success",
            order: 1.5,                   // Xen giua filter (1) va WMS (2)
            collapsed: false,             // Mo san
            render: (body) => {
                body.innerHTML = `
                    <input type="text" class="form-control form-control-sm mb-2"
                           placeholder="Nhap so thua..." id="search-input">
                    <button class="btn btn-sm btn-success w-100" onclick="timThuaDat()">
                        <i class="bi bi-search"></i> Tim
                    </button>
                `;
            },
        },
    ],
});
```

### Meo

- Dung `order` so thap phan (VD: `1.5`, `2.5`) de xen panel giua cac panel mac dinh.
- `render(body)` chi chay 1 lan khi sidebar duoc tao. Dung `document.getElementById(...)` de cap nhat noi dung sau do.

---

## 9. Quan ly diem (Point)

### Them diem bang code

```javascript
// Them diem voi toa do WGS84
const pointId = mapApp.addPoint(21.0285, 105.8542, "Ha Noi");

// Them diem voi toa do VN2000
await mapApp.addPointWithCoordSystem(580000, 2330000, "Diem A", "VN2000_MUI3_105");

// Them vi tri hien tai (GPS)
await mapApp.addCurrentLocationPoint("Vi tri cua toi");

// Xoa diem
mapApp.removePoint(pointId);

// Zoom den 1 diem
mapApp.zoomToPoint(pointId, 15);

// Zoom den tat ca diem
mapApp.zoomToAllPoints();

// An/hien tat ca diem
mapApp.toggleAllPoints();

// Xoa tat ca diem
mapApp.clearAllPoints();
```

### Cau hinh Point

```javascript
config: {
    ...DEFAULT_MAP_CONFIG,
    pointManager: {
        enableDefaultPoints: false,  // Tat diem Hoang Sa, Truong Sa
        defaultIconSize: 24,         // Kich thuoc icon (px)
        popupEnabled: true,          // Hien popup khi click
    },
}
```

---

## 10. Ve polygon (Sketch)

Chuc nang ve duoc tich hop san trong sidebar panel "Ve va chinh sua".

### Cac thao tac

| Thao tac | Mo ta |
|----------|-------|
| **Ve polygon** | Click nut "Ve polygon" > click cac diem tren ban do > double-click de ket thuc |
| **Chon polygon** | Click nut "Chon" > click vao polygon da ve (vien xanh = da chon) |
| **Chinh sua** | Click nut "Sua" > keo cac dinh cua polygon |
| **Gop polygon** | Chon 2+ polygon > click "Gop" (dung `turf.union`) |
| **Cat polygon** | Chon 1 polygon > click "Cat" > ve duong cat > polygon bi chia doi |
| **Xoa** | Chon polygon > click "Xoa da chon" |
| **Luu** | Click "Luu" > POST du lieu len API |

### Cau hinh Sketch

```javascript
config: {
    ...DEFAULT_MAP_CONFIG,
    sketchManager: {
        enableSave: true,
        enableMerge: true,
        enableSplit: true,
        maxElements: 0,                        // 0 = khong gioi han polygon
        apiEndpoint: "/api/polygons/save",     // URL API luu du lieu
        redirectAfterSave: false,
        redirectUrl: null,
    },
}
```

### Du lieu gui len API khi luu

```javascript
// POST /api/polygons/save
{
    polygonData: [{
        id: "polygon_1234567890",
        name: "polygon_...",
        geom: "POLYGON((105.1 21.0, 105.2 21.0, 105.2 21.1, 105.1 21.0))",  // WKT
        srid: 4326,
        area: "1.2345",           // Don vi hecta
        centroid_longitude: 105.15,
        centroid_latitude: 21.05,
        properties: { type: "manual", createdAt: "2025-..." }
    }],
    filterScope: { province_c: "01", commune_c: "00001" }
}
```

---

## 11. Chuyen doi toa do VN2000

Template ho tro chuyen doi giua WGS84 (kinh/vi do) va VN2000 (X/Y met) qua API `vn2000.vn`.

### He toa do ho tro

| He toa do | Don vi | Vi du |
|-----------|--------|-------|
| WGS84 | Do thap phan | Lng: 105.8542, Lat: 21.0285 |
| VN2000 Mui 3 | Met | X: 580000, Y: 2330000 |
| VN2000 Mui 6 | Met | X: 580000, Y: 2330000 |

### Su dung trong code

```javascript
const converter = mapApp.coordConverter;

// WGS84 → VN2000
const vn = await converter.wgs84ToVN2000(105.8542, 21.0285, 3, 105);
// vn = { x: 580123.45, y: 2328567.89 }

// VN2000 → WGS84
const wgs = await converter.vn2000ToWGS84(580000, 2330000, 3, 105);
// wgs = { lng: 105.854, lat: 21.028 }
```

---

## 12. Chon nen ban do (Basemap)

Nguoi dung click nut **Layers** (goc trai ban do) de mo bang chon nen ban do voi anh preview.

### Them basemap moi

```javascript
config: {
    ...DEFAULT_MAP_CONFIG,
    basemaps: {
        default: "googleHybrid",
        options: [
            ...DEFAULT_MAP_CONFIG.basemaps.options,
            // Them basemap moi:
            {
                id: "esriSatellite",
                name: "Esri Satellite",
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                options: { maxZoom: 18, attribution: "Esri" },
            },
        ],
    },
}
```

### Chuyen basemap bang code

```javascript
mapApp.switchBasemap("osm");
```

---

## 13. Tich hop vao Laravel Blade

### resources/views/map.blade.php

```blade
@extends('layouts.app')

@section('styles')
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" />
<style>
    #map { height: calc(98vh - 40px); width: 100%; border-radius: 0.375rem; }
    .panel-scroll { height: 98vh; overflow-y: auto; }
    #sidebar-offcanvas .panel-scroll { height: auto; overflow-y: visible; }
    .wms-feature-popup .leaflet-popup-content-wrapper {
        padding: 0; border-radius: 6px; overflow: hidden;
    }
    .wms-feature-popup .leaflet-popup-content { margin: 0; }
</style>
@endsection

@section('content')
<div class="container-fluid mt-2">
    <div class="card shadow-sm h-100">
        <div class="card-header py-1">
            <h6 class="mb-0 small">
                <i class="bi bi-geo-alt-fill text-danger"></i> Ban do
            </h6>
        </div>
        <div class="card-body p-1">
            <div id="map"></div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/@turf/turf@7/turf.min.js"></script>
<script src="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js"></script>

<script src="{{ asset('assets/js/leaflet/leaflet-wfs-util.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/leaflet-wms-manager.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/leaflet-point-manager.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/leaflet-sketch-manager.js') }}"></script>
<script src="{{ asset('assets/js/http-request/fetch.js') }}"></script>
<script src="{{ asset('assets/js/auto-fill/fill-select.js') }}"></script>
<script src="{{ asset('assets/js/province-commune-select/events.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/coordinate-utils.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/leaflet-control-manager.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/leaflet-map-controls.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/map-config.js') }}"></script>
<script src="{{ asset('assets/js/leaflet/map-core.js') }}"></script>

{{-- Thay vi dung index.js, khai bao truc tiep o day --}}
<script>
const mapApp = new MapApp("map", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        sketchManager: {
            ...DEFAULT_MAP_CONFIG.sketchManager,
            apiEndpoint: "{{ route('polygons.save') }}",  // Route Laravel
        },
        wmsLayers: [
            {
                id: uniqid("wms_id_", true),
                name: "Du lieu du an",
                url: "{{ config('geoserver.url') }}/wms",
                layer: "{{ config('geoserver.workspace') }}:{{ config('geoserver.layer') }}",
                defaultVisible: true,
                zIndex: 2,
                filterConfig: {
                    provinceField: "matinh",
                    communeField: "maxa",
                },
            },
        ],
    },
});

mapApp.init();
window.mapApp = mapApp;
</script>
@endsection
```

---

## 14. Nhieu ban do tren 1 trang

Moi MapApp instance doc lap, chi can container ID khac nhau:

```html
<div id="map1" style="height: 400px"></div>
<div id="map2" style="height: 400px"></div>

<script>
const map1 = new MapApp("map1", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        map: { center: [21.0285, 105.8542], zoom: 10 },
    },
});

const map2 = new MapApp("map2", {
    config: {
        ...DEFAULT_MAP_CONFIG,
        map: { center: [10.7769, 106.7009], zoom: 10 },
    },
});

map1.init();
map2.init();
</script>
```

Moi element ID tu dong sinh theo container ID (`map1-province-select`, `map2-province-select`,...) nen khong bi trung.

---

## 15. API cong khai cua MapApp

### Truy cap cac manager

```javascript
const map          = mapApp.getMap();            // Leaflet L.Map instance
const wmsManager   = mapApp.getWMSManager();     // WMSLayerManager
const pointManager = mapApp.getPointManager();   // PointManager
const sketchManager = mapApp.getSketchManager(); // SketchManager
```

### Dieu khien ban do

```javascript
// Zoom
mapApp.zoomToDefaultExtent();
mapApp.switchBasemap("osm");

// Filter
mapApp.resetFilter();
mapApp.getFilterScope();  // { province_c: "01", commune_c: null }

// Highlight
mapApp.clearHighlights();
```

### Thao tac WMS nang cao

```javascript
const wms = mapApp.getWMSManager();

// Them layer dong
wms.createAndAddWMSLayer({
    id: "temp-layer",
    name: "Lop tam",
    url: "https://...",
    layer: "workspace:layer",
    zIndex: 3,
});

// Cap nhat filter
await wms.updateWMSLayer("workspace:layer", "status='active'", true);

// Xoa layer
wms.removeWmsLayerByNameLayer("workspace:layer");

// Zoom den extent cua layer
await wms.zoomToFilteredExtent("https://...", "workspace:layer", "matinh='01'");
```

---

## 16. Luu y quan trong

### Thu tu load script

Cac file JS phai duoc load **dung thu tu** vi khong dung ES Modules. Neu load sai thu tu se gap loi `ReferenceError: ... is not defined`.

### Toa do Leaflet

Leaflet dung thu tu `[lat, lng]` (vi do truoc, kinh do sau), khac voi nhieu he thong GIS khac dung `[lng, lat]`.

```javascript
// Dung
L.marker([21.0285, 105.8542])     // [lat, lng]
map.flyTo([21.0285, 105.8542])

// Sai
L.marker([105.8542, 21.0285])     // [lng, lat] ← SE BI SAI VI TRI
```

### CQL Filter

Khi viet CQL filter cho GeoServer:
- Gia tri chuoi phai dung dau nhay don: `"matinh='01'"`
- Nhieu dieu kien dung AND: `"(matinh='01') AND (status='active')"`

### Map resize

Khi thay doi kich thuoc container chua ban do (an/hien sidebar, tab,...), goi:

```javascript
mapApp.getMap().invalidateSize();
```

### Ma tinh/xa

- Ma tinh: chuoi 2 ky tu, co pad 0 (VD: `"01"`, `"48"`)
- Ma xa: chuoi 5 ky tu, co pad 0 (VD: `"00001"`, `"26734"`)
