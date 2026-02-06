const loadScope = async (params = {}, api) => {
    return await http.get(api, params);
};

const fillScope = (selectId, data, key, value, emptyText, selected) => {
    fillSelectId(selectId, data, key, value, emptyText, true, selected);
};

const loadFallback = async (path, filterFn = null) => {
    const res = await http.get(path);
    return {
        data: filterFn ? res.data.filter(filterFn) : res.data,
    };
};

const loadProvinces = async (
    selectId,
    params = {},
    selected = null,
    api,
    emptyText = "[Chọn tỉnh/thành phố]",
) => {
    let res;

    if (!api) {
        res = await loadFallback("assets/data/provinces.json");
    } else {
        try {
            res = await loadScope(params, api);
        } catch (error) {
            console.warn("API lỗi, dùng fallback provinces:", error);
            res = await loadFallback("assets/data/provinces.json");
        }
    }

    fillScope(selectId, res.data, "code", "name", emptyText, selected);
};

const loadCommunes = async (
    selectId,
    params = {},
    selected = null,
    api,
    emptyText = "[Chọn xã/phường]",
) => {
    let res;

    if (!params?.province_code) {
        res = { data: [] };
    } else if (!api) {
        res = await loadFallback(
            "assets/data/communes.json",
            (c) => c.province_code === params.province_code,
        );
    } else {
        try {
            res = await loadScope(params, api);
        } catch (error) {
            console.warn("API lỗi, dùng fallback communes:", error);
            res = await loadFallback(
                "assets/data/communes.json",
                (c) => c.province_code === params.province_code,
            );
        }
    }

    fillScope(selectId, res.data, "code", "name", emptyText, selected);
};
