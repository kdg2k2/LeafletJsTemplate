# KE HOACH BUILD 6 MODULE BAN DO LEAFLET - THAY THE ARCGIS

## Muc tieu
Xay dung lai toan bo 6 module ban do dang su dung ArcGIS Maps SDK 4.33 sang Leaflet, dam bao:
- Moi module 1 file JS rieng biet
- Tinh ke thua cao, de tai su dung
- Giu nguyen toan bo chuc nang cua ban ArcGIS goc
- Co the dung lam prompt de AI code truc tiep

## Thu vien can su dung
- **Leaflet 1.9.x** - Core map library
- **Leaflet-Geoman (leaflet.pm)** - Ve/chinh sua polygon (thay Sketch widget)
- **Turf.js** - Tinh toan hinh hoc (thay geometryEngine): union, cut/split, area, centroid
- **Proj4js** - Chuyen doi he toa do (da co san trong project)
- **Proj4Leaflet** - Tich hop proj4 vao Leaflet (optional)

## Cau truc file

```
/assets/js/leaflet/
  leaflet-map-core.js          -> Module 1: MapInstance
  leaflet-wfs-util.js          -> Module 2: WFSUtil
  leaflet-wms-manager.js       -> Module 3: WMSLayerManager
  leaflet-sketch-manager.js    -> Module 4: SketchManager
  leaflet-control-manager.js   -> Module 5: ControlManager
  leaflet-point-manager.js     -> Module 6: PointManager
```

Thu tu load file (quan trong vi co dependency):
```html
<!-- Thu vien ben ngoai -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/@turf/turf@7/turf.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" />
<script src="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js"></script>

<!-- 6 Module theo thu tu dependency -->
<script src="/assets/js/leaflet/leaflet-wfs-util.js"></script>
<script src="/assets/js/leaflet/leaflet-wms-manager.js"></script>
<script src="/assets/js/leaflet/leaflet-point-manager.js"></script>
<script src="/assets/js/leaflet/leaflet-sketch-manager.js"></script>
<script src="/assets/js/leaflet/leaflet-control-manager.js"></script>
<script src="/assets/js/leaflet/leaflet-map-core.js"></script>
```

---

## BIEN TOAN CUC (giu tuong thich voi code hien tai)

```js
const MAP_INSTANCES = new Map(); // Key: containerId, Value: MapInstance

const filterScope = {
    province_c: null,
    province: null,
    commune_c: null,
    commune: null,
    tt: null,
};

const WMS_RANHGIOI = [
    "ws_ranhgioi:rg_vn_tinh_2025",
    "ws_ranhgioi:rg_vn_xa_2025",
];

const DEFAULT_WMS_LAYERS = [
    {
        id: uniqid("wms_id_", true),
        name: "Ranh gioi tinh",
        url: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
        layer: "ws_ranhgioi:rg_vn_tinh_2025",
        version: "1.1.1",
        defaultVisible: true,
        zoomPriority: 10,
        zIndex: 1,
    },
    {
        id: uniqid("wms_id_", true),
        name: "Ranh gioi xa",
        url: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
        layer: "ws_ranhgioi:rg_vn_xa_2025",
        version: "1.1.1",
        defaultVisible: false,
        zoomPriority: 9,
        zIndex: 1,
    },
    {
        id: uniqid("wms_id_", true),
        name: "Hien trang su dung dat",
        url: "https://maps-152.ifee.edu.vn:8453/geoserver/_2025_EUDR/wms",
        layer: "_2025_EUDR:land_use_status_data",
        version: "1.1.1",
        defaultVisible: false,
        zoomPriority: 6,
        zIndex: 2,
    },
    {
        id: uniqid("wms_id_", true),
        name: "Ranh gioi vung trong",
        url: "https://maps-152.ifee.edu.vn:8453/geoserver/_2025_EUDR/wms",
        layer: "_2025_EUDR:gardens",
        version: "1.1.1",
        defaultVisible: false,
        zoomPriority: 7,
        zIndex: 1,
    },
];
```

Ham `uniqid()` va `DEFAULT_WMS_LAYERS` + `filterScope` + `WMS_RANHGIOI` dat trong file `leaflet-map-core.js` (giong ban goc).

---

## MODULE 1: leaflet-wfs-util.js - WFSUtil

### Muc dich
Cung cap cac ham truy van WFS service va xu ly GeoJSON. Day la module doc lap, khong phu thuoc vao Leaflet map.

### Class: WFSUtil

```js
class WFSUtil {
    constructor(options = {})
    // options: { defaultMaxFeatures: 1000, timeout: 5000 }
}
```

### Properties
| Property | Type | Default | Mo ta |
|----------|------|---------|-------|
| options.defaultMaxFeatures | number | 1000 | So feature toi da tra ve |
| options.timeout | number | 5000 | Timeout cho request (ms) |

### Methods

#### `generateWFSUrl(wmsUrl)`
- **Chuc nang**: Chuyen WMS URL thanh WFS URL
- **Input**: `wmsUrl` (string) - VD: `"https://server/geoserver/ws/wms"`
- **Output**: string - VD: `"https://server/geoserver/ws/wfs"`
- **Logic**: Replace `/wms` cuoi URL thanh `/wfs`

#### `async fetchFeatureGeoJSON(wfsUrl, typeName, cqlFilter = null, maxFeatures = null, additionalParams = {})`
- **Chuc nang**: Truy van WFS va tra ve GeoJSON
- **Input**:
  - `wfsUrl` (string) - URL cua WFS service
  - `typeName` (string) - Ten layer, VD: `"_2025_EUDR:land_use_status_data"`
  - `cqlFilter` (string|null) - CQL filter, VD: `"province_c='01'"`
  - `maxFeatures` (number|null) - Ghi de so feature toi da
  - `additionalParams` (Object) - Tham so bo sung
- **Output**: Promise<Object> - GeoJSON FeatureCollection
- **Logic**:
  1. Tao URLSearchParams voi: service=WFS, version=1.1.0, request=GetFeature, typeName, outputFormat=application/json, srsName=EPSG:4326, maxFeatures
  2. Neu co cqlFilter thi append CQL_FILTER
  3. Fetch voi AbortController timeout
  4. Kiem tra response: neu bat dau bang "<" thi la XML error -> throw
  5. Parse JSON va return
- **Error handling**: AbortError -> "WFS request timeout", khac -> re-throw

#### `calculateBounds(features)`
- **Chuc nang**: Tinh bounding box tu danh sach GeoJSON features
- **Input**: `features` (Array) - Mang cac GeoJSON features
- **Output**: Object `{ xmin, ymin, xmax, ymax }`
- **Logic**: Duyet qua tat ca coordinates cua Point, Polygon, MultiPolygon de tim min/max

#### `calculateCenterFromFeatures(features)`
- **Chuc nang**: Tinh trung tam tu danh sach features
- **Input**: `features` (Array) - Mang cac GeoJSON features
- **Output**: Object `{ longitude, latitude }`
- **Logic**: Tinh trung binh cong toa do tat ca dinh, fallback: `{ longitude: 105.85, latitude: 21.0245 }`

#### `highlightPolygonOnMap(map, geojson, layerId = "highlightLayer", styleOptions = {})`
- **Chuc nang**: Highlight polygon tren Leaflet map
- **Input**:
  - `map` - Leaflet map instance
  - `geojson` - GeoJSON data
  - `layerId` (string) - ID de quan ly layer
  - `styleOptions` (Object) - Style tuy chinh
- **Logic**:
  1. Xoa layer cu cung ID neu co (luu trong `map._highlightLayers[layerId]`)
  2. Tao `L.geoJSON(geojson, { style })` voi style mac dinh:
     ```js
     { fillColor: '#fff7bc', fillOpacity: 0.3, color: '#ffff86', weight: 2 }
     ```
  3. Add layer vao map va luu reference

#### `async queryFeaturesWithFilters(wmsUrl, layerName, filters = {})`
- **Chuc nang**: Query features voi nhieu filter
- **Input**:
  - `wmsUrl` (string) - WMS URL
  - `layerName` (string) - Ten layer
  - `filters` (Object) - Object chua filter, VD: `{ province_c: '01', status: ['active', 'pending'] }`
- **Output**: Promise<Object> - GeoJSON
- **Logic**: Build CQL tu object (array -> IN clause, string -> = clause), goi fetchFeatureGeoJSON

#### `async getUniqueValues(wmsUrl, layerName, fieldName, additionalFilter = null)`
- **Chuc nang**: Lay danh sach gia tri unique cua 1 field
- **Input**: wmsUrl, layerName, fieldName, additionalFilter
- **Output**: Promise<Array> - Mang gia tri unique da sort
- **Logic**: Query tat ca features, extract field values vao Set, return sorted array

---

## MODULE 2: leaflet-wms-manager.js - WMSLayerManager

### Muc dich
Quan ly cac lop WMS tren Leaflet map: them, xoa, bat/tat, loc CQL, query GetFeatureInfo khi click, highlight feature.

### Class: WMSLayerManager

```js
class WMSLayerManager {
    constructor(map, wmsLayers = DEFAULT_WMS_LAYERS)
}
```

### Properties
| Property | Type | Mo ta |
|----------|------|-------|
| map | L.Map | Leaflet map instance |
| wmsLayers | Map | Map<configId, L.TileLayer.WMS> - Cac layer dang hien thi |
| wmsConfigs | Array | Mang cau hinh WMS layers |
| wfsUtil | WFSUtil | Instance cua WFSUtil |
| onMapClick | Function|null | Callback khi click vao feature |
| _highlightLayers | Object | Luu tru cac highlight layers theo ID |

### Methods

#### `replaceDomainIfIsLocalhost()`
- **Chuc nang**: Thay doi URL cua WMS layers neu dang chay tren localhost
- **Logic**: Giong ban goc - kiem tra `window.location.hostname`, neu localhost va khong phai boundary layer thi thay URL thanh `http://localhost:8080{pathname}`

#### `getWmsConfigWithNameLayer(layerName)`
- **Chuc nang**: Tim config theo ten layer
- **Input**: `layerName` (string) - VD: `"_2025_EUDR:gardens"`
- **Output**: Object config hoac undefined

#### `async updateWMSLayer(layerName, cqlFilter = null, shouldZoom = false)`
- **Chuc nang**: Cap nhat WMS layer (xoa cu, tao moi voi filter)
- **Logic**:
  1. Tim config theo layerName
  2. Goi `removeWMSLayer(config.id)`
  3. Goi `createAndAddWMSLayer(config, { cqlFilter })`
  4. Goi `reorderWMSLayers()`
  5. Neu shouldZoom: goi `zoomToWMSExtentWithFilter()`

#### `createAndAddWMSLayer(config, options = {})`
- **Chuc nang**: Tao va them WMS layer vao map
- **Input**: config object, options `{ cqlFilter }`
- **Output**: Promise<L.TileLayer.WMS>
- **Logic**:
  1. Build CQL filter tu config.cqlFilter + options.cqlFilter
  2. Tao `L.tileLayer.wms(config.url, params)` voi params:
     ```js
     {
         layers: config.layer,
         format: 'image/png',
         transparent: true,
         version: config.version,
         opacity: 0.8,
         CQL_FILTER: cqlFilter  // neu co
     }
     ```
  3. Add vao map: `layer.addTo(this.map)`
  4. Luu vao `this.wmsLayers.set(config.id, layer)`
  5. Luu cqlFilter vao layer: `layer._cqlFilter = cqlFilter`
  6. Cap nhat UI button state
  7. Return layer

#### `removeWMSLayer(wmsId)`
- **Chuc nang**: Xoa WMS layer khoi map
- **Logic**: `this.map.removeLayer(layer)`, `this.wmsLayers.delete(wmsId)`, cap nhat UI

#### `reorderWMSLayers()`
- **Chuc nang**: Sap xep lai thu tu WMS layers theo zoomPriority
- **Logic**: Duyet cac layer, set `layer.setZIndex(index)` theo thu tu priority

#### `toggleWMSLayer(wmsId, button)`
- **Chuc nang**: Bat/tat WMS layer
- **Logic**:
  - Neu dang hien thi -> remove, doi icon thanh `bi-eye`
  - Neu dang an -> tao moi, doi icon thanh `bi-eye-slash`
  - Loading state: icon `bi-hourglass-split`

#### `buildCQLFilter(baseFilter, additionalFilter)`
- **Chuc nang**: Xay dung CQL Filter tu nhieu dieu kien
- **Input**: 2 string filter
- **Output**: string|null - VD: `"(province_c='01') AND (tt=5)"`
- **Logic**: Gop cac filter khong rong voi ` AND `

#### `loadDefaultWMSLayers()`
- **Chuc nang**: Load cac WMS layers mac dinh (co defaultVisible = true)
- **Logic**: Filter configs co defaultVisible, tao layer, zoom den layer co priority cao nhat

#### `initializeWMSList(container)`
- **Chuc nang**: Tao danh sach WMS layers trong HTML container
- **Logic**: Tao `<ul>` voi cac `<li>` chua ten layer + button toggle (icon `bi-eye`/`bi-eye-slash`)

#### `setMapClickHandler(callback)`
- **Chuc nang**: Dat callback xu ly khi click map co ket qua WMS
- **Input**: callback function `(event, validResult) => {}`

#### `async handleMapClick(event)`
- **Chuc nang**: Xu ly su kien click tren map de query WMS GetFeatureInfo
- **Logic**:
  1. Lay tat ca visible WMS layers, sort theo zoomPriority
  2. Hien popup loading: `L.popup().setLatLng(latlng).setContent("Dang tai...").openOn(map)`
  3. Query song song tat ca layers bang `Promise.all(quickCheckFeatureInfo)`
  4. Tim layer dau tien co data (theo priority)
  5. Neu co data va co onMapClick callback -> goi callback voi `(event, validResult)`
  6. Hien popup thong tin: `displayFeatureInfo(validResult, latlng)`
  7. Neu khong co data -> hien "Khong tim thay thong tin"

#### `quickCheckFeatureInfo(event, wmsLayerObj, wmsConfig)` va `getFeatureInfo(event, wmsLayerObj, wmsConfig)`
- **Chuc nang**: Thuc hien WMS GetFeatureInfo request
- **Input**: click event, layer object, config
- **Output**: Promise<Object> `{ layerId, layerName, data: [features], clickPoint, layerInfo }`
- **Logic**:
  1. Lay toa do click: `event.latlng` (da la WGS84 trong Leaflet)
  2. Lay map bounds: `map.getBounds()` -> xmin, ymin, xmax, ymax
  3. Lay map size: `map.getSize()` -> width, height
  4. Tinh screen point: `map.latLngToContainerPoint(latlng)` -> x, y
  5. Tao GetFeatureInfo URL:
     ```
     ?SERVICE=WMS&VERSION={version}&REQUEST=GetFeatureInfo
     &LAYERS={layer}&QUERY_LAYERS={layer}&STYLES=
     &BBOX={bbox}&WIDTH={width}&HEIGHT={height}
     &FORMAT=image/png&INFO_FORMAT=application/json
     &SRS=EPSG:4326&X={x}&Y={y}&TRANSPARENT=true
     &CQL_FILTER={filter}  // neu co
     ```
  6. Fetch voi timeout (quickCheck: 3s, getFeatureInfo: khong timeout)
  7. Parse response, return ket qua
- **Luu y**: Trong Leaflet, toa do click la `event.latlng` (lat, lng), bbox tu `map.getBounds()`, screen point tu `map.latLngToContainerPoint()`

#### `async triggerMapClickAtPoint(latlng)`
- **Chuc nang**: Trigger map click programmatically tai mot diem
- **Input**: `latlng` - Leaflet LatLng object hoac `{lat, lng}`
- **Logic**: Tao mock event voi latlng va goi `handleMapClick(mockEvent)`

#### `displayFeatureInfo(result, latlng)`
- **Chuc nang**: Hien thi thong tin feature trong popup
- **Logic**: Tao HTML content tu result.data[0].properties, mo L.popup tai latlng

#### `createPopupContent(result)`
- **Chuc nang**: Tao noi dung HTML cho popup
- **Logic**: Giong ban goc - loc properties, tao bang hien thi voi label tieng Viet

#### `getPropertyLabel(key)` va `getFieldFormat(key, value)`
- **Chuc nang**: Map label tieng Viet va format so cho tung field
- **Logic**: Giong hoan toan ban goc (labelMap object)

#### `async highlightSelectedFeatureArcgis(wmsConfig, cqlFilter)`
- **DOI TEN** -> `highlightSelectedFeature(wmsConfig, cqlFilter)`
- **Chuc nang**: Highlight feature theo CQL filter
- **Logic**: Goi wfsUtil.fetchFeatureGeoJSON -> wfsUtil.highlightPolygonOnMap

#### Cac method zoom
- `zoomToWMSExtent(wmsUrl, layerName, cqlFilter)` - Zoom den extent cua layer qua WMS GetCapabilities
- `zoomToWMSExtentWithFilter(wmsUrl, layerName, cqlFilter)` - Zoom den extent co filter
- `zoomToFilteredExtent(wmsUrl, layerName, cqlFilter)` - Query WFS, tinh bounds, zoom
- `zoomToCenterFromWFS(wmsUrl, layerName)` - Zoom den center tinh tu WFS
- `isDefaultBoundingBox(bbox)` - Kiem tra bbox mac dinh
- **Leaflet zoom**: `map.fitBounds([[ymin, xmin], [ymax, xmax]])` thay cho ArcGIS `view.goTo()`
- `zoomToCenter(centerPoint)` - `map.flyTo([lat, lng], zoom)`
- `zoomToBounds(bounds)` - `map.fitBounds([[bounds.ymin, bounds.xmin], [bounds.ymax, bounds.xmax]], { padding: [20, 20] })`

---

## MODULE 3: leaflet-point-manager.js - PointManager

### Muc dich
Quan ly cac diem marker tren ban do voi icon tuy chinh, popup, bat/tat hien thi.

### Class: PointManager

```js
class PointManager {
    constructor(map, options = {})
}
```

### Properties
| Property | Type | Mo ta |
|----------|------|-------|
| map | L.Map | Leaflet map instance |
| options | Object | Cau hinh |
| points | Map | Map<pointId, { marker, config }> |
| pointLayerGroup | L.LayerGroup | Group chua tat ca markers |

### Options
```js
{
    enableDefaultPoints: true,
    defaultIconSize: 32,
    popupEnabled: true
}
```

### Methods

#### `initializeLayer()`
- **Chuc nang**: Tao LayerGroup va add vao map
- **Logic**: `this.pointLayerGroup = L.layerGroup().addTo(this.map)`

#### `loadDefaultPoints()`
- **Chuc nang**: Load diem Hoang Sa va Truong Sa
- **Logic**: Goi `addPoint()` 2 lan voi config giong ban goc (toa do, icon, description)

#### `addPoint(pointConfig)`
- **Chuc nang**: Them 1 diem marker moi
- **Input**: pointConfig object:
  ```js
  {
      id: string|null,          // Tu dong generate neu null
      name: string,             // Ten diem
      longitude: number,        // Kinh do (bat buoc)
      latitude: number,         // Vi do (bat buoc)
      iconUrl: string,          // URL icon
      iconSize: number,         // Kich thuoc icon (px)
      description: string,      // HTML content cho popup
      attributes: Object        // Metadata bo sung
  }
  ```
- **Output**: string - pointId
- **Logic**:
  1. Validate longitude, latitude
  2. Generate ID: `point_{timestamp}_{random}`
  3. Tao icon: `L.icon({ iconUrl, iconSize: [size, size], iconAnchor: [size/2, size] })`
  4. Tao marker: `L.marker([latitude, longitude], { icon })`
  5. Neu co description: `marker.bindPopup(popupContent)`
  6. Add vao pointLayerGroup
  7. Luu vao this.points

#### `removePoint(pointId)`
- **Chuc nang**: Xoa 1 diem
- **Logic**: `this.pointLayerGroup.removeLayer(marker)`, xoa khoi this.points

#### `togglePointVisibility(pointId, visible = null)`
- **Chuc nang**: Bat/tat hien thi 1 diem
- **Logic**: Kiem tra marker co tren map khong, add/remove tuong ung

#### `toggleLayerVisibility(visible = null)`
- **Chuc nang**: Bat/tat toan bo point layer
- **Logic**: `map.addLayer(pointLayerGroup)` / `map.removeLayer(pointLayerGroup)`

#### `getPoint(pointId)`, `getAllPoints()`, `clearAllPoints()`
- Giong ban goc

#### `async zoomToPoint(pointId, zoomLevel = 10)`
- **Logic**: `this.map.flyTo(marker.getLatLng(), zoomLevel, { duration: 0.5 })`

#### `async zoomToAllPoints()`
- **Logic**: `this.map.fitBounds(this.pointLayerGroup.getBounds())`

#### `addMultiplePoints(pointsArray)`, `generatePointId()`, `destroy()`
- Giong ban goc

---

## MODULE 4: leaflet-sketch-manager.js - SketchManager

### Muc dich
Cong cu ve va chinh sua polygon. Day la module phuc tap nhat - su dung **Leaflet-Geoman** thay Sketch widget va **Turf.js** thay geometryEngine.

### Class: SketchManager

```js
class SketchManager {
    constructor(map, options = {}, mapInstance)
}
```

### Properties
| Property | Type | Mo ta |
|----------|------|-------|
| map | L.Map | Leaflet map instance |
| options | Object | Cau hinh (enableSave, enableMerge, enableSplit, apiEndpoint, redirectAfterSave, redirectUrl) |
| sketchLayerGroup | L.FeatureGroup | Group chua cac polygon da ve |
| splitLayerGroup | L.FeatureGroup | Group tam cho duong cat |
| isSplitMode | boolean | Dang o che do cat |
| selectedPolygonForSplit | L.Layer | Polygon duoc chon de cat |
| isDirty | boolean | Co thay doi chua luu |
| savedPolygonIds | Set | Cac polygon ID da luu |
| polygonCounter | number | Dem so polygon da tao |
| isWMSSelectionMode | boolean | Dang o che do chon WMS |
| selectedWMSFeature | Object | Feature WMS da chon |
| mapInstance | MapInstance | Reference den MapInstance cha |
| isVisible | boolean | Sketch tool co dang hien thi khong |
| toolbar | HTMLElement | Custom toolbar element |
| disabledWMSLayers | Array | Cac WMS layer da tat khi o WMS selection mode |

### Symbol (style) dinh nghia
```js
this.fillStyle = { color: '#e38b4f', fillColor: '#e38b4f', fillOpacity: 0.8, weight: 1 };
this.mergeStyle = { color: '#e38bff', fillColor: '#e38bff', fillOpacity: 0.8, weight: 1 };
this.savedStyle = { color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.6, weight: 1 };
this.splitResultStyles = [
    { color: '#e38b4f', fillColor: '#e38b4f', fillOpacity: 0.8, weight: 1 },
    { color: '#8be34f', fillColor: '#8be34f', fillOpacity: 0.8, weight: 1 },
];
```

### Methods

#### `initialize()`
- **Chuc nang**: Khoi tao toan bo sketch system
- **Logic**:
  1. Tao `this.sketchLayerGroup = L.featureGroup().addTo(this.map)` (visible = false ban dau)
  2. Cau hinh Leaflet-Geoman tren map:
     ```js
     this.map.pm.addControls({
         position: 'topright',
         drawCircle: false,
         drawCircleMarker: false,
         drawPolyline: false,
         drawRectangle: false,
         drawMarker: false,
         drawText: false,
         cutPolygon: false,       // Se tu build chuc nang split
         rotateMode: false,
         drawPolygon: true,       // Chi cho phep ve polygon
         editMode: true,
         dragMode: false,
         removalMode: true,
     });
     ```
  3. An toolbar mac dinh cua Geoman (se dung custom toolbar)
  4. Goi `setupSketchEvents()`
  5. Goi `setupToolButtons()`

#### `setupSketchEvents()`
- **Chuc nang**: Thiet lap event listeners cho ve/chinh sua
- **Logic**:
  1. **pm:create** - Khi ve xong polygon:
     ```js
     this.map.on('pm:create', (e) => {
         // Xoa tat ca polygon cu tren sketchLayerGroup
         this.sketchLayerGroup.clearLayers();
         filterScope.tt = null;
         delete filterScope.id;

         // Set style
         e.layer.setStyle(this.fillStyle);

         // Gan attributes
         e.layer._polygonId = this.generateUniquePolygonId();
         e.layer._isSaved = false;
         e.layer._createdAt = new Date().toISOString();

         // Them vao sketchLayerGroup
         this.sketchLayerGroup.addLayer(e.layer);

         this.trackChanges();
     });
     ```
  2. **pm:edit** - Khi chinh sua polygon:
     ```js
     this.map.on('pm:edit', (e) => {
         if (e.layer._isSaved) {
             e.layer._isModified = true;
         }
         this.trackChanges();
     });
     ```
  3. **pm:remove** - Khi xoa polygon:
     ```js
     this.map.on('pm:remove', (e) => {
         this.sketchLayerGroup.removeLayer(e.layer);
         this.trackChanges();
     });
     ```

#### `setupToolButtons()`
- **Chuc nang**: Tao custom toolbar voi cac nut: Merge, Copy WMS, Save, Split
- **Logic**: Tao HTML toolbar append vao map container, giong cach ArcGIS them calcite-action vao action-bar
- **Cac nut**:
  - **Merge button**: icon `bi-subtract`, disabled mac dinh, title "Chon it nhat 2 vung de gop"
  - **Copy WMS button**: icon `fa-regular fa-clone`, title "Chon polygon WMS de copy"
  - **Save button**: icon `fa-regular fa-floppy-disk`, disabled mac dinh, title "Khong co polygon de luu"
  - **Split button**: icon `bi-scissors`, disabled mac dinh, title "Chon 1 vung de tach"
- **Vi tri**: Append vao `.leaflet-top.leaflet-right` cua map container

#### `handleMerge()`
- **Chuc nang**: Gop 2+ polygon thanh 1
- **Dieu kien**: >= 2 polygon duoc chon
- **Logic**:
  1. Lay tat ca selected polygons tu sketchLayerGroup
  2. Chuyen sang GeoJSON: `layer.toGeoJSON()`
  3. Dung Turf.js:
     ```js
     let merged = selectedGeoJSONs[0];
     for (let i = 1; i < selectedGeoJSONs.length; i++) {
         merged = turf.union(turf.featureCollection([merged, selectedGeoJSONs[i]]));
     }
     ```
  4. Xoa cac polygon goc khoi sketchLayerGroup
  5. Tao polygon moi tu merged GeoJSON: `L.geoJSON(merged)`, set style mergeStyle
  6. Gan attributes: polygonId, type: "merged", isSaved: false
  7. Them vao sketchLayerGroup
  8. trackChanges()

#### `handleSplit()`
- **Chuc nang**: Bat dau che do cat polygon
- **Dieu kien**: Dung 1 polygon duoc chon
- **Logic**: Goi `enterSplitMode()`

#### `enterSplitMode()`
- **Chuc nang**: Vao che do cat
- **Logic**:
  1. Luu polygon duoc chon vao `this.selectedPolygonForSplit`
  2. `this.isSplitMode = true`
  3. An sketch toolbar, hien split instruction
  4. Bat che do ve polyline cua Geoman: `this.map.pm.enableDraw('Line')`
  5. Lang nghe event `pm:create` cho line:
     ```js
     this.map.once('pm:create', (e) => {
         if (this.isSplitMode && this.selectedPolygonForSplit) {
             this.performSplit(e.layer.toGeoJSON());
             this.map.removeLayer(e.layer); // Xoa line sau khi cat
         }
     });
     ```
  6. Doi cursor thanh crosshair
  7. Them ESC key handler de huy

#### `performSplit(splitLineGeoJSON)`
- **Chuc nang**: Thuc hien cat polygon bang duong ve
- **Logic** (dung Turf.js):
  1. Chuyen polygon va line sang GeoJSON
  2. **QUAN TRONG - Logic cat polygon voi Turf.js**:
     ```js
     const polygon = this.selectedPolygonForSplit.toGeoJSON();
     const line = splitLineGeoJSON;

     // Buoc 1: Buffer line thanh polygon hep (0.00001 degree ~ 1m)
     // De dam bao cat qua polygon
     const bufferedLine = turf.buffer(line, 0.001, { units: 'kilometers' });

     // Buoc 2: Dung turf.difference de lay phan 1
     const part1 = turf.difference(turf.featureCollection([polygon, bufferedLine]));

     // Buoc 3: Dung turf.intersect de xac dinh cac phan
     // CACH TOT HON: Dung polygonClipping hoac turf.lineSplit + turf.booleanPointInPolygon
     // => Su dung thu vien polygon-clipping (dependency cua turf) de split chinh xac

     // CACH THUC TE HIEU QUA NHAT:
     // 1. Convert polygon thanh MultiLineString (outline)
     // 2. Split outline bang splitLine
     // 3. Rebuild polygons tu cac segments
     // => Hoac don gian hon: dung turf.difference va turf.intersect

     // Cach implement khuyen nghi:
     const polygonFeature = this.selectedPolygonForSplit.toGeoJSON();
     const lineFeature = splitLineGeoJSON;

     // Cat polygon bang line:
     // B1: Tao buffer nho tu line (VD: 0.0001km)
     const thinBuffer = turf.buffer(lineFeature, 0.0001, { units: 'kilometers' });
     // B2: difference polygon - buffer = 2 phan tach roi
     const diff = turf.difference(turf.featureCollection([polygonFeature, thinBuffer]));

     // B3: Neu diff la MultiPolygon -> tach ra cac Polygon rieng
     let splitResults = [];
     if (diff && diff.geometry.type === 'MultiPolygon') {
         diff.geometry.coordinates.forEach(coords => {
             splitResults.push(turf.polygon(coords));
         });
     }
     ```
  3. Neu splitResults.length > 1:
     - Xoa polygon goc khoi sketchLayerGroup
     - Tao Leaflet layer cho moi phan: `L.geoJSON(part)`, set style theo splitResultStyles[index]
     - Gan attributes: polygonId, type: "split", splitIndex, isSaved: false
     - Them vao sketchLayerGroup
     - `this.shouldCheckPolygonCount = false`
  4. Neu khong cat duoc: hien thong bao loi
  5. Finally: goi `exitSplitMode()`

#### `exitSplitMode()`
- **Logic**: Reset state, an split instruction, hien lai sketch toolbar, doi cursor ve default, disable Line draw

#### `showSplitInstruction()` / `hideSplitInstruction()`
- **Logic**: Tao/xoa div overlay huong dan "Ve duong cat qua polygon - Nhan ESC de huy"

#### Save functionality

##### `generateUniquePolygonId()`
- Return: `polygon_{containerId}_{timestamp}_{counter}`

##### `canPolygonBeSaved(layer)`
- Return: true neu `!layer._isSaved || (layer._isSaved && layer._isModified)`

##### `getSaveablePolygons()`
- Return: mang cac layer co the save tu sketchLayerGroup

##### `markPolygonAsSaved(layer)`
- Set `layer._isSaved = true`, `layer._isModified = false`
- Doi style sang savedStyle (xanh la)

##### `async handleSave()`
- **Logic** (giong ban goc):
  1. Lay saveable polygons
  2. Kiem tra so luong (shouldCheckPolygonCount && > 1 -> bao loi)
  3. Set loading state
  4. Chuyen doi polygons sang API format: `getSaveablePolygonsForAPI()`
  5. Kiem tra filterScope day du
  6. POST den `this.options.apiEndpoint` voi `{ polygonData, filterScope }`
  7. Thanh cong: mark saved, disable polygon tool, xu ly redirect neu co
  8. Loi: hien thong bao

##### `graphicToWKT(layer)` -> doi ten `layerToWKT(layer)`
- **Chuc nang**: Chuyen Leaflet layer sang WKT format
- **Logic**:
  1. Lay GeoJSON: `layer.toGeoJSON()`
  2. Chuyen sang WKT:
     ```js
     const coords = geojson.geometry.coordinates;
     // Build WKT string: POLYGON((x1 y1, x2 y2, ...))
     ```
  3. Tinh dien tich: `turf.area(geojson) / 10000` (m2 -> ha)
  4. Tinh centroid: `turf.centroid(geojson)`
  5. Return:
     ```js
     {
         id, name, geom: wktString, srid: 4326,
         area: areaHa,
         centroid_longitude, centroid_latitude,
         properties: { ... }
     }
     ```

##### `createWKTFromGeometry(geojsonGeometry)`
- **Logic**: Duyet qua coordinates, tao string `POLYGON((x y, x y, ...))`, dam bao ring dong

##### WMS Copy functionality

##### `enableWMSSelection()`, `disableWMSSelection()`, `clearWMSSelection()`
- Giong ban goc - cho phep click map de chon polygon tu WMS layer

##### `queryAndHighlightWMS(event, wmsManager)`
- Giong ban goc - query GetFeatureInfo, highlight ket qua

##### `convertWMSToSketch()`
- **Chuc nang**: Copy polygon tu WMS sang sketch layer
- **Logic**:
  1. Lay `this.selectedWMSFeature.geometry`
  2. Tao `L.geoJSON(geometry)`, set fillStyle
  3. Gan attributes
  4. Clear sketchLayerGroup, add layer moi
  5. Bat edit mode: `layer.pm.enable()`

#### Cac method UI

##### `toggle()`
- Bat/tat visibility cua sketch tool va toolbar
- Return: boolean isVisible

##### `updateToolButtonsState()`
- Cap nhat trang thai cac nut dua tren so polygon duoc chon

##### `updateSaveButtonState()`
- Cap nhat trang thai nut Save (disable/enable, mau sac, title)

##### `setPolygonToolState(enabled)`
- Enable/disable polygon draw tool cua Geoman

##### `destroy()`
- Cleanup: remove layers, remove event listeners, remove toolbar

---

## MODULE 5: leaflet-control-manager.js - ControlManager

### Muc dich
Quan ly cac control UI: basemap switcher, WMS panel, sketch toggle, fullscreen.

### Class: ControlManager

```js
class ControlManager {
    constructor(map, options = {}, mapInstance)
}
```

### Properties
| Property | Type | Mo ta |
|----------|------|-------|
| map | L.Map | Leaflet map instance |
| options | Object | `{ enableBasemap: true, enableWMS: true, enableSketch: true }` |
| wmsManager | WMSLayerManager | Reference |
| sketchManager | SketchManager | Reference |
| mapInstance | MapInstance | Reference |
| currentBasemap | L.TileLayer | Basemap hien tai |

### Methods

#### `async initializeControls(wmsManager, sketchManager)`
- **Logic**: Goi lan luot createFullscreenControl, createBasemapControl, createWMSControl, createSketchControl

#### `createFullscreenControl()`
- **Chuc nang**: Tao nut fullscreen
- **Logic**: Tao L.Control custom tai position 'topleft', append button voi icon `bi-fullscreen`
- **toggleFullscreen()**: Su dung Fullscreen API giong ban goc

#### `createBasemapControl()`
- **Chuc nang**: Tao basemap switcher
- **Logic**:
  1. Tao nut `bi-layers` goc trai
  2. Tao offcanvas (Bootstrap) chua danh sach basemap:
     ```js
     const basemaps = {
         'Ve tinh': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
         'Duong pho': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
         'Dia hinh': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'),
         'Xam': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'),
     };
     ```
  3. Khi chon basemap: `map.removeLayer(currentBasemap)`, `map.addLayer(newBasemap)`

#### `createWMSControl()`
- **Chuc nang**: Tao panel quan ly WMS layers
- **Logic**: Tao nut `bi-map` goc trai, tao offcanvas, goi `wmsManager.initializeWMSList(contentContainer)`

#### `createSketchControl()`
- **Chuc nang**: Tao nut bat/tat sketch tools
- **Logic**: Tao nut `bi-pencil` goc trai, click -> `sketchManager.toggle()`

#### `createControlButton({ id, title, icon, offcanvasTitle, onClick })`
- **Chuc nang**: Tao 1 control button chung (reusable)
- **Logic**:
  1. Tao `L.Control` moi tai position 'topleft'
  2. Tao button voi Bootstrap icon
  3. Neu co onClick: bind click handler
  4. Neu co offcanvasTitle: tao offcanvas element va link button toi no
  5. Return `{ button, offcanvas, contentContainer }`

#### `createOffCanvas(id, title, content)`
- **Chuc nang**: Tao Bootstrap offcanvas element
- **Logic**: Tao div voi class `offcanvas offcanvas-end`, append vao map container
- z-index: 9999

#### `destroy()`
- Xoa cac offcanvas elements

---

## MODULE 6: leaflet-map-core.js - MapInstance + Public API

### Muc dich
Class chinh quan ly toan bo map instance. Khoi tao map, tao cac manager, xu ly events. Expose public API.

### Class: MapInstance

```js
class MapInstance {
    constructor(containerId, options = {})
}
```

### Options (mac dinh)
```js
{
    basemap: 'satellite',       // Ten basemap
    center: [21.0245, 105.85],  // [lat, lng] - CHU Y: Leaflet dung [lat, lng], ArcGIS dung [lng, lat]
    zoom: 12,

    enableWMS: true,
    enableSketch: true,
    enableControls: true,
    enablePoints: true,

    wmsLayers: DEFAULT_WMS_LAYERS,  // Co the merge voi custom layers
    loadDefaultWMS: true,

    sketchOptions: {
        enableSave: true,
        enableMerge: true,
        enableSplit: true,
        apiEndpoint: '/api/polygons/save',
    },

    controlOptions: {
        enableBasemap: true,
        enableWMS: true,
        enableSketch: true,
    },

    pointOptions: {
        enableDefaultPoints: true,
        defaultIconSize: 32,
        popupEnabled: true,
    },
}
```

### Properties
| Property | Type | Mo ta |
|----------|------|-------|
| containerId | string | ID cua HTML container |
| options | Object | Cau hinh da merge |
| map | L.Map | Leaflet map instance |
| view | Object | Alias cho map (tuong thich API cu) |
| wmsManager | WMSLayerManager | |
| sketchManager | SketchManager | |
| controlManager | ControlManager | |
| pointManager | PointManager | |
| basemapLayer | L.TileLayer | Basemap layer hien tai |
| isInitialized | boolean | |

### Methods

#### `async initialize()`
- **Logic**:
  1. Kiem tra isInitialized
  2. `createMapAndView()`
  3. `initializeManagers()`
  4. `setupEventHandlers()`
  5. Return this

#### `createMapAndView()`
- **Logic**:
  ```js
  // Tao basemap layer
  this.basemapLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '' }
  );

  // Tao map
  this.map = L.map(this.containerId, {
      center: this.options.center,  // [lat, lng]
      zoom: this.options.zoom,
      layers: [this.basemapLayer],
      zoomControl: true,
  });

  // Alias de tuong thich
  this.view = this.map;
  ```
- **CHU Y QUAN TRONG**: Leaflet dung `[lat, lng]`, ArcGIS dung `[lng, lat]` -> can dao thu tu khi khoi tao: `center: [21.0245, 105.85]`

#### `async initializeManagers()`
- **Logic** (giong ban goc nhung dung Leaflet class):
  1. Tao WMSLayerManager neu enableWMS
  2. Tao PointManager neu enablePoints
  3. Tao SketchManager neu enableSketch -> goi initialize()
  4. Tao ControlManager neu enableControls -> goi initializeControls()
  5. Neu khong co WMS default -> zoom ve center

#### `setupEventHandlers()`
- **Logic**: Khi click map va sketch khong visible -> goi wmsManager.handleMapClick
  ```js
  this.map.on('click', (event) => {
      if (!this.sketchManager || !this.sketchManager.isVisible) {
          this.wmsManager.handleMapClick(event);
      }
  });
  ```

#### `performZoom(target, options = {})`
- **Chuc nang**: Zoom linh hoat
- **Logic**:
  - `target.type === 'center'`: `map.flyTo([lat, lng], zoom, { duration })`
  - `target.type === 'extent'`: `map.fitBounds([[ymin, xmin], [ymax, xmax]], { padding, animate })`

#### Getters (giu tuong thich API cu)
- `getWMSManager()` -> return this.wmsManager
- `getSketchManager()` -> return this.sketchManager
- `getControlManager()` -> return this.controlManager
- `getPointManager()` -> return this.pointManager
- `getView()` -> return this.map  // Alias quan trong!
- `getMap()` -> return this.map

#### `destroy()`
- Cleanup tat ca managers, remove map, xoa khoi MAP_INSTANCES

### Public API Functions (expose ra window)

```js
// Giong API cu de code goi khong can thay doi
async function initMap2D(containerId, options = {}) { ... }
function getMapInstance(containerId) { ... }
function getAllMapInstances() { ... }
function destroyMapInstance(containerId) { ... }
function destroyAllMapInstances() { ... }
function addCustomPoint(containerId, pointConfig) { ... }
async function zoomToPoint(containerId, pointId, zoomLevel) { ... }
function togglePointsVisibility(containerId, visible) { ... }

// Expose ra window
window.initMap2D = initMap2D;
window.getMapInstance = getMapInstance;
window.destroyMapInstance = destroyMapInstance;
window.destroyAllMapInstances = destroyAllMapInstances;
window.addCustomPoint = addCustomPoint;
window.zoomToPoint = zoomToPoint;
window.togglePointsVisibility = togglePointsVisibility;
window.MapInstance = MapInstance;
window.WMSLayerManager = WMSLayerManager;
window.SketchManager = SketchManager;
window.ControlManager = ControlManager;
window.PointManager = PointManager;
window.DEFAULT_WMS_LAYERS = DEFAULT_WMS_LAYERS;
```

---

## LUU Y CHUYEN DOI QUAN TRONG

### 1. He toa do
- **ArcGIS**: `[longitude, latitude]` (x, y)
- **Leaflet**: `[latitude, longitude]` (y, x)
- Can dao thu tu tai:
  - `center` option khi khoi tao map
  - `L.marker([lat, lng])`
  - `L.latLng(lat, lng)`
  - `map.flyTo([lat, lng])`

### 2. Spatial Reference
- ArcGIS can xu ly WebMercator (3857) <-> WGS84 (4326)
- Leaflet mac dinh lam viec voi WGS84 (4326), tu dong chuyen doi
- **Khong can** `webMercatorUtils` nua

### 3. Popup
- ArcGIS: `view.popup.open({ location, features })`
- Leaflet: `L.popup().setLatLng(latlng).setContent(html).openOn(map)`

### 4. Zoom/Navigate
- ArcGIS: `view.goTo({ target, zoom }, { duration })`
- Leaflet: `map.flyTo([lat, lng], zoom)` hoac `map.fitBounds(bounds)`

### 5. Graphics/Layers
- ArcGIS: `GraphicsLayer` + `Graphic` objects
- Leaflet: `L.featureGroup()` / `L.layerGroup()` + `L.geoJSON()` / `L.polygon()`

### 6. WMS Layer
- ArcGIS: `new WMSLayer({ url, sublayers: [{name}], customParameters })`
- Leaflet: `L.tileLayer.wms(url, { layers, format, transparent, CQL_FILTER })`

### 7. Sketch/Drawing
- ArcGIS: `esri/widgets/Sketch` voi `geometryEngine`
- Leaflet: `leaflet-geoman` (pm) voi `turf.js`

### 8. Event handling
- ArcGIS: `view.on('click', handler)`, `sketch.on('create', handler)`
- Leaflet: `map.on('click', handler)`, `map.on('pm:create', handler)`

---

## KIEM TRA SAU KHI BUILD

### Test cho tung module:

1. **WFSUtil**: Goi `fetchFeatureGeoJSON()` voi 1 layer -> kiem tra tra ve GeoJSON dung
2. **WMSLayerManager**: Add/remove WMS layer, click map -> popup GetFeatureInfo, filter CQL
3. **PointManager**: Them diem Hoang Sa/Truong Sa, zoom den diem, toggle visibility
4. **SketchManager**:
   - Ve polygon moi
   - Chinh sua dinh polygon
   - Cat polygon bang duong ve
   - Gop 2 polygon
   - Copy polygon tu WMS
   - Luu polygon (POST API)
5. **ControlManager**: Chuyen basemap, bat/tat WMS, bat/tat sketch, fullscreen
6. **MapInstance**: Khoi tao map, tat ca features hoat dong, destroy va tao lai

### Test tich hop voi code hien tai:
- File `step-1/map.js` goi `initMap2D("map-step-1", {...})` -> map hien thi dung
- Filter tinh/xa -> WMS layers cap nhat
- Click lo dat -> highlight va hien popup
- File `step-1/search-coordinate.js` -> tim toa do, dat marker
- File `step-2/chon-diem-tren-banbo.js` -> mo modal, click chon diem
