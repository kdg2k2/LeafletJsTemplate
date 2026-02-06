const loadProvinceList = async (selectedProvinceCode = null) => {
    await loadProvinces("province_code", {}, selectedProvinceCode);
};

const loadCommuneListByProvince = async (
    provinceCode,
    selectedCommuneCode = null,
) => {
    await loadCommunes(
        "commune_code",
        {
            province_code: provinceCode,
        },
        selectedCommuneCode,
    );
};

const setupProvinceCommuneEvents = async () => {
    const provinceSelect = document.getElementById("province_code");
    const communeSelect = document.getElementById("commune_code");

    if (!provinceSelect || !communeSelect) return;

    // Load danh sách tỉnh ban đầu
    await loadProvinceList();

    // Lắng nghe sự kiện thay đổi province
    provinceSelect.addEventListener("change", async (e) => {
        await loadCommuneListByProvince(e.target.value);
    });
};

const setupProvinceCommuneForEdit = async (provinceCode, communeCode) => {
    // Load lại provinces với giá trị đã chọn
    await loadProvinceList(provinceCode);

    // Nếu có province_code, load communes và select commune
    if (provinceCode) {
        await loadCommuneListByProvince(provinceCode, communeCode);
    }
};
