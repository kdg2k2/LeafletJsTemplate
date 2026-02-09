const loadScope = async (params = {}, api) => {
    return await http.getExternal(api, params);
};

const fillScope = (selectId, data, key, value, emptyText, selected) => {
    fillSelectId(selectId, data, key, value, emptyText, true, selected);
};

const loadProvinces = async (
    selectId,
    params = {},
    selected = null,
    api = "https://provinces.open-api.vn/api/v2/p/",
    emptyText = "[Chọn tỉnh/thành phố]",
) => {
    let res;

    try {
        res = await loadScope(params, api);
    } catch (error) {
        console.warn("API lỗi, dùng fallback provinces:", error);
    }

    fillScope(
        selectId,
        res?.data || res || [],
        "code",
        "name",
        emptyText,
        selected,
    );
};

const loadCommunes = async (
    selectId,
    params = {},
    selected = null,
    api = "https://provinces.open-api.vn/api/v2/w/",
    emptyText = "[Chọn xã/phường]",
) => {
    let res;

    if (!params?.province_code) {
        res = { data: [] };
    } else {
        try {
            res = await loadScope(params, api);
        } catch (error) {
            console.warn("API lỗi, dùng fallback communes:", error);
        }
    }

    fillScope(
        selectId,
        res?.data || res || [],
        "code",
        "name",
        emptyText,
        selected,
    );
};
