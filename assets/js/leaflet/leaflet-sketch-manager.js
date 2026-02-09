/**
 * Module 4: SketchManager
 * Quan ly cong cu ve va chinh sua polygon
 * Su dung Leaflet-Geoman va Turf.js
 *
 * Fix: selection system, text-stroke labels, real-time measurement update
 */
class SketchManager {
    constructor(map, options = {}, mapInstance = null) {
        this.map = map;
        this.mapInstance = mapInstance;
        this.options = {
            enableSave: true,
            enableMerge: true,
            enableSplit: true,
            maxElements: 0, // 0 = khong gioi han, > 0 = gioi han so polygon
            apiEndpoint: "/api/polygons/save",
            redirectAfterSave: false,
            redirectUrl: null,
            ...options,
        };

        // Layers
        this.sketchLayerGroup = L.featureGroup().addTo(this.map);
        this.sketchLayerGroup._name = "sketchLayer";
        this.measurementLayerGroup = L.featureGroup().addTo(this.map);
        this.measurementLayerGroup._name = "measurementLayer";

        // Selection state
        this.selectedLayers = new Set();

        // State
        this.isSplitMode = false;
        this.selectedPolygonForSplit = null;
        this.isDirty = false;
        this.savedPolygonIds = new Set();
        this.polygonCounter = 0;
        this.isWMSSelectionMode = false;
        this.selectedWMSFeature = null;
        this.isVisible = false;
        this.toolbar = null;
        this.shouldCheckPolygonCount = true;
        this.currentDrawMode = null;
        this.wfsClickHandler = null;

        // Styles
        this.fillStyle = {
            color: "#e38b4f",
            fillColor: "#e38b4f",
            fillOpacity: 0.8,
            weight: 1,
        };
        this.selectedBorderStyle = {
            color: "#00bfff",
            weight: 3,
            dashArray: "6, 4",
        };
        this.mergeStyle = {
            color: "#e38bff",
            fillColor: "#e38bff",
            fillOpacity: 0.8,
            weight: 1,
        };
        this.savedStyle = {
            color: "#4caf50",
            fillColor: "#4caf50",
            fillOpacity: 0.6,
            weight: 1,
        };
        this.splitResultStyles = [
            {
                color: "#e38b4f",
                fillColor: "#e38b4f",
                fillOpacity: 0.8,
                weight: 1,
            },
            {
                color: "#8be34f",
                fillColor: "#8be34f",
                fillOpacity: 0.8,
                weight: 1,
            },
        ];
    }

    // ========================================
    // KHOI TAO
    // ========================================

    initialize() {
        this.map.removeLayer(this.sketchLayerGroup);
        this.map.removeLayer(this.measurementLayerGroup);

        if (this.map.pm) {
            this.map.pm.addControls({
                position: "topright",
                drawCircle: false,
                drawCircleMarker: false,
                drawPolyline: false,
                drawRectangle: false,
                drawMarker: false,
                drawText: false,
                cutPolygon: false,
                rotateMode: false,
                drawPolygon: false,
                editMode: false,
                dragMode: false,
                removalMode: false,
            });

            const toolbars = document.querySelectorAll(".leaflet-pm-toolbar");
            toolbars.forEach((tb) => (tb.style.display = "none"));
        }

        this.setupSketchEvents();
        this.setupToolButtons();
    }

    // ========================================
    // SELECTION SYSTEM (Fix 2-5)
    // ========================================

    /**
     * Gan click handler cho 1 layer de select/deselect
     */
    bindSelectionHandler(layer) {
        layer.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.currentDrawMode !== null) return;
            this.toggleLayerSelection(layer);
        });
    }

    /**
     * Toggle select/deselect 1 layer
     */
    toggleLayerSelection(layer) {
        if (this.selectedLayers.has(layer)) {
            this.deselectLayer(layer);
        } else {
            this.selectLayer(layer);
        }
        this.updateToolButtonsState();
    }

    /**
     * Select 1 layer
     */
    selectLayer(layer) {
        this.selectedLayers.add(layer);
        this._applySelectedStyle(layer);
    }

    /**
     * Deselect 1 layer
     */
    deselectLayer(layer) {
        this.selectedLayers.delete(layer);
        this._removeSelectedStyle(layer);
    }

    /**
     * Deselect tat ca
     */
    clearSelection() {
        this.selectedLayers.forEach((layer) => {
            this._removeSelectedStyle(layer);
        });
        this.selectedLayers.clear();
        this.updateToolButtonsState();
    }

    _applySelectedStyle(layer) {
        // Voi L.geoJSON, layer la 1 group -> duyet sublayers
        const apply = (l) => {
            if (l.setStyle) {
                l._originalStyle = l._originalStyle || {
                    color: l.options.color,
                    weight: l.options.weight,
                    dashArray: l.options.dashArray || null,
                };
                l.setStyle(this.selectedBorderStyle);
            }
        };
        if (layer.eachLayer) {
            layer.eachLayer(apply);
        } else {
            apply(layer);
        }
    }

    _removeSelectedStyle(layer) {
        const restore = (l) => {
            if (l.setStyle && l._originalStyle) {
                l.setStyle(l._originalStyle);
                delete l._originalStyle;
            }
        };
        if (layer.eachLayer) {
            layer.eachLayer(restore);
        } else {
            restore(layer);
        }
    }

    // ========================================
    // EVENTS
    // ========================================

    setupSketchEvents() {
        // Event khi ve xong polygon
        this.map.on("pm:create", (e) => {
            if (!this.isVisible || !e.layer) return;

            // Khi dang o che do split, bo qua -> de handler cua enterSplitMode xu ly
            if (this.isSplitMode) return;

            // Kiem tra maxElements: neu vuot qua gioi han -> xoa het truoc khi them moi
            if (this.options.maxElements > 0) {
                const currentCount = this.sketchLayerGroup.getLayers().length;
                if (currentCount >= this.options.maxElements) {
                    this.sketchLayerGroup.clearLayers();
                    this.selectedLayers.clear();
                    this.measurementLayerGroup.clearLayers();
                }
            }

            e.layer.setStyle(this.fillStyle);

            // Gan attributes
            e.layer._polygonId = this.generateUniquePolygonId();
            e.layer._isSaved = false;
            e.layer._createdAt = new Date().toISOString();

            this.sketchLayerGroup.addLayer(e.layer);
            this.bindSelectionHandler(e.layer);

            // Them measurement labels
            this.updateAllMeasurements();

            this.trackChanges();

            // Chuyen ve pointer mode sau khi ve xong (Fix 1)
            this.setDrawMode(null);
        });
    }

    // ========================================
    // MEASUREMENT LABELS (Fix 6 + 7)
    // ========================================

    /**
     * Cap nhat measurement cho tat ca layers
     */
    updateAllMeasurements() {
        this.measurementLayerGroup.clearLayers();
        this.sketchLayerGroup.eachLayer((layer) => {
            this.addMeasurementLabels(layer);
        });
    }

    /**
     * Them label dien tich va chieu dai canh
     * Fix 6: dung text-shadow (buffer trang) thay vi background trang
     */
    addMeasurementLabels(layer) {
        try {
            let geojson;
            if (typeof layer.toGeoJSON === "function") {
                geojson = layer.toGeoJSON();
            } else {
                return;
            }

            // Xu ly FeatureCollection (L.geoJSON tao ra)
            let features = [];
            if (geojson.type === "FeatureCollection") {
                features = geojson.features;
            } else if (geojson.type === "Feature") {
                features = [geojson];
            }

            features.forEach((feature) => {
                if (!feature.geometry || feature.geometry.type !== "Polygon") return;

                const coords = feature.geometry.coordinates[0];
                const areaM2 = turf.area(feature);
                const areaHa = areaM2 / 10000;

                // Label dien tich o trung tam
                const centerPoint = turf.centroid(feature);
                const center = [
                    centerPoint.geometry.coordinates[1],
                    centerPoint.geometry.coordinates[0],
                ];

                const textStroke =
                    "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, " +
                    "0 -1px 0 #fff, 0 1px 0 #fff, -1px 0 0 #fff, 1px 0 0 #fff";

                const areaLabel = document.createElement("div");
                areaLabel.style.cssText = `
                    font-weight: bold;
                    font-size: 13px;
                    text-align: center;
                    color: #222;
                    text-shadow: ${textStroke};
                    pointer-events: none;
                `;
                areaLabel.innerHTML = `${areaHa.toFixed(2)} ha`;

                const areaMarker = L.marker(center, {
                    icon: L.divIcon({
                        html: areaLabel,
                        className: "area-label-marker",
                        iconSize: [80, 20],
                        iconAnchor: [40, 10],
                    }),
                    interactive: false,
                });
                this.measurementLayerGroup.addLayer(areaMarker);

                // Label chieu dai canh (Fix 6: text-stroke)
                if (coords.length > 3) {
                    for (let i = 0; i < coords.length - 1; i++) {
                        const from = turf.point([coords[i][0], coords[i][1]]);
                        const to = turf.point([coords[i + 1][0], coords[i + 1][1]]);
                        const distance = turf.distance(from, to, { units: "meters" });

                        if (distance > 10) {
                            const midpoint = turf.midpoint(from, to);
                            const midLat = midpoint.geometry.coordinates[1];
                            const midLng = midpoint.geometry.coordinates[0];

                            const distText =
                                distance >= 1000
                                    ? (distance / 1000).toFixed(2) + " km"
                                    : distance.toFixed(0) + " m";

                            const edgeLabel = document.createElement("div");
                            edgeLabel.style.cssText = `
                                font-size: 10px;
                                color: #333;
                                white-space: nowrap;
                                text-shadow: ${textStroke};
                                pointer-events: none;
                            `;
                            edgeLabel.textContent = distText;

                            const edgeMarker = L.marker([midLat, midLng], {
                                icon: L.divIcon({
                                    html: edgeLabel,
                                    className: "edge-label-marker",
                                    iconSize: [50, 14],
                                    iconAnchor: [25, 7],
                                }),
                                interactive: false,
                            });
                            this.measurementLayerGroup.addLayer(edgeMarker);
                        }
                    }
                }
            });
        } catch (error) {
            console.warn("Loi khi them measurement labels:", error);
        }
    }

    /**
     * Gan event pm:markerdragend len 1 layer de cap nhat measurement real-time (Fix 7)
     */
    bindEditMeasurementUpdate(layer) {
        const updateFn = () => this.updateAllMeasurements();

        const bindOnSub = (l) => {
            if (l.on) {
                l.on("pm:markerdragend", updateFn);
                l.on("pm:vertexadded", updateFn);
                l.on("pm:vertexremoved", updateFn);
                l.on("pm:edit", updateFn);
            }
        };

        if (layer.eachLayer) {
            layer.eachLayer(bindOnSub);
        } else {
            bindOnSub(layer);
        }
    }

    /**
     * Go event measurement khoi layer
     */
    unbindEditMeasurementUpdate(layer) {
        const unbindOnSub = (l) => {
            if (l.off) {
                l.off("pm:markerdragend");
                l.off("pm:vertexadded");
                l.off("pm:vertexremoved");
                l.off("pm:edit");
            }
        };

        if (layer.eachLayer) {
            layer.eachLayer(unbindOnSub);
        } else {
            unbindOnSub(layer);
        }
    }

    // ========================================
    // TOOLBAR
    // ========================================

    setupToolButtons() {
        const toolbar = document.createElement("div");
        toolbar.id = "sketch-toolbar";
        toolbar.style.cssText = `
            background: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            padding: 5px;
            margin-top: 8px;
            display: none;
        `;

        // DRAW MODE TOOLS
        const pointerBtn = this.createToolButton(
            "Con trỏ", "bi-cursor", "Chế độ chọn đối tượng",
            () => this.setDrawMode(null),
        );
        pointerBtn.id = "sketch-pointer-btn";

        const drawBtn = this.createToolButton(
            "Vẽ Polygon", "bi-pentagon-fill", "Bắt đầu vẽ polygon",
            () => this.setDrawMode("Polygon"),
        );
        drawBtn.id = "sketch-draw-btn";

        const editBtn = this.createToolButton(
            "Chỉnh sửa", "bi-pencil-fill", "Chỉnh sửa đối tượng đã chọn",
            () => this.setDrawMode("edit"),
        );
        editBtn.id = "sketch-edit-btn";

        const removeBtn = this.createToolButton(
            "Xóa", "bi-trash-fill", "Xóa đối tượng đã chọn",
            () => this.handleRemoveSelected(),
        );
        removeBtn.id = "sketch-remove-btn";

        toolbar.appendChild(pointerBtn);
        toolbar.appendChild(drawBtn);
        toolbar.appendChild(editBtn);
        toolbar.appendChild(removeBtn);

        // Separator
        const separator = document.createElement("div");
        separator.style.cssText = "height: 1px; background: #ddd; margin: 5px 0;";
        toolbar.appendChild(separator);

        // ACTION BUTTONS
        const mergeBtn = this.createToolButton(
            "Merge", "bi-subtract", "Chọn ít nhất 2 đối tượng để gộp",
            () => this.handleMerge(),
        );
        mergeBtn.id = "sketch-merge-btn";
        mergeBtn.disabled = true;

        const copyWmsBtn = this.createToolButton(
            "Copy WMS", "bi-folder-plus", "Chọn polygon WMS để copy",
            () => this.enableWMSSelection(),
        );
        copyWmsBtn.id = "sketch-copy-wms-btn";

        const saveBtn = this.createToolButton(
            "Save", "bi-check2", "Không có polygon để lưu",
            () => this.handleSave(),
        );
        saveBtn.id = "sketch-save-btn";
        saveBtn.disabled = true;

        const splitBtn = this.createToolButton(
            "Split", "bi-scissors", "Chọn 1 đối tượng để tách",
            () => this.handleSplit(),
        );
        splitBtn.id = "sketch-split-btn";
        splitBtn.disabled = true;

        toolbar.appendChild(mergeBtn);
        toolbar.appendChild(copyWmsBtn);
        toolbar.appendChild(saveBtn);
        toolbar.appendChild(splitBtn);

        const sketchPanel = document.getElementById("sketchPanel");
        if (sketchPanel) {
            const cardBody = sketchPanel.querySelector(".card-body");
            if (cardBody) {
                cardBody.appendChild(toolbar);
            }
        }
        this.toolbar = toolbar;
    }

    createToolButton(label, icon, title, onClick) {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-secondary btn-sm";
        btn.title = title;
        btn.style.cssText = "width: 100%; text-align: left; margin-bottom: 5px;";
        btn.innerHTML = `<i class="bi ${icon}"></i> ${label}`;
        btn.addEventListener("click", onClick);
        return btn;
    }

    // ========================================
    // DRAW MODE (Fix 1, 2, 3)
    // ========================================

    setDrawMode(mode) {
        if (!this.isVisible) return;

        try {
            // Tat tat ca draw modes
            if (this.map.pm) {
                this.map.pm.disableDraw("Polygon");
                this.map.pm.disableDraw("Line");
            }

            // Disable edit trên tất cả layers
            this.sketchLayerGroup.eachLayer((layer) => {
                this._disableEditOnLayer(layer);
                this.unbindEditMeasurementUpdate(layer);
            });

            // Reset cursor
            this.map.getContainer().style.cursor = "";

            if (mode === "Polygon") {
                // Ve polygon moi
                if (this.map.pm) {
                    this.map.pm.enableDraw("Polygon");
                }
                this.clearSelection();
            } else if (mode === "edit") {
                // Fix 2: Chi edit cac layer da chon
                if (this.selectedLayers.size === 0) {
                    // Neu chua chon -> enable edit cho tat ca (fallback)
                    this.sketchLayerGroup.eachLayer((layer) => {
                        this._enableEditOnLayer(layer);
                        this.bindEditMeasurementUpdate(layer);
                    });
                } else {
                    this.selectedLayers.forEach((layer) => {
                        this._enableEditOnLayer(layer);
                        this.bindEditMeasurementUpdate(layer);
                    });
                }
            }
            // mode === null -> pointer/selection mode, khong lam gi them

            this.currentDrawMode = mode;
            this.updateDrawModeButtonStates(mode);
        } catch (error) {
            console.error("Loi khi thay doi draw mode:", error);
        }
    }

    _enableEditOnLayer(layer) {
        if (layer.pm) {
            layer.pm.enable();
        } else if (layer.eachLayer) {
            layer.eachLayer((sub) => {
                if (sub.pm) sub.pm.enable();
            });
        }
    }

    _disableEditOnLayer(layer) {
        if (layer.pm) {
            layer.pm.disable();
        } else if (layer.eachLayer) {
            layer.eachLayer((sub) => {
                if (sub.pm) sub.pm.disable();
            });
        }
    }

    /**
     * Fix 3: Xoa cac doi tuong da chon
     */
    handleRemoveSelected() {
        if (this.selectedLayers.size === 0) {
            alert("Chọn ít nhất 1 đối tượng để xóa");
            return;
        }

        this.selectedLayers.forEach((layer) => {
            this.sketchLayerGroup.removeLayer(layer);
        });
        this.selectedLayers.clear();
        this.updateAllMeasurements();
        this.trackChanges();
    }

    updateDrawModeButtonStates(activeMode) {
        const buttons = [
            { id: "sketch-pointer-btn", mode: null },
            { id: "sketch-draw-btn", mode: "Polygon" },
            { id: "sketch-edit-btn", mode: "edit" },
        ];

        buttons.forEach(({ id, mode }) => {
            const btn = document.getElementById(id);
            if (btn) {
                if (mode === activeMode) {
                    btn.classList.remove("btn-outline-secondary");
                    btn.classList.add("btn-secondary");
                } else {
                    btn.classList.remove("btn-secondary");
                    btn.classList.add("btn-outline-secondary");
                }
            }
        });
    }

    // ========================================
    // TRACK & BUTTON STATES
    // ========================================

    trackChanges() {
        this.isDirty = true;
        this.updateToolButtonsState();
    }

    updateToolButtonsState() {
        const selectedCount = this.selectedLayers.size;
        const saveable = this.getSaveablePolygons().length > 0;

        const mergeBtn = document.getElementById("sketch-merge-btn");
        const saveBtn = document.getElementById("sketch-save-btn");
        const splitBtn = document.getElementById("sketch-split-btn");
        const removeBtn = document.getElementById("sketch-remove-btn");

        // Fix 4: Merge can chon >= 2
        if (mergeBtn) {
            mergeBtn.disabled = selectedCount < 2;
            mergeBtn.title = selectedCount < 2
                ? `Chọn ít nhất 2 đối tượng (đang chọn ${selectedCount})`
                : `Gộp ${selectedCount} đối tượng`;
        }

        if (saveBtn) {
            saveBtn.disabled = !saveable;
            saveBtn.title = saveable ? "Lưu polygon" : "Không có polygon để lưu";
        }

        // Fix 5: Split can chon dung 1
        if (splitBtn) {
            splitBtn.disabled = selectedCount !== 1;
            splitBtn.title = selectedCount !== 1
                ? `Chọn đúng 1 đối tượng để tách (đang chọn ${selectedCount})`
                : "Tách đối tượng đã chọn";
        }

        // Remove can chon >= 1
        if (removeBtn) {
            removeBtn.title = selectedCount > 0
                ? `Xóa ${selectedCount} đối tượng đã chọn`
                : "Chọn đối tượng để xóa";
        }
    }

    // ========================================
    // MERGE (Fix 4)
    // ========================================

    async handleMerge() {
        if (this.selectedLayers.size < 2) {
            alert("Chọn ít nhất 2 đối tượng để gộp");
            return;
        }

        try {
            const selectedArr = Array.from(this.selectedLayers);
            const geojsons = selectedArr.map((l) => l.toGeoJSON());

            // Normalize to features array
            const features = [];
            geojsons.forEach((gj) => {
                if (gj.type === "FeatureCollection") {
                    features.push(...gj.features);
                } else {
                    features.push(gj);
                }
            });

            let merged = features[0];
            for (let i = 1; i < features.length; i++) {
                merged = turf.union(turf.featureCollection([merged, features[i]]));
            }

            // Xoa goc
            selectedArr.forEach((layer) => {
                this.sketchLayerGroup.removeLayer(layer);
            });
            this.selectedLayers.clear();

            // Tao layer moi
            const mergedLayer = L.geoJSON(merged.geometry, {
                style: this.mergeStyle,
            });
            mergedLayer._polygonId = this.generateUniquePolygonId();
            mergedLayer._isSaved = false;
            mergedLayer._createdAt = new Date().toISOString();
            mergedLayer._type = "merged";

            this.sketchLayerGroup.addLayer(mergedLayer);
            this.bindSelectionHandler(mergedLayer);
            this.updateAllMeasurements();
            this.trackChanges();
        } catch (error) {
            console.error("Loi khi gop polygon:", error);
            alert("Không thể gộp polygon: " + error.message);
        }
    }

    // ========================================
    // SPLIT (Fix 5)
    // ========================================

    handleSplit() {
        if (this.selectedLayers.size !== 1) {
            alert("Chọn đúng 1 đối tượng để tách");
            return;
        }

        const selectedLayer = Array.from(this.selectedLayers)[0];
        this.clearSelection();
        this.enterSplitMode(selectedLayer);
    }

    enterSplitMode(selectedLayer) {
        this.selectedPolygonForSplit = selectedLayer;
        this.isSplitMode = true;

        if (this.toolbar) this.toolbar.style.display = "none";
        this.showSplitInstruction();

        if (this.map.pm) {
            this.map.pm.enableDraw("Line");

            this.map.once("pm:create", (e) => {
                if (this.isSplitMode && this.selectedPolygonForSplit && e.layer) {
                    this.performSplit(e.layer.toGeoJSON());
                    this.map.removeLayer(e.layer);
                }
            });
        }

        this.map.getContainer().style.cursor = "crosshair";

        const escapeHandler = (event) => {
            if (event.key === "Escape") {
                this.exitSplitMode();
                document.removeEventListener("keydown", escapeHandler);
            }
        };
        document.addEventListener("keydown", escapeHandler);
    }

    showSplitInstruction() {
        let instruction = document.getElementById("split-instruction");
        if (!instruction) {
            instruction = document.createElement("div");
            instruction.id = "split-instruction";
            instruction.style.cssText = `
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8); color: white; padding: 20px 40px;
                border-radius: 8px; font-size: 16px; z-index: 9999; text-align: center;
            `;
            instruction.innerHTML = `
                <div>Vẽ đường cắt qua polygon</div>
                <div style="font-size: 12px; margin-top: 10px;">Nhấn ESC để hủy</div>
            `;
            this.map.getContainer().appendChild(instruction);
        }
    }

    hideSplitInstruction() {
        const instruction = document.getElementById("split-instruction");
        if (instruction) instruction.remove();
    }

    async performSplit(splitLineGeoJSON) {
        if (!this.selectedPolygonForSplit) return;

        try {
            let polygonFeature;
            const gj = this.selectedPolygonForSplit.toGeoJSON();
            if (gj.type === "FeatureCollection" && gj.features.length > 0) {
                polygonFeature = gj.features[0];
            } else {
                polygonFeature = gj;
            }

            const thinBuffer = turf.buffer(splitLineGeoJSON, 0.0001, { units: "kilometers" });
            const diff = turf.difference(turf.featureCollection([polygonFeature, thinBuffer]));

            let splitResults = [];

            if (diff && diff.geometry && diff.geometry.type === "MultiPolygon") {
                diff.geometry.coordinates.forEach((coords) => {
                    splitResults.push({
                        type: "Feature",
                        geometry: { type: "Polygon", coordinates: coords },
                        properties: {},
                    });
                });
            } else if (diff && diff.geometry && diff.geometry.type === "Polygon") {
                alert("Đường cắt phải đi qua polygon để tách thành 2 phần");
                this.exitSplitMode();
                return;
            }

            if (splitResults.length > 1) {
                this.sketchLayerGroup.removeLayer(this.selectedPolygonForSplit);

                splitResults.forEach((part, index) => {
                    const style = this.splitResultStyles[index % this.splitResultStyles.length];
                    const partLayer = L.geoJSON(part.geometry, { style });

                    partLayer._polygonId = this.generateUniquePolygonId();
                    partLayer._isSaved = false;
                    partLayer._createdAt = new Date().toISOString();
                    partLayer._type = "split";
                    partLayer._splitIndex = index;

                    this.sketchLayerGroup.addLayer(partLayer);
                    this.bindSelectionHandler(partLayer);
                });

                this.shouldCheckPolygonCount = false;
                this.updateAllMeasurements();
                this.trackChanges();
            } else {
                alert("Không thể tách polygon: đường cắt không hợp lệ");
            }
        } catch (error) {
            console.error("Loi khi tach polygon:", error);
            alert("Lỗi khi tách polygon: " + error.message);
        } finally {
            this.exitSplitMode();
        }
    }

    exitSplitMode() {
        this.isSplitMode = false;
        this.selectedPolygonForSplit = null;

        if (this.toolbar) this.toolbar.style.display = "block";
        this.hideSplitInstruction();
        this.map.getContainer().style.cursor = "";

        if (this.map.pm) {
            try { this.map.pm.disableDraw("Line"); } catch (e) { /* ignore */ }
        }
    }

    // ========================================
    // SAVE
    // ========================================

    getSaveablePolygons() {
        return this.sketchLayerGroup
            .getLayers()
            .filter((layer) => this.canPolygonBeSaved(layer));
    }

    canPolygonBeSaved(layer) {
        return layer && (!layer._isSaved || (layer._isSaved && layer._isModified));
    }

    markPolygonAsSaved(layer) {
        layer._isSaved = true;
        layer._isModified = false;
        if (layer.setStyle) layer.setStyle(this.savedStyle);
        this.savedPolygonIds.add(layer._polygonId);
    }

    async handleSave() {
        // Khi co maxElements: chi save cac layer dang duoc chon
        let toSave;
        if (this.options.maxElements > 0) {
            if (this.selectedLayers.size === 0) {
                // Neu chua chon va chi co duy nhat 1 layer -> tu dong chon no
                const allLayers = this.sketchLayerGroup.getLayers();
                const saveableAll = allLayers.filter((l) => this.canPolygonBeSaved(l));
                if (saveableAll.length === 1) {
                    toSave = saveableAll;
                } else if (saveableAll.length > 1) {
                    alert(`Có ${saveableAll.length} hình trên bản đồ. Hãy chọn tối đa ${this.options.maxElements} hình để lưu.`);
                    return;
                } else {
                    alert("Không có polygon để lưu");
                    return;
                }
            } else {
                // Chi lay cac layer da chon va co the save
                toSave = Array.from(this.selectedLayers).filter((l) => this.canPolygonBeSaved(l));
                if (toSave.length === 0) {
                    alert("Các hình đã chọn không thể lưu (đã lưu rồi hoặc không hợp lệ)");
                    return;
                }
                if (toSave.length > this.options.maxElements) {
                    alert(`Chỉ cho phép lưu tối đa ${this.options.maxElements} hình mỗi lần. Đang chọn ${toSave.length} hình.`);
                    return;
                }
            }
        } else {
            // Khong gioi han -> save tat ca
            toSave = this.getSaveablePolygons();
            if (toSave.length === 0) {
                alert("Không có polygon để lưu");
                return;
            }
        }

        try {
            const polygonData = toSave.map((layer) => this.layerToWKT(layer));

            if (!window.filterScope) {
                alert("filterScope không được định nghĩa");
                return;
            }

            const payload = {
                polygonData: polygonData,
                filterScope: window.filterScope,
            };

            const response = await fetch(this.options.apiEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            toSave.forEach((layer) => this.markPolygonAsSaved(layer));
            this.isDirty = false;

            alert("Lưu thành công!");

            if (this.options.redirectAfterSave && this.options.redirectUrl) {
                setTimeout(() => { window.location.href = this.options.redirectUrl; }, 1000);
            }
        } catch (error) {
            console.error("Loi khi luu polygon:", error);
            alert("Lỗi khi lưu: " + error.message);
        }
    }

    layerToWKT(layer) {
        const geojson = layer.toGeoJSON();
        let feature;
        if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
            feature = geojson.features[0];
        } else {
            feature = geojson;
        }

        const wktString = this.createWKTFromGeometry(feature.geometry);
        const areaM2 = turf.area(feature);
        const areaHa = areaM2 / 10000;
        const centroidPoint = turf.centroid(feature);

        return {
            id: layer._polygonId,
            name: layer._polygonId,
            geom: wktString,
            srid: 4326,
            area: areaHa.toFixed(4),
            centroid_longitude: centroidPoint.geometry.coordinates[0],
            centroid_latitude: centroidPoint.geometry.coordinates[1],
            properties: {
                type: layer._type || "manual",
                createdAt: layer._createdAt,
            },
        };
    }

    createWKTFromGeometry(geometry) {
        if (geometry.type === "Polygon") {
            const wktCoords = geometry.coordinates[0]
                .map((c) => `${c[0]} ${c[1]}`)
                .join(", ");
            return `POLYGON((${wktCoords}))`;
        } else if (geometry.type === "MultiPolygon") {
            const polygons = geometry.coordinates.map((coords) => {
                const wktCoords = coords[0].map((c) => `${c[0]} ${c[1]}`).join(", ");
                return `(${wktCoords})`;
            });
            return `MULTIPOLYGON(${polygons.join(", ")})`;
        }
        return null;
    }

    // ========================================
    // WMS SELECTION
    // ========================================

    enableWMSSelection() {
        this.isWMSSelectionMode = true;

        this._wmsSelectionClickHandler = (event) => {
            L.DomEvent.stopPropagation(event);
            this.queryAndCopyWMS(event);
        };
        this.map.on("click", this._wmsSelectionClickHandler);

        this.map.getContainer().style.cursor = "copy";
        alert("Click vào polygon WMS trên bản đồ để copy");
    }

    disableWMSSelection() {
        this.isWMSSelectionMode = false;

        if (this._wmsSelectionClickHandler) {
            this.map.off("click", this._wmsSelectionClickHandler);
            this._wmsSelectionClickHandler = null;
        }

        this.map.getContainer().style.cursor = "";
    }

    async queryAndCopyWMS(event) {
        if (!this.isWMSSelectionMode) return;
        if (typeof wmsManager === "undefined") return;

        try {
            // Lay lop WMS tren cung theo zIndex
            const sortedConfigs = wmsManager.getVisibleConfigsSortedByZIndex();
            if (sortedConfigs.length === 0) {
                alert("Không có lớp WMS nào đang hiển thị");
                this.disableWMSSelection();
                return;
            }

            // Query tung lop tu tren xuong, lay lop dau tien co geometry
            let foundFeature = null;
            for (const config of sortedConfigs) {
                const layer = wmsManager.wmsLayers.get(config.id);
                if (!layer) continue;

                const result = await wmsManager.quickCheckFeatureInfo(event, layer, config);
                if (result && result.data && result.data.length > 0) {
                    const feature = result.data[0];
                    if (feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                        foundFeature = feature;
                        break;
                    }
                }
            }

            if (foundFeature) {
                this.convertWMSToSketch(foundFeature);
            } else {
                alert("Không tìm thấy polygon tại vị trí click");
            }
        } catch (error) {
            console.error("Loi khi query WMS:", error);
            alert("Lỗi khi query WMS: " + error.message);
        } finally {
            this.disableWMSSelection();
        }
    }

    convertWMSToSketch(wmsFeature) {
        try {
            const newLayer = L.geoJSON(wmsFeature.geometry, { style: this.fillStyle });

            newLayer._polygonId = this.generateUniquePolygonId();
            newLayer._isSaved = false;
            newLayer._createdAt = new Date().toISOString();
            newLayer._properties = wmsFeature.properties || {};

            this.sketchLayerGroup.addLayer(newLayer);
            this.bindSelectionHandler(newLayer);
            this.updateAllMeasurements();
            this.trackChanges();
            alert("Đã sao chép polygon từ WMS");
        } catch (error) {
            console.error("Loi khi sao chep polygon:", error);
            alert("Lỗi khi sao chép: " + error.message);
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    generateUniquePolygonId() {
        this.polygonCounter++;
        return `polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${this.polygonCounter}`;
    }

    /**
     * Bat/tat sketch tool (Fix 1: auto bat pointer mode khi toggle on)
     */
    toggle() {
        if (this.isVisible) {
            // === TAT ===
            this.map.removeLayer(this.sketchLayerGroup);
            this.map.removeLayer(this.measurementLayerGroup);

            if (this.toolbar) this.toolbar.style.display = "none";

            if (this.map.pm) {
                try {
                    this.map.pm.disableDraw("Polygon");
                    this.map.pm.disableDraw("Line");
                } catch (e) { /* ignore */ }
            }

            this.sketchLayerGroup.eachLayer((layer) => {
                this._disableEditOnLayer(layer);
                this.unbindEditMeasurementUpdate(layer);
            });

            this.clearSelection();
            this.currentDrawMode = null;
            this.updateDrawModeButtonStates(null);
            this.map.getContainer().style.cursor = "";

            this.restoreWFSClickHandler();
            this.isVisible = false;
        } else {
            // === BAT ===
            this.map.addLayer(this.sketchLayerGroup);
            this.map.addLayer(this.measurementLayerGroup);

            if (this.toolbar) this.toolbar.style.display = "block";

            this.disableWFSClickHandler();

            // Fix 1: Auto bat pointer mode (con tro) khi toggle on
            this.currentDrawMode = null;
            this.updateDrawModeButtonStates(null);

            this.isVisible = true;
        }

        return this.isVisible;
    }

    disableWFSClickHandler() {
        if (this._wfsHandler) {
            this.map.off("click", this._wfsHandler);
        }
    }

    restoreWFSClickHandler() {
        if (typeof wmsManager !== "undefined" && this._wfsHandler) {
            this.map.on("click", this._wfsHandler);
        }
    }

    setWFSClickHandler(handler) {
        this._wfsHandler = handler;
    }

    destroy() {
        this.sketchLayerGroup.eachLayer((layer) => {
            this.unbindEditMeasurementUpdate(layer);
        });

        this.disableWFSClickHandler();

        if (this.toolbar) this.toolbar.remove();
        this.map.removeLayer(this.sketchLayerGroup);
        this.map.removeLayer(this.measurementLayerGroup);
    }
}
