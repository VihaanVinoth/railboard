let currentFilter = "ALL";
let latestTripsData = [];
let latestVehiclesData = []; 

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
  center: [144.9631, -37.8136],
  zoom: 8
});

const trainMarkers = new Map();

const networkPopup = new maplibregl.Popup({ offset: 25 }).setHTML(
  "<b style='color: #ffffff;'>Victorian Rail Network Hub</b>"
);

const networkMarkerElement = document.createElement("div");
networkMarkerElement.style.width = "12px";
networkMarkerElement.style.height = "12px";
networkMarkerElement.style.backgroundColor = "#222";
networkMarkerElement.style.borderRadius = "50%";
networkMarkerElement.style.border = "2px solid #0b0f19";

const networkMarker = new maplibregl.Marker({ element: networkMarkerElement })
  .setLngLat([144.9631, -37.8136])
  .setPopup(networkPopup)
  .addTo(map);

function closeAllPopups() {
  if (networkPopup.isOpen()) {
    networkPopup.remove();
  }
  trainMarkers.forEach((entry) => {
    if (entry.popup.isOpen()) {
      entry.popup.remove();
    }
  });
}

function formatDelay(seconds) {
  if (seconds === null || seconds === undefined) {
    return "ON TIME";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes <= 0) {
    return "ON TIME";
  }

  return `+${minutes} MIN`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRouteInfo(routeId) {
  if (!routeId) return { name: "Train service", code: "UNK" };

  let code = routeId
    .replace(/^aus:vic:vic-(01|02)-/, "")
    .replace(/[:\s]/g, "")
    .toUpperCase();

  const routeMap = {
    // Metro Stations
    AKL: "Oakleigh",
    ALM: "Alamein",
    BEG: "Belgrave",
    BOX: "Box Hill",
    BRO: "Broadmeadows",
    BRU: "Brunswick",
    BUW: "Burwood",
    CAM: "Camberwell",
    CAR: "Carrum",
    CAU: "Caulfield",
    CBE: "Coolaroo",
    CFD: "Caulfield",
    CGB: "Craigieburn",
    CGI: "Carnegie",
    CHA: "Chatham",
    CHE: "Clayton",
    CHL: "Chelsea",
    CHM: "Cheltenham",
    CLA: "Clayton",
    CLI: "Clifton Hill",
    COB: "Coburg",
    COL: "Collingwood",
    CRA: "Cranbourne",
    CRO: "Croydon",
    CRT: "Crib Point",
    DAN: "Dandenong",
    DEN: "Dennis",
    DMD: "Diamond Creek",
    DWD: "Darling",
    EAG: "Eaglemont",
    EDI: "Edithvale",
    ELS: "Elsternwick",
    ELT: "Eltham",
    EPP: "Epping",
    ERG: "East Richmond",
    FAW: "Fawkner",
    FCE: "Flemington Bridge",
    FFI: "Fairfield",
    FKN: "Frankston",
    FSN: "Frankston",
    FSS: "Flinders Street",
    FST: "Flagstaff",
    FTG: "Ferntree Gully",
    FUT: "Footscray",
    GDI: "Gardiner",
    GGL: "Glenferrie",
    GIE: "Carnegie",
    GIN: "Ginifer",
    GIR: "Glen Iris",
    GNB: "Greensborough",
    GOW: "Gowrie",
    GPL: "Glenroy",
    GRE: "Glenhuntly",
    GVE: "Gardenvale",
    GWV: "Glen Waverley",
    GWY: "Glen Waverley",
    HAL: "Hallam",
    HBE: "Heidelberg",
    HEA: "Heatherdale",
    HEI: "Heidelberg",
    HHL: "Hawkstowe",
    HIG: "Highett",
    HKS: "Hawksburn",
    HMP: "Hampton",
    HOS: "Hoppers Crossing",
    HPT: "Heyington",
    HUG: "Hughesdale",
    HUL: "Huntingdale",
    HUR: "Hurstbridge",
    HWD: "Heathmont",
    IVN: "Ivanhoe",
    JAC: "Jacana",
    JEW: "Jewell",
    JLI: "Jolimont",
    JOR: "Jordanville",
    K00: "Kooyong",
    KEA: "Keilor Plains",
    KEO: "Keon Park",
    KLS: "Kananook",
    LAB: "Laburnum",
    LAL: "Lalor",
    LAV: "Laverton",
    LIL: "Lilydale",
    LYN: "Lynbrook",
    MAB: "Macaulay",
    MAC: "Macleod",
    MAL: "Malvern",
    MBI: "Middle Brighton",
    MBK: "Mooroolbark",
    MCE: "Melbourne Central",
    MCH: "Mitcham",
    MDD: "Macleod",
    MEN: "Mentone",
    MEP: "Merinda Park",
    MER: "Merri",
    MFI: "Middle Footscray",
    MGO: "Middle Gorge",
    MLD: "Moreland",
    MMC: "Montmorency",
    MNT: "Mont Albert",
    MOO: "Moorabbin",
    MRN: "Mernda",
    MUR: "Murrumbeena",
    MVE: "Mount Waverley",
    MYS: "Merlynston",
    NAR: "Narre Warren",
    NCO: "Northcote",
    NME: "North Melbourne",
    NPT: "Newport",
    NRE: "Noble Park",
    NRI: "North Richmond",
    NUN: "Nunawading",
    OFF: "Officer",
    ORM: "Ormond",
    PAR: "Parkdale",
    PKE: "Pakenham East",
    PKM: "Pakenham",
    PRE: "Preston",
    PTN: "Patterson",
    RES: "Reservoir",
    RIP: "Ripponlea",
    RIV: "Riversdale",
    RLN: "Rosanna",
    RMD: "Richmond",
    RNG: "Ringwood",
    RPO: "Royal Park",
    RPT: "Roxburgh Park",
    RSH: "Rushall",
    RVT: "Ruthven",
    RWE: "Ringwood East",
    SAB: "St Albans",
    SBY: "Sunbury",
    SCA: "South Yarra",
    SDR: "Sandringham",
    SEA: "Seaford",
    SHL: "Surrey Hills",
    SHM: "Sandringham",
    SMC: "South Morang",
    SNP: "Sandown Park",
    SPE: "Southern Cross",
    SPG: "Springvale",
    SPR: "Springvale",
    SPV: "Springvale",
    SRR: "South Yarra",
    SSS: "Southern Cross",
    STS: "St Albans",
    STY: "Stony Point",
    SUI: "Southland",
    SUY: "Sunbury",
    SVA: "Syndal",
    SYR: "South Yarra",
    THN: "Thomastown",
    THO: "Thornbury",
    TOO: "Toorak",
    TOT: "Tottenham",
    UFD: "Upfield",
    UTG: "Upper Ferntree Gully",
    VIC: "Victoria Park",
    WAT: "Watsonia",
    WER: "Werribee",
    WFI: "West Footscray",
    WGL: "Westall",
    WIK: "Willison",
    WIL: "Williamstown",
    WLB: "Williamstown Beach",
    WLN: "Williams Landing",
    WRE: "West Richmond",
    WSR: "Windsor",
    WST: "Westgarth",
    WTM: "Williamstown",
    YAM: "Yarraman",
    YAR: "Yarraville",

    // V/Line Stations
    ABY: "Albury",
    ADR: "Ardeer",
    ALB: "Albury",
    ARA: "Ararat",
    ART: "Ararat",
    AVL: "Avenel",
    BAM: "Bacchus Marsh",
    BAT: "Ballarat",
    BDE: "Bairnsdale",
    BDG: "Bendigo",
    BEN: "Benalla",
    BET: "Beaufort",
    BEX: "Benalla",
    BFT: "Beaufort",
    BGO: "Bendigo",
    BLN: "Ballan",
    BLR: "Ballarat",
    BMH: "Bacchus Marsh",
    BNS: "Bairnsdale",
    BRD: "Broadford",
    BRF: "Broadford",
    CBB: "Cobblebank",
    CLN: "Clunes",
    CME: "Castlemaine",
    COL: "Colac",
    CPD: "Camperdown",
    CPO: "Camperdown",
    CRE: "Creswick",
    CSP: "Caroline Springs",
    CST: "Castlemaine",
    DBK: "Donnybrook",
    DIM: "Dimboola",
    DKK: "Dimboola",
    DNP: "Deer Park",
    DRN: "Drouin",
    ECH: "Echuca",
    EPK: "East Pakenham",
    ERO: "Euroa",
    EUR: "Euroa",
    GEL: "Geelong",
    GFD: "Garfield",
    GGD: "Gisborne",
    GGW: "Goornong",
    GLG: "Geelong",
    HVP: "Huntly",
    KFT: "Kangaroo Flat",
    KIL: "Kilmore East",
    KME: "Kilmore East",
    KYN: "Kyneton",
    LRA: "Lara",
    LRI: "Little River",
    LVE: "Longwarry",
    MAM: "Malmsbury",
    MBO: "Maryborough",
    MBY: "Maryborough",
    MCD: "Macedon",
    MEL: "Melton",
    MNE: "Murchison East",
    MOE: "Moe",
    MRA: "Mooroopna",
    MRW: "Morwell",
    Mwl: "Morwell",
    NAG: "Nagambie",
    NGE: "North Geelong",
    NNG: "Nar Nar Goon",
    PKE: "East Pakenham",
    RAY: "Raywood",
    RBK: "Rockbank",
    RCH: "Rochester",
    RDK: "Riddells Creek",
    RSD: "Rosedale",
    SAL: "Sale",
    SER: "Seymour",
    SEY: "Seymour",
    SGT: "Springhurst",
    SHT: "North Shore",
    SHT: "Shepparton",
    SLE: "Sale",
    STA: "Stawell",
    STF: "Stratford",
    SUN: "Sunbury",
    SWH: "Swan Hill",
    SWL: "Swan Hill",
    SWT: "Stawell",
    TFG: "Trafalgar",
    TLK: "Tallarook",
    TNE: "Tarneit",
    TRG: "Traralgon",
    TRN: "Traralgon",
    TYG: "Tynong",
    VLT: "Violet Town",
    WBL: "Warrnambool",
    WBO: "Warrnambool",
    WDE: "Woodend",
    WDG: "Wandong",
    WEE: "Woodend",
    WGA: "Wangaratta",
    WGG: "Warragul",
    WGL: "Warragul",
    WGT: "Wangaratta",
    WLN: "Wallan",
    WLV: "Wallan",
    WND: "Wandong",
    WNE: "Winchelsea",
    WOD: "Wodonga",
    WOU: "Wendouree",
    WPD: "Waurn Ponds",
    WVE: "Wyndham Vale",
    YON: "Yarragon"
  };

  return {
    name: routeMap[code] || code,
    code: code,
  };
}

function createTrainElement(train) {
  const isVLine = train.type === "V/Line Train";
  const colour = isVLine ? "#facc15" : "#38bdf8";

  const el = document.createElement("div");
  el.className = "train-marker";
  el.style.background = colour;
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "50%";
  el.style.border = "1px solid #0b0f19";
  el.style.cursor = "pointer";
  return el;
}

function updateTrainMarkers(vehicles) {
  if (!vehicles) return;
  latestVehiclesData = vehicles;

  if (vehicles.length === 0) return;

  const activeIds = new Set();

  vehicles.forEach((train) => {
    if (typeof train.latitude !== "number" || typeof train.longitude !== "number") {
      return;
    }

    activeIds.add(train.id);

    const routeInfo = formatRouteInfo(train.route_id);
    const isVLine = train.type === "V/Line Train";
    const badgeColor = isVLine ? "#facc15" : "#38bdf8";

    const popupHtml = `
            <div class="train-popup" style="border-left: 3px solid ${badgeColor}; padding-left: 6px;">
                <strong style="color: ${badgeColor};">${train.type}</strong>
                <br>
                Route: <strong>${routeInfo.name} [${routeInfo.code}]</strong>
                <br>
                Trip: ${train.trip_id || "Unknown"}
                <br>
                Bearing: ${train.bearing !== null ? `${Math.round(train.bearing)}°` : "Unknown"}
                <br>
                Last update: ${formatTimestamp(train.timestamp)}
            </div>
        `;

    if (trainMarkers.has(train.id)) {
      const { marker, popup } = trainMarkers.get(train.id);
      marker.setLngLat([train.longitude, train.latitude]);
      popup.setHTML(popupHtml);
    } else {
      const el = createTrainElement(train);
      const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupHtml);

      el.addEventListener("click", () => {
        closeAllPopups();
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([train.longitude, train.latitude])
        .setPopup(popup)
        .addTo(map);

      trainMarkers.set(train.id, { marker, popup });
    }
  });

  for (const [id, item] of trainMarkers) {
    if (!activeIds.has(id)) {
      item.marker.remove();
      trainMarkers.delete(id);
    }
  }
}

function getDepartureTime(stop) {
  if (!stop) return null;
  if (stop.departure) return new Date(stop.departure * 1000);
  if (stop.arrival) return new Date(stop.arrival * 1000);
  return null;
}

function updateStationBoard(trips) {
  if (trips) {
    latestTripsData = trips;
  }

  const tbody = document.getElementById("board-body");
  const now = Date.now();
  const services = [];

  latestTripsData.forEach((trip) => {
    if (!trip.stops || trip.stops.length === 0) return;

    const stop = trip.stops[0];
    const departure = getDepartureTime(stop);

    if (!departure) return;
    if (departure.getTime() < now - 120000) return;

    const isVLine = trip.type === "V/Line Train";
    if (currentFilter === "METRO" && isVLine) return;
    if (currentFilter === "VLINE" && !isVLine) return;

    services.push({ trip, stop, departure });
  });

  services.sort((a, b) => a.departure.getTime() - b.departure.getTime());
  tbody.innerHTML = "";

  if (services.length === 0) {
    tbody.innerHTML = `
        <tr>
            <td colspan="3">
                No active services found for this filter.
            </td>
        </tr>
    `;
    return;
  }

  services.forEach((service) => {
    const trip = service.trip;
    const stop = service.stop;
    const departure = service.departure;

    const time = departure.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const delay = formatDelay(stop.departure_delay ?? stop.arrival_delay);
    const delayed = delay !== "ON TIME";

    const routeInfo = formatRouteInfo(trip.route_id);
    const isVLine = trip.type === "V/Line Train";
    const badgeColor = isVLine ? "#facc15" : "#38bdf8";
    const typeLabel = trip.type || "Train";

    const row = document.createElement("tr");
    row.dataset.tripId = trip.trip_id || "";

    row.innerHTML = `
        <td>
            <strong>${time}</strong>
        </td>
        <td>
            ${routeInfo.name} [${routeInfo.code}]
            <span style="color: ${badgeColor}; margin-left: 8px;">
                [${typeLabel}]
            </span>
        </td>
        <td class="${delayed ? "status-delayed" : "status-ontime"}">
            ${delay}
        </td>
    `;

    tbody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.getAttribute("data-filter");
      updateStationBoard();
    });
  });

  const tbody = document.getElementById("board-body");
  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.tripId) return;

    const tripId = row.dataset.tripId;
    const matchingVehicle = latestVehiclesData.find((v) => v.trip_id === tripId);

    if (
      matchingVehicle &&
      typeof matchingVehicle.latitude === "number" &&
      typeof matchingVehicle.longitude === "number"
    ) {
      closeAllPopups();

      map.flyTo({
        center: [matchingVehicle.longitude, matchingVehicle.latitude],
        zoom: 15,
        duration: 1500
      });

      const trainEntry = trainMarkers.get(matchingVehicle.id);
      if (trainEntry) {
        setTimeout(() => {
          trainEntry.popup.addTo(map);
          trainEntry.popup.setLngLat([matchingVehicle.longitude, matchingVehicle.latitude]);
        }, 300);
      }
    }
  });
});

async function updateLiveTransportDisplay() {
  try {
    const response = await fetch("/api/transport", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Transport API error");
    }

    updateTrainMarkers(data.vehicles);
    updateStationBoard(data.trips);

    const title = document.getElementById("title");
    if (title) {
      title.textContent = `Station Board // ${data.vehicles.length} trains live`;
    }

    networkPopup.setHTML(`
        <b style="color: #ffffff;">Victorian Rail Network Hub</b>
        <br><span style="color: #94a3b8;">${data.vehicles.length} live trains tracked</span>
    `);
  } catch (error) {
    console.error("Transport update failed:", error);

    document.getElementById("board-body").innerHTML = `
        <tr>
            <td colspan="3">
                Unable to connect to live Victorian transport data.
                <br>
                <small>${error.message}</small>
            </td>
        </tr>
    `;
  }
}

updateLiveTransportDisplay();
setInterval(updateLiveTransportDisplay, 30000);

window.addEventListener("load", () => {
  setTimeout(() => {
    map.resize();
  }, 200);
});