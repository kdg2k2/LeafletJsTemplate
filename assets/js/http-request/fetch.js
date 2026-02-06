let controller = null;
let activeFetchCount = 0;
const unloadHandler = () => {
    if (controller) {
        controller.abort();
    }
};
window.addEventListener("unload", unloadHandler);

const makeHttpRequest = (
    method = "get",
    url,
    params = {},
    csrfToken = null,
) => {
    return new Promise((resolve, reject) => {
        method = method.toLowerCase();
        if (!["get", "post"].includes(method)) {
            return reject(new Error("Method chỉ hỗ trợ GET hoặc POST"));
        }

        controller = new AbortController();
        const { signal } = controller;

        const fetchOptions = {
            method: method.toUpperCase(),
            redirect: "manual",
            credentials: "include", // include cookies in request
            signal,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
        };

        let fetchUrl = url;

        if (method === "post") {
            // handle file upload vs JSON
            if (params instanceof FormData) {
                params.append("_token", csrfToken);
                fetchOptions.headers["X-CSRF-Token"] = csrfToken;
                fetchOptions.body = params;
            } else {
                const body = { ...params, _token: csrfToken };
                fetchOptions.headers["Content-Type"] = "application/json";
                fetchOptions.body = JSON.stringify(body);
            }
        } else if (Object.keys(params).length) {
            const qp = new URLSearchParams(params).toString();
            fetchUrl = `${url}?${qp}`;
        }

        activeFetchCount++;

        fetch(fetchUrl, fetchOptions)
            .then(async (response) => {
                const contentType = response.headers.get("content-type") || "";
                const isJson = contentType.includes("application/json");
                const data = isJson
                    ? await response.json()
                    : await response.text();

                if (!response.ok) {
                    if (data.errors) {
                        Object.values(data.errors).forEach((errMsg) => {
                            console.error(errMsg);
                        });
                    } else {
                        console.error(data.message || data);
                    }

                    throw {
                        response: {
                            status: response.status,
                            data: data,
                        },
                        message: data.message || data,
                    };
                }

                return data;
            })
            .then((data) => {
                if (data.message) console.log(data.message);
                resolve(data);
            })
            .catch((err) => {
                if (err.name === "AbortError") {
                    console.warn("Request aborted");
                    return;
                }
                reject(err);
            })
            .finally(() => {
                activeFetchCount--; // fetch xong
                if (activeFetchCount === 0) {
                }
            });
    });
};

const apiRequest = async (method, url, params = {}, csrfToken = "") => {
    return await makeHttpRequest(method, url, params, csrfToken);
};
class HttpIntant {
    async get(url, data, csrfToken) {
        return apiRequest("GET", url, data, csrfToken);
    }
    async post(url, data, csrfToken) {
        return apiRequest("POST", url, data, csrfToken);
    }
    async put(url, data, csrfToken) {
        if (data instanceof FormData) {
            data.append("_method", "PUT");
        } else {
            data = { ...data, _method: "PUT" };
        }
        return apiRequest("POST", url, data, csrfToken);
    }
    async delete(url, data, csrfToken) {
        if (data instanceof FormData) {
            data.append("_method", "DELETE");
        } else {
            data = { ...data, _method: "DELETE" };
        }
        return apiRequest("POST", url, data, csrfToken);
    }
    async patch(url, data, csrfToken) {
        if (data instanceof FormData) {
            data.append("_method", "PATCH");
        } else {
            data = { ...data, _method: "PATCH" };
        }
        return apiRequest("POST", url, data, csrfToken);
    }
}
const http = new HttpIntant();
