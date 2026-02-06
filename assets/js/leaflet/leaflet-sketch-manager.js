/**
 * Module 4: SketchManager
 * Quan ly cong cu ve va chinh sua polygon
 * Su dung Leaflet-Geoman va Turf.js
 */
class SketchManager {
    constructor(map, options = {}, mapInstance = null) {
        this.map = map;
        this.mapInstance = mapInstance;
        this.options = {
            enableSave: true,
            enableMerge: true,
            enableSplit: true,
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

        // State
        this.isSplitMode = false;
        this.selectedPolygonForSplit = null;
        this.isDirty = false;
        this.savedPolygonIds = new Set();
        this.polygonCounter = 0;
        this.isWMSSelectionMode = false;
        this.selectedWMSFeature = null;
        this.disabledWMSLayers = [];
        this.isVisible = false;
        this.toolbar = null;
        this.shouldCheckPolygonCount = true;
        this.removeClickHandler = null;
        this.currentDrawMode = null;
        this.wfsClickHandler = null;

        // Styles
        this.fillStyle = {
            color: "#e38b4f",
            fillColor: "#e38b4f",
            fillOpacity: 0.8,
            weight: 1,
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

    /**
     * Khoi tao toan bo sketch system
     */
    initialize() {
        // An sketch layers ban dau
        this.map.removeLayer(this.sketchLayerGroup);
        this.map.removeLayer(this.measurementLayerGroup);

        // Cau hinh Leaflet-Geoman (khong dung controls, se dung custom toolbar)
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
                drawPolygon: false, // MAC DINH KHONG VEO VE
                editMode: false,    // MAC DINH KHONG VEO EDIT
                dragMode: false,
                removalMode: false,
            });

            // An toolbar mac dinh
            const toolbars = document.querySelectorAll(".leaflet-pm-toolbar");
            toolbars.forEach((tb) => (tb.style.display = "none"));
        }

        this.setupSketchEvents();
        this.setupToolButtons();
    }

    /**
     * Thiet lap event listeners cho ve/chinh sua
     */
    setupSketchEvents() {
        // Event khi ve xong polygon
        this.map.on("pm:create", (e) => {
            if (!this.isVisible || !e.layer) return;

            // Xoa tat ca polygon cu
            this.sketchLayerGroup.clearLayers();
            this.measurementLayerGroup.clearLayers(); // Xoa measurement cu

            if (window.filterScope) {
                filterScope.tt = null;
                delete filterScope.id;
            }

            // Set style
            e.layer.setStyle(this.fillStyle);
            e.layer.pm.enable();

            // Gan attributes
            e.layer._polygonId = this.generateUniquePolygonId();
            e.layer._isSaved = false;
            e.layer._createdAt = new Date().toISOString();

            // Them vao sketchLayerGroup
            this.sketchLayerGroup.addLayer(e.layer);

            // Them label dien tich va chieu dai canh
            this.addMeasurementLabels(e.layer);

            this.trackChanges();
        });

        // Event khi chinh sua polygon
        this.map.on("pm:edit", (e) => {
            if (!this.isVisible || !e.layer) return;

            if (e.layer._isSaved) {
                e.layer._isModified = true;
            }

            // Cap nhat measurement labels
            this.measurementLayerGroup.clearLayers();
            this.addMeasurementLabels(e.layer);

            this.trackChanges();
        });

        // Event khi xoa polygon
        this.map.on("pm:remove", (e) => {
            if (!this.isVisible || !e.layer) return;

            this.sketchLayerGroup.removeLayer(e.layer);
            this.measurementLayerGroup.clearLayers();
            this.trackChanges();
        });
    }

    /**
     * Them label dien tich va chieu dai canh
     */
    addMeasurementLabels(layer) {
        try {
            const geojson = layer.toGeoJSON();

            if (geojson.geometry.type !== "Polygon") {
                return;
            }

            const coords = geojson.geometry.coordinates[0];

            // Tinh dien tich (m2 -> ha)
            const areaM2 = turf.area(geojson);
            const areaHa = areaM2 / 10000;

            // Tinh center
            const centerPoint = turf.centroid(geojson);
            const center = [centerPoint.geometry.coordinates[1], centerPoint.geometry.coordinates[0]];

            // Tao markerGroup de hien thi dien tich o center
            const areaLabel = document.createElement("div");
            areaLabel.style.cssText = `
                background: white;
                padding: 6px 10px;
                border-radius: 4px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-weight: bold;
                font-size: 12px;
                min-width: 60px;
                text-align: center;
                color: #333;
            `;
            areaLabel.innerHTML = `${areaHa.toFixed(2)}<br/><small>hectare</small>`;

            // Marker at center hien thi dien tich
            const areaMarker = L.marker(center, {
                icon: L.divIcon({
                    html: areaLabel,
                    className: "area-label-marker",
                    iconSize: [80, 50],
                }),
                interactive: false,
            });
            this.measurementLayerGroup.addLayer(areaMarker);

            // Hien thi chieu dai canh (optional - chi show khi co nhieu canh)
            if (coords.length > 3) {
                for (let i = 0; i < coords.length - 1; i++) {
                    const from = turf.point([coords[i][0], coords[i][1]]);
                    const to = turf.point([coords[i + 1][0], coords[i + 1][1]]);

                    // Tinh khoang cach (meters)
                    const distance = turf.distance(from, to, { units: "meters" });

                    // Tinh diem giua cua canh
                    const midpoint = turf.midpoint(from, to);
                    const midLat = midpoint.geometry.coordinates[1];
                    const midLng = midpoint.geometry.coordinates[0];

                    // Hien thi chieu dai canh (neu lon hon 10m)
                    if (distance > 10) {
                        const edgeLabel = document.createElement("div");
                        edgeLabel.style.cssText = `
                            background: rgba(255,255,255,0.9);
                            padding: 2px 4px;
                            border-radius: 2px;
                            font-size: 10px;
                            color: #666;
                            white-space: nowrap;
                        `;

                        // Display as km or m
                        let distText;
                        if (distance >= 1000) {
                            distText = (distance / 1000).toFixed(2) + " km";
                        } else {
                            distText = distance.toFixed(0) + " m";
                        }

                        edgeLabel.innerHTML = distText;

                        const edgeMarker = L.marker([midLat, midLng], {
                            icon: L.divIcon({
                                html: edgeLabel,
                                className: "edge-label-marker",
                                iconSize: [40, 16],
                            }),
                            interactive: false,
                        });
                        this.measurementLayerGroup.addLayer(edgeMarker);
                    }
                }
            }
        } catch (error) {
            console.warn("Loi khi them measurement labels:", error);
        }
    }

    /**
     * Tao custom toolbar voi cac nut: Merge, Copy WMS, Save, Split
     */
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

        // ========== DRAW MODE TOOLS ==========
        // Selection/Pointer button
        const pointerBtn = this.createToolButton(
            "Con trỏ",
            "bi-cursor",
            "Chế độ chọn",
            () => this.setDrawMode(null),
        );
        pointerBtn.id = "sketch-pointer-btn";

        // Draw Polygon button
        const drawBtn = this.createToolButton(
            "Vẽ Polygon",
            "bi-pentagon-fill",
            "Bắt đầu vẽ polygon",
            () => this.setDrawMode("Polygon"),
        );
        drawBtn.id = "sketch-draw-btn";

        // Edit button
        const editBtn = this.createToolButton(
            "Chỉnh sửa",
            "bi-pencil-fill",
            "Chỉnh sửa polygon đã vẽ",
            () => this.setDrawMode("edit"),
        );
        editBtn.id = "sketch-edit-btn";

        // Remove button
        const removeBtn = this.createToolButton(
            "Xóa",
            "bi-trash-fill",
            "Xóa polygon",
            () => this.setDrawMode("remove"),
        );
        removeBtn.id = "sketch-remove-btn";

        // Add draw mode tools to toolbar
        toolbar.appendChild(pointerBtn);
        toolbar.appendChild(drawBtn);
        toolbar.appendChild(editBtn);
        toolbar.appendChild(removeBtn);

        // Separator line
        const separator = document.createElement("div");
        separator.style.cssText = "height: 1px; background: #ddd; margin: 5px 0;";
        toolbar.appendChild(separator);

        // ========== ACTION BUTTONS ==========
        // Merge button
        const mergeBtn = this.createToolButton(
            "Merge",
            "bi-subtract",
            "Chon it nhat 2 vung de gop",
            () => this.handleMerge(),
        );
        mergeBtn.id = "sketch-merge-btn";
        mergeBtn.disabled = true;

        // Copy WMS button
        const copyWmsBtn = this.createToolButton(
            "Copy WMS",
            "bi-folder-plus",
            "Chon polygon WMS de copy",
            () => this.enableWMSSelection(),
        );
        copyWmsBtn.id = "sketch-copy-wms-btn";

        // Save button
        const saveBtn = this.createToolButton(
            "Save",
            "bi-check2",
            "Khong co polygon de luu",
            () => this.handleSave(),
        );
        saveBtn.id = "sketch-save-btn";
        saveBtn.disabled = true;

        // Split button
        const splitBtn = this.createToolButton(
            "Split",
            "bi-scissors",
            "Chon 1 vung de tach",
            () => this.handleSplit(),
        );
        splitBtn.id = "sketch-split-btn";
        splitBtn.disabled = true;

        toolbar.appendChild(mergeBtn);
        toolbar.appendChild(copyWmsBtn);
        toolbar.appendChild(saveBtn);
        toolbar.appendChild(splitBtn);

        // Append toolbar to sketch panel (below toggle button)
        const sketchPanel = document.getElementById("sketchPanel");
        if (sketchPanel) {
            const cardBody = sketchPanel.querySelector(".card-body");
            if (cardBody) {
                cardBody.appendChild(toolbar);
            }
        }
        this.toolbar = toolbar;
    }

    /**
     * Tao nut tool chung
     */
    createToolButton(label, icon, title, onClick) {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-secondary btn-sm";
        btn.title = title;
        btn.style.cssText = `
            width: 100%;
            text-align: left;
            margin-bottom: 5px;
        `;
        btn.innerHTML = `<i class="bi ${icon}"></i> ${label}`;
        btn.addEventListener("click", onClick);
        return btn;
    }

    /**
     * Thay doi che do ve (pointer/draw/edit/remove)
     */
    setDrawMode(mode) {
        if (!this.isVisible) return;

        try {
            // Tat tat ca cac che do hien tai
            if (this.map.pm) {
                this.map.pm.disableDraw("Polygon");
                this.map.pm.disableDraw("Line");
            }

            // Disable edit mode on all layers
            this.sketchLayerGroup.eachLayer((layer) => {
                if (layer.pm) {
                    layer.pm.disable();
                }
            });

            // Remove remove mode handler if exists
            this.removeRemoveModeHandler();

            // Kich hoat che do yeu cau
            if (mode === "Polygon") {
                if (this.map.pm) {
                    this.map.pm.enableDraw("Polygon");
                }
            } else if (mode === "edit") {
                // Enable edit mode on all layers
                this.sketchLayerGroup.eachLayer((layer) => {
                    if (layer.pm) {
                        layer.pm.enable();
                    }
                });
            } else if (mode === "remove") {
                // Kich hoat remove mode bang click handler
                this.enableRemoveMode();
            }
            // mode === null = pointer/selection mode - tat het

            // Luu che do hien tai
            this.currentDrawMode = mode;

            // Cap nhat trang thai cac nut
            this.updateDrawModeButtonStates(mode);
        } catch (error) {
            console.error("Loi khi thay doi draw mode:", error);
        }
    }

    /**
     * Kich hoat remove mode
     */
    enableRemoveMode() {
        // Setup click handler de xoa layer
        this.removeClickHandler = (e) => {
            const clickedLayer = e.layer;
            if (
                clickedLayer &&
                this.sketchLayerGroup.hasLayer(clickedLayer)
            ) {
                this.sketchLayerGroup.removeLayer(clickedLayer);
                this.measurementLayerGroup.clearLayers();
                this.trackChanges();
            }
        };
        this.map.on("click", this.removeClickHandler);

        // Doi cursor thanh crosshair de bao hieu dang o remove mode
        this.map.getContainer().style.cursor = "not-allowed";
    }

    /**
     * Tat remove mode handler
     */
    removeRemoveModeHandler() {
        if (this.removeClickHandler) {
            this.map.off("click", this.removeClickHandler);
            this.removeClickHandler = null;
        }
        this.map.getContainer().style.cursor = "grab";
    }

    /**
     * Cap nhat trang thai visual cua draw mode buttons
     */
    updateDrawModeButtonStates(activeMode) {
        const pointerBtn = document.getElementById("sketch-pointer-btn");
        const drawBtn = document.getElementById("sketch-draw-btn");
        const editBtn = document.getElementById("sketch-edit-btn");
        const removeBtn = document.getElementById("sketch-remove-btn");

        const buttons = [
            { btn: pointerBtn, mode: null },
            { btn: drawBtn, mode: "Polygon" },
            { btn: editBtn, mode: "edit" },
            { btn: removeBtn, mode: "remove" },
        ];

        buttons.forEach(({ btn, mode }) => {
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

    /**
     * Theo doi thay doi
     */
    trackChanges() {
        this.isDirty = true;
        this.updateToolButtonsState();
    }

    /**
     * Cap nhat trang thai cac nut
     */
    updateToolButtonsState() {
        const selectedLayers = this.sketchLayerGroup.getLayers();
        const hasMultipleSelection = selectedLayers.length >= 2;
        const hasSingleSelection = selectedLayers.length === 1;
        const saveable = this.getSaveablePolygons().length > 0;

        const mergeBtn = document.getElementById("sketch-merge-btn");
        const saveBtn = document.getElementById("sketch-save-btn");
        const splitBtn = document.getElementById("sketch-split-btn");

        if (mergeBtn) mergeBtn.disabled = !hasMultipleSelection;
        if (saveBtn) {
            saveBtn.disabled = !saveable;
            saveBtn.title = saveable
                ? "Luu polygon"
                : "Khong co polygon de luu";
        }
        if (splitBtn) {
            splitBtn.disabled = !hasSingleSelection;
            splitBtn.title = hasSingleSelection
                ? "Tach polygon"
                : "Chon 1 vung de tach";
        }
    }

    /**
     * Gop 2+ polygon thanh 1
     */
    async handleMerge() {
        const selectedLayers = this.sketchLayerGroup.getLayers();
        if (selectedLayers.length < 2) {
            alert("Chon it nhat 2 polygon de gop");
            return;
        }

        try {
            const selectedGeoJSONs = selectedLayers.map((layer) =>
                layer.toGeoJSON(),
            );

            // Dung Turf.js de gop
            let merged = selectedGeoJSONs[0];
            for (let i = 1; i < selectedGeoJSONs.length; i++) {
                const fc = turf.featureCollection([
                    merged,
                    selectedGeoJSONs[i],
                ]);
                merged = turf.union(fc);
            }

            // Xoa cac polygon goc
            selectedLayers.forEach((layer) => {
                this.sketchLayerGroup.removeLayer(layer);
            });

            // Tao polygon moi tu merged GeoJSON
            const mergedLayer = L.geoJSON(merged.geometry, {
                style: this.mergeStyle,
            });

            mergedLayer.setStyle(this.mergeStyle);
            mergedLayer.pm.enable();

            // Gan attributes
            mergedLayer._polygonId = this.generateUniquePolygonId();
            mergedLayer._isSaved = false;
            mergedLayer._createdAt = new Date().toISOString();
            mergedLayer._type = "merged";

            this.sketchLayerGroup.addLayer(mergedLayer);
            this.trackChanges();
        } catch (error) {
            console.error("Loi khi gop polygon:", error);
            alert("Khong the gop polygon: " + error.message);
        }
    }

    /**
     * Bat dau che do tach polygon
     */
    handleSplit() {
        const selectedLayers = this.sketchLayerGroup.getLayers();
        if (selectedLayers.length !== 1) {
            alert("Chon dung 1 polygon de tach");
            return;
        }

        this.enterSplitMode(selectedLayers[0]);
    }

    /**
     * Vao che do cat polygon
     */
    enterSplitMode(selectedLayer) {
        this.selectedPolygonForSplit = selectedLayer;
        this.isSplitMode = true;

        // An toolbar
        if (this.toolbar) this.toolbar.style.display = "none";

        // Hien instruction
        this.showSplitInstruction();

        // Bat che do ve duong
        if (this.map.pm) {
            this.map.pm.enableDraw("Line");

            // Lang nghe event pm:create cho line
            this.map.once("pm:create", (e) => {
                if (
                    this.isSplitMode &&
                    this.selectedPolygonForSplit &&
                    e.layer
                ) {
                    this.performSplit(e.layer.toGeoJSON());
                    this.map.removeLayer(e.layer);
                }
            });
        }

        // Doi cursor thanh crosshair
        this.map.getContainer().style.cursor = "crosshair";

        // Them ESC key handler
        const escapeHandler = (event) => {
            if (event.key === "Escape") {
                this.exitSplitMode();
                document.removeEventListener("keydown", escapeHandler);
            }
        };
        document.addEventListener("keydown", escapeHandler);
    }

    /**
     * Hien instruction overlay
     */
    showSplitInstruction() {
        let instruction = document.getElementById("split-instruction");
        if (!instruction) {
            instruction = document.createElement("div");
            instruction.id = "split-instruction";
            instruction.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px 40px;
                border-radius: 8px;
                font-size: 16px;
                z-index: 9999;
                text-align: center;
            `;
            instruction.innerHTML = `
                <div>Ve duong cat qua polygon</div>
                <div style="font-size: 12px; margin-top: 10px;">Nhan ESC de huy</div>
            `;
            this.map.getContainer().appendChild(instruction);
        }
    }

    /**
     * An instruction overlay
     */
    hideSplitInstruction() {
        const instruction = document.getElementById("split-instruction");
        if (instruction) {
            instruction.remove();
        }
    }

    /**
     * Thuc hien cat polygon bang duong ve
     */
    async performSplit(splitLineGeoJSON) {
        if (!this.selectedPolygonForSplit) return;

        try {
            const polygonFeature = this.selectedPolygonForSplit.toGeoJSON();
            const lineFeature = splitLineGeoJSON;

            // Tao buffer nho tu line (0.0001km ~ 10m)
            const thinBuffer = turf.buffer(lineFeature, 0.0001, {
                units: "kilometers",
            });

            // Su dung difference de cat polygon
            const diff = turf.difference(
                turf.featureCollection([polygonFeature, thinBuffer]),
            );

            let splitResults = [];

            // Neu ket qua la MultiPolygon
            if (
                diff &&
                diff.geometry &&
                diff.geometry.type === "MultiPolygon"
            ) {
                diff.geometry.coordinates.forEach((coords, index) => {
                    splitResults.push({
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: coords,
                        },
                        properties: {},
                    });
                });
            } else if (
                diff &&
                diff.geometry &&
                diff.geometry.type === "Polygon"
            ) {
                // Neu chi co 1 polygon -> cat khong thành công
                console.warn("Duong cat khong chia polygon thanh 2 phan");
                alert("Duong cat phai di qua polygon de tach thanh 2 phan");
                this.exitSplitMode();
                return;
            }

            if (splitResults.length > 1) {
                // Xoa polygon goc
                this.sketchLayerGroup.removeLayer(this.selectedPolygonForSplit);

                // Tao Leaflet layer cho moi phan
                splitResults.forEach((part, index) => {
                    const style =
                        this.splitResultStyles[
                            index % this.splitResultStyles.length
                        ];
                    const partLayer = L.geoJSON(part.geometry, { style });
                    partLayer.setStyle(style);
                    partLayer.pm.enable();

                    // Gan attributes
                    partLayer._polygonId = this.generateUniquePolygonId();
                    partLayer._isSaved = false;
                    partLayer._createdAt = new Date().toISOString();
                    partLayer._type = "split";
                    partLayer._splitIndex = index;

                    this.sketchLayerGroup.addLayer(partLayer);
                });

                this.shouldCheckPolygonCount = false;
                this.trackChanges();
            } else {
                alert("Khong the tach polygon: duong cat khong hop le");
            }
        } catch (error) {
            console.error("Loi khi tach polygon:", error);
            alert("Loi khi tach polygon: " + error.message);
        } finally {
            this.exitSplitMode();
        }
    }

    /**
     * Thoat che do cat
     */
    exitSplitMode() {
        this.isSplitMode = false;
        this.selectedPolygonForSplit = null;

        // Hien toolbar
        if (this.toolbar) this.toolbar.style.display = "block";

        // An instruction
        this.hideSplitInstruction();

        // Doi cursor ve default
        this.map.getContainer().style.cursor = "grab";

        // Tat Line draw neu co
        if (this.map.pm) {
            try {
                this.map.pm.disableDraw("Line");
            } catch (e) {
                // Ignore error
            }
        }
    }

    /**
     * Lay danh sach polygon co the luu
     */
    getSaveablePolygons() {
        return this.sketchLayerGroup
            .getLayers()
            .filter((layer) => this.canPolygonBeSaved(layer));
    }

    /**
     * Kiem tra polygon co the save khong
     */
    canPolygonBeSaved(layer) {
        return (
            layer && (!layer._isSaved || (layer._isSaved && layer._isModified))
        );
    }

    /**
     * Mark polygon as saved
     */
    markPolygonAsSaved(layer) {
        layer._isSaved = true;
        layer._isModified = false;
        layer.setStyle(this.savedStyle);
        this.savedPolygonIds.add(layer._polygonId);
    }

    /**
     * Xu ly luu polygon (POST API)
     */
    async handleSave() {
        const saveable = this.getSaveablePolygons();
        if (saveable.length === 0) {
            alert("Khong co polygon de luu");
            return;
        }

        // Kiem tra so luong
        if (this.shouldCheckPolygonCount && saveable.length < 1) {
            alert("Can luu it nhat 1 polygon");
            return;
        }

        try {
            const polygonData = saveable.map((layer) => this.layerToWKT(layer));

            // Kiem tra filterScope
            if (!window.filterScope) {
                alert("filterScope khong duoc dinh nghia");
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

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            // Mark saved
            saveable.forEach((layer) => this.markPolygonAsSaved(layer));
            this.isDirty = false;

            alert("Luu thanh cong!");

            // Xu ly redirect neu co
            if (this.options.redirectAfterSave && this.options.redirectUrl) {
                setTimeout(() => {
                    window.location.href = this.options.redirectUrl;
                }, 1000);
            }
        } catch (error) {
            console.error("Loi khi luu polygon:", error);
            alert("Loi khi luu: " + error.message);
        }
    }

    /**
     * Chuyen Leaflet layer sang WKT format
     */
    layerToWKT(layer) {
        const geojson = layer.toGeoJSON();
        const wktString = this.createWKTFromGeometry(geojson.geometry);

        // Tinh dien tich (m2 -> ha)
        const areaM2 = turf.area(geojson);
        const areaHa = areaM2 / 10000;

        // Tinh centroid
        const centroidPoint = turf.centroid(geojson);

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

    /**
     * Tao WKT string tu GeoJSON geometry
     */
    createWKTFromGeometry(geometry) {
        if (geometry.type === "Polygon") {
            const coords = geometry.coordinates[0]; // Outer ring
            const wktCoords = coords
                .map((coord) => `${coord[0]} ${coord[1]}`)
                .join(", ");
            return `POLYGON((${wktCoords}))`;
        } else if (geometry.type === "MultiPolygon") {
            const polygons = geometry.coordinates.map((coords) => {
                const wktCoords = coords[0]
                    .map((coord) => `${coord[0]} ${coord[1]}`)
                    .join(", ");
                return `(${wktCoords})`;
            });
            return `MULTIPOLYGON(${polygons.join(", ")})`;
        }
        return null;
    }

    /**
     * Enable WMS selection mode
     */
    enableWMSSelection() {
        this.isWMSSelectionMode = true;

        // Disable cac WMS layer
        if (typeof wmsManager !== "undefined") {
            this.disabledWMSLayers = [];
            wmsManager.wmsLayers.forEach((layer, configId) => {
                if (this.map.hasLayer(layer)) {
                    this.disabledWMSLayers.push(configId);
                    this.map.removeLayer(layer);
                }
            });
        }

        // Them click handler
        this.wmsClickHandler = (event) => this.queryAndHighlightWMS(event);
        this.map.on("click", this.wmsClickHandler);

        alert("Click polygon tren ban do de chon");
    }

    /**
     * Disable WMS selection mode
     */
    disableWMSSelection() {
        this.isWMSSelectionMode = false;

        // Remove click handler
        if (this.wmsClickHandler) {
            this.map.off("click", this.wmsClickHandler);
        }

        // Re-enable cac WMS layer
        if (typeof wmsManager !== "undefined") {
            this.disabledWMSLayers.forEach((configId) => {
                const layer = wmsManager.wmsLayers.get(configId);
                if (layer) {
                    this.map.addLayer(layer);
                }
            });
        }

        this.disabledWMSLayers = [];
    }

    /**
     * Query WMS va highlight ket qua
     */
    async queryAndHighlightWMS(event) {
        if (!this.isWMSSelectionMode) return;

        try {
            if (typeof wmsManager !== "undefined") {
                wmsManager.handleMapClick(event);
                this.disableWMSSelection();
            }
        } catch (error) {
            console.error("Loi khi query WMS:", error);
        }
    }

    /**
     * Copy polygon tu WMS sang sketch layer
     */
    convertWMSToSketch(wmsFeature) {
        try {
            const geometry = wmsFeature.geometry;

            // Tao L.geoJSON layer
            const newLayer = L.geoJSON(geometry, {
                style: this.fillStyle,
            });

            newLayer.setStyle(this.fillStyle);
            newLayer.pm.enable();

            // Gan attributes
            newLayer._polygonId = this.generateUniquePolygonId();
            newLayer._isSaved = false;
            newLayer._createdAt = new Date().toISOString();
            newLayer._properties = wmsFeature.properties || {};

            // Clear old sketches
            this.sketchLayerGroup.clearLayers();

            // Add new layer
            this.sketchLayerGroup.addLayer(newLayer);

            this.trackChanges();
            alert("Da sao chep polygon tu WMS");
        } catch (error) {
            console.error("Loi khi sao chep polygon:", error);
            alert("Loi khi sao chep: " + error.message);
        }
    }

    /**
     * Generate unique polygon ID
     */
    generateUniquePolygonId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        this.polygonCounter++;
        return `polygon_${timestamp}_${random}_${this.polygonCounter}`;
    }

    /**
     * Bat/tat visibility cua sketch tool
     */
    toggle() {
        if (this.isVisible) {
            // An
            this.map.removeLayer(this.sketchLayerGroup);
            this.map.removeLayer(this.measurementLayerGroup);

            if (this.toolbar) this.toolbar.style.display = "none";

            if (this.map.pm) {
                try {
                    this.map.pm.disableDraw("Polygon");
                    this.map.pm.disableDraw("Line");
                } catch (e) {
                    // Ignore
                }
            }

            // Disable edit mode on all layers
            this.sketchLayerGroup.eachLayer((layer) => {
                if (layer.pm) {
                    layer.pm.disable();
                }
            });

            // Clean up remove mode handler
            this.removeRemoveModeHandler();

            // Reset draw mode
            this.currentDrawMode = null;
            this.updateDrawModeButtonStates(null);

            // Re-enable WFS click handler
            this.restoreWFSClickHandler();

            this.isVisible = false;
        } else {
            // Hien
            this.map.addLayer(this.sketchLayerGroup);
            this.map.addLayer(this.measurementLayerGroup);

            if (this.toolbar) this.toolbar.style.display = "block";

            if (this.map.pm) {
                try {
                    // Cho phep edit mode cho cac layer ton tai
                    this.sketchLayerGroup.eachLayer(layer => {
                        if (layer.pm) {
                            layer.pm.enable();
                        }
                    });
                } catch (e) {
                    // Ignore
                }
            }

            // Disable WFS click handler
            this.disableWFSClickHandler();

            // Set default mode to pointer (selection mode)
            this.setDrawMode(null);

            this.isVisible = true;
        }

        return this.isVisible;
    }

    /**
     * Disable WFS click event listener
     */
    disableWFSClickHandler() {
        if (this.wfsClickHandler) {
            this.map.off("click", this.wfsClickHandler);
        }
    }

    /**
     * Restore WFS click event listener
     */
    restoreWFSClickHandler() {
        // Check if wmsManager exists and if default handler should be used
        if (typeof wmsManager !== "undefined" && this.wfsClickHandler) {
            this.map.on("click", this.wfsClickHandler);
        }
    }

    /**
     * Set WFS click handler (called from index.js)
     */
    setWFSClickHandler(handler) {
        this.wfsClickHandler = handler;
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clean up remove mode handler
        this.removeRemoveModeHandler();

        // Clean up WFS click handler
        this.disableWFSClickHandler();

        if (this.toolbar) {
            this.toolbar.remove();
        }
        this.map.removeLayer(this.sketchLayerGroup);
    }
}
