# Map Application Architecture

## Overview
The map application has been refactored into a modular, reusable architecture that supports multiple map instances on a single page.

## File Structure

```
assets/js/
├── map-config.js       # Configuration and constants
├── map-core.js         # MapApp class (main application logic)
├── index.js            # Application initialization
├── leaflet/
│   ├── leaflet-wfs-util.js
│   ├── leaflet-wms-manager.js
│   ├── leaflet-point-manager.js
│   └── leaflet-sketch-manager.js
└── ...
```

## Core Components

### 1. `map-config.js`
Contains all configuration constants:
- Map settings (center, zoom, tile layers)
- WMS layer configurations
- Point manager settings
- Sketch manager settings

### 2. `map-core.js`
The `MapApp` class encapsulates all map functionality:
- Map initialization
- WMS layer management
- Point management
- Sketch tools
- Filter management (province/commune)

### 3. `index.js`
Simple initialization file that creates MapApp instance(s)

## Usage

### Single Map Instance

```javascript
// Create a single map
const mapApp = new MapApp('map', {
    config: DEFAULT_MAP_CONFIG,
    wmsListContainerId: 'wmsListContainer',
    pointListContainerId: 'pointListContainer',
    provinceSelectId: 'province_code',
    communeSelectId: 'commune_code'
});

// Initialize
mapApp.init();

// Expose to global scope for HTML onclick handlers
window.mapApp = mapApp;
```

### Multiple Map Instances

```javascript
// Create first map
const mapApp1 = new MapApp('map-container-1', {
    config: DEFAULT_MAP_CONFIG,
    wmsListContainerId: 'wms-list-1',
    pointListContainerId: 'point-list-1',
    provinceSelectId: 'province-select-1',
    communeSelectId: 'commune-select-1'
});
mapApp1.init();

// Create second map with different config
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

// Expose to global scope
window.mapApps = {
    main: mapApp1,
    secondary: mapApp2
};
```

## MapApp API

### Initialization
```javascript
const app = new MapApp(containerId, options);
await app.init();
```

### Filter Management
```javascript
app.resetFilter()                    // Reset all filters
app.getFilterScope()                 // Get current filter state
```

### Point Management
```javascript
app.addPoint(lat, lng, name)         // Add a point
app.removePoint(pointId)             // Remove a point
app.zoomToPoint(pointId, zoom)       // Zoom to a point
app.toggleAllPoints()                // Toggle all points visibility
app.zoomToAllPoints()                // Zoom to show all points
app.clearAllPoints()                 // Remove all points
```

### Sketch Management
```javascript
app.toggleSketchMode(buttonId)       // Toggle sketch mode
```

### Map Access
```javascript
app.getMap()                         // Get Leaflet map instance
app.getWMSManager()                  // Get WMS manager
app.getPointManager()                // Get point manager
app.getSketchManager()               // Get sketch manager
```

### Utilities
```javascript
app.zoomToDefaultExtent()            // Zoom to default extent
app.clearHighlights()                // Clear all highlights
app.destroy()                        // Clean up and destroy map
```

## Configuration Options

```javascript
const config = {
    // Map settings
    map: {
        center: [lat, lng] or null,
        zoom: 6,
        minZoom: 2,
        maxZoom: 20
    },

    // Tile layer
    tileLayer: {
        url: "http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}",
        options: {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"]
        }
    },

    // WMS settings
    wms: {
        ranhgioiUrl: "https://...",
        ranhgioiLayers: ["layer1", "layer2"]
    },

    // Point manager
    pointManager: {
        enableDefaultPoints: true,
        defaultIconSize: 32,
        popupEnabled: true
    },

    // Sketch manager
    sketchManager: {
        enableSave: true,
        enableMerge: true,
        enableSplit: true,
        maxElements: 1,
        apiEndpoint: "/api/polygons/save"
    }
};
```

## Benefits

### 1. Reusability
- Create multiple map instances easily
- Each instance is independent
- Share configuration between instances

### 2. Maintainability
- Clear separation of concerns
- Single responsibility per file
- Easy to locate and fix bugs

### 3. Extensibility
- Extend MapApp class for custom behavior
- Override methods for specific needs
- Add new features without breaking existing code

### 4. Testability
- Each component can be tested independently
- Mock dependencies easily
- Clear API boundaries

## Example: Extending MapApp

```javascript
class CustomMapApp extends MapApp {
    constructor(containerId, options) {
        super(containerId, options);
        // Custom initialization
    }

    // Override or add methods
    async handleProvinceChange(e) {
        // Custom logic before
        console.log('Province changed:', e.target.value);

        // Call parent method
        await super.handleProvinceChange(e);

        // Custom logic after
        this.customAction();
    }

    customAction() {
        // Your custom functionality
    }
}

// Use custom class
const customApp = new CustomMapApp('map', {...});
customApp.init();
```

## Migration Guide

If you have existing code using the old architecture, here's how to migrate:

### Before (Old)
```javascript
// Direct access to managers
wmsManager.updateWMSLayer(...);
pointManager.addPoint(...);

// Global functions
function resetFilter() { ... }
function addCustomPoint() { ... }
```

### After (New)
```javascript
// Access through MapApp instance
mapApp.getWMSManager().updateWMSLayer(...);
mapApp.addPoint(...);

// MapApp methods
mapApp.resetFilter();
mapApp.addPoint(...);
```

### HTML onclick Handlers
Keep using global functions (they proxy to mapApp internally):
```html
<button onclick="resetFilter()">Reset</button>
<button onclick="addCustomPoint()">Add Point</button>
<button onclick="toggleSketchMode()">Toggle Sketch</button>
```

## Support

For issues or questions, please refer to the inline documentation in:
- `map-core.js` - Detailed JSDoc comments
- `map-config.js` - Configuration examples
