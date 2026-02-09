const VN2000_ZONES = [
    {
        zone_name: "VN-2000 / TM-3 103-00",
        epsg_code: 9205,
        provinces: "Lai Châu, Điện Biên.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=103 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 104-00",
        epsg_code: 9206,
        provinces: "Sơn La.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=104 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 104-30",
        epsg_code: 9207,
        provinces: "Kiên Giang, Cà Mau.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=104.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 104-45",
        epsg_code: 9208,
        provinces: "Lào Cai, Yên Bái, Nghệ An, Phú Thọ, An Giang.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=104.75 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 105-00",
        epsg_code: 5897,
        provinces:
            "Thanh Hoá, Vĩnh Phúc, Đồng Tháp, Cần Thơ, Hậu Giang, Bạc Liêu, Hà Nội, Ninh Bình, Hà Nam.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=105 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 105-30",
        epsg_code: 9209,
        provinces:
            "Hà Giang, Hải Dương, Hà Tĩnh, Bắc Ninh, Hưng Yên, Thái Bình, Nam Định, Tây Ninh, Vĩnh Long, Sóc Trăng, Trà Vinh.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=105.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 105-45",
        epsg_code: 9210,
        provinces:
            "Cao Bằng, Long An, Tiền Giang, Bến Tre, Hải Phòng, TP.HCM, Bình Dương.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=105.75 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 106-00",
        epsg_code: 9211,
        provinces: "Tuyên Quang, Hoà Bình, Quảng Bình.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=106 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 106-15",
        epsg_code: 9212,
        provinces: "Quảng Trị, Bình Phước.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=106.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 106-30",
        epsg_code: 9213,
        provinces: "Bắc Kạn, Thái Nguyên.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=106.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 107-00",
        epsg_code: 9214,
        provinces: "Bắc Giang, Thừa Thiên Huế.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=107 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 107-15",
        epsg_code: 9215,
        provinces: "Lạng Sơn.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=107.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 107-30",
        epsg_code: 9216,
        provinces: "Kon Tum.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=107.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 107-45",
        epsg_code: 5899,
        provinces:
            "Quảng Ninh, Đồng Nai, Bà Rịa Vũng Tàu, Quảng Nam, Lâm Đồng, Đà Nẵng.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=107.75 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 zone 491",
        epsg_code: 5898,
        provinces: "Quảng Ngãi.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=108 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 108-15",
        epsg_code: 9217,
        provinces: "Ninh Thuận, Khánh Hoà, Bình Định.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=108.25 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
    {
        zone_name: "VN-2000 / TM-3 108-30",
        epsg_code: 9218,
        provinces: "Đắk Lắk, Đắk Nông, Phú Yên, Gia Lai, Bình Thuận.",
        proj4_defs:
            "+proj=tmerc +lat_0=0 +lon_0=108.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278 +units=m +no_defs",
    },
];
VN2000_ZONES.forEach(zone => {
    proj4.defs(`EPSG:${zone.epsg_code}`, zone.proj4_defs);
});
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
