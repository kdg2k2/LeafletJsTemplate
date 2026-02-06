const fillSelectId = (
    id,
    data,
    key = "",
    value = "",
    defaultOption = "[Chọn]",
    addDefaultOption = true,
    selectedValue = null,
    dataAttributes = null // Thêm parameter mới
) => {
    // Tìm element theo id hoặc name
    let select = document.getElementById(id);
    if (!select) {
        select = document.querySelector(`select[name="${id}"]`);
    }
    if (!select) {
        select = document.querySelector(`select[name="${id}[]"]`);
    }

    if (!select) {
        console.warn(`Không tìm thấy select với id="${id}" hoặc name="${id}"`);
        return false;
    }

    fillSelectElement(
        select,
        data,
        key,
        value,
        defaultOption,
        addDefaultOption,
        selectedValue,
        dataAttributes
    );
    return true;
};

const fillSelectElement = (
    select,
    data,
    key = "",
    value = "",
    defaultOption = "[Chọn]",
    addDefaultOption = true,
    selectedValue = null,
    dataAttributes = null // Thêm parameter mới
) => {
    if (!select) {
        throw new Error("Không tìm thấy select");
    }

    const getNestedValue = (obj, path) => {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
    };

    const isIterable = (obj) => {
        return obj != null && typeof obj[Symbol.iterator] === "function";
    };

    const isArrayLike = (obj) => {
        return obj != null && typeof obj.length === "number";
    };

    const toArray = (data) => {
        if (Array.isArray(data)) return data;
        if (isIterable(data) || isArrayLike(data)) return Array.from(data);
        return [];
    };

    // Xóa hết option hiện tại
    select.innerHTML = "";

    const arr = toArray(data);
    if (!value) throw new Error("Bắt buộc điền tên thuộc tính value");

    let options = "";
    if (addDefaultOption) {
        const isDefaultSelected =
            selectedValue === "" ||
            selectedValue === null ||
            selectedValue === undefined;
        options += `<option value=""${
            isDefaultSelected ? " selected" : ""
        }>${defaultOption}</option>`;
    }

    arr.forEach((item) => {
        const optValue = key
            ? getNestedValue(item, key)
            : getNestedValue(item, value);

        let optText;
        if (Array.isArray(value)) {
            optText = value
                .map((field) => {
                    const fieldValue = getNestedValue(item, field);
                    return fieldValue !== null && fieldValue !== undefined
                        ? fieldValue
                        : "";
                })
                .filter((val) => val !== "")
                .join(" - ");
        } else {
            optText = getNestedValue(item, value);
        }

        const isSelected =
            selectedValue !== null &&
            selectedValue !== undefined &&
            String(optValue) === String(selectedValue);

        // Xây dựng data attributes
        let dataAttrs = "";
        if (dataAttributes) {
            // Nếu dataAttributes là function, gọi với item
            const attrs =
                typeof dataAttributes === "function"
                    ? dataAttributes(item)
                    : dataAttributes;

            // Duyệt qua các thuộc tính
            for (const [attrName, attrValue] of Object.entries(attrs)) {
                const attrData =
                    typeof attrValue === "function"
                        ? attrValue(item)
                        : attrValue;

                // Nếu là object/array thì JSON.stringify, escape quotes
                const finalValue =
                    typeof attrData === "object"
                        ? JSON.stringify(attrData).replace(/"/g, "&quot;")
                        : String(attrData).replace(/"/g, "&quot;");

                if (attrName === "class") {
                    dataAttrs += ` class="${finalValue}"`;
                } else {
                    dataAttrs += ` data-${attrName}="${finalValue}"`;
                }
            }
        }

        options += `<option value="${optValue}"${
            isSelected ? " selected" : ""
        }${dataAttrs}>${optText}</option>`;
    });

    select.innerHTML = options;
};

// Hàm fill select với retry
const fillSelecIdtWithRetry = async (
    id,
    data,
    key = "",
    value = "",
    defaultOption = "[Chọn]",
    addDefaultOption = true,
    selectedValue = null,
    maxRetries = 10,
    delay = 200,
    dataAttributes = null // Thêm parameter
) => {
    for (let i = 0; i < maxRetries; i++) {
        const success = fillSelectId(
            id,
            data,
            key,
            value,
            defaultOption,
            addDefaultOption,
            selectedValue,
            true,
            dataAttributes // Truyền vào fillSelectId
        );
        if (success) {
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.error(`Không thể fill select "${id}" sau ${maxRetries} lần thử`);
    return false;
};
