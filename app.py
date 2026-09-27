from flask import Flask, jsonify, send_from_directory
from dotenv import load_dotenv
from google.transit import gtfs_realtime_pb2

import requests
import os
import time

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

ENV_FILE = os.path.join(
    BASE_DIR,
    ".env"
)

load_dotenv(ENV_FILE)

TRANSPORT_VIC_KEY = os.getenv(
    "TRANSPORT_VIC_KEY"
)

app = Flask(
    __name__,
    static_folder=BASE_DIR
)

METRO_BASE = (
    "https://api.opendata.transport.vic.gov.au"
    "/opendata/public-transport"
    "/gtfs/realtime/v1/metro"
)

VLINE_BASE = (
    "https://api.opendata.transport.vic.gov.au"
    "/opendata/public-transport"
    "/gtfs/realtime/v1/vline"
)

CACHE_SECONDS = 30

REQUEST_TIMEOUT = 20

USER_AGENT = (
    "RailBoard/1.0 "
    "(Victorian live train information)"
)

cache = {
    "metro_positions": {
        "time": 0,
        "data": []
    },

    "vline_positions": {
        "time": 0,
        "data": []
    },

    "metro_trips": {
        "time": 0,
        "data": []
    },

    "vline_trips": {
        "time": 0,
        "data": []
    }
}

def check_api_key():
    if not TRANSPORT_VIC_KEY:
        raise RuntimeError(
            "TRANSPORT_VIC_KEY is missing. "
            "Make sure your .env file exists beside app.py."
        )

def download_feed(
    url,
    feed_name
):

    check_api_key()

    print()
    print(f"Requesting {feed_name}...")


    try:
        response = requests.get(
            url,
            headers={
                "KeyId":
                    TRANSPORT_VIC_KEY,

                "Accept":
                    "application/x-protobuf",

                "User-Agent":
                    USER_AGENT
            },

            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:

        raise RuntimeError(
            f"{feed_name} request failed: "
            f"{error}"
        )

    if not response.ok:
        content_type = (
            response.headers.get(
                "Content-Type",
                "unknown"
            )
        )

        body = response.text[:1000]

        raise RuntimeError(
            f"{feed_name} returned"
            f"HTTP {response.status_code}."
            f"Content-Type: {content_type}."
            f"Response: {body}"
        )

    if not response.content:
        raise RuntimeError(f"{feed_name} returned an empty response.")

    print(f"{feed_name}: HTTP {response.status_code}")

    print(f"{feed_name}: received {len(response.content)} bytes")

    feed = (
        gtfs_realtime_pb2.FeedMessage()
    )

    try:
        feed.ParseFromString(
            response.content
        )

    except Exception as error:
        raise RuntimeError(
            f"{feed_name} returned data that "
            f"could not be decoded as "
            f"GTFS-Realtime protobuf: "
            f"{error}"
        )

    print(
        f"{feed_name}: decoded "
        f"{len(feed.entity)} entities"
    )

    return feed

def get_vehicle_positions(transport_type):
    cache_key = (
        f"{transport_type}_positions"
    )

    if (time.time() - cache[cache_key]["time"] < CACHE_SECONDS):
        return cache[cache_key]["data"]

    if transport_type == "metro":
        url = (
            f"{METRO_BASE}"
            "/vehicle-positions"
        )

        train_type = "Metro Train"

        feed_name = (
            "Metro vehicle positions"
        )
    elif transport_type == "vline":
        url = (
            f"{VLINE_BASE}"
            "/vehicle-positions"
        )

        train_type = "V/Line Train"

        feed_name = (
            "V/Line vehicle positions"
        )
    else:
        raise ValueError(
            f"Unknown transport type: "
            f"{transport_type}"
        )

    feed = download_feed(
        url,
        feed_name
    )

    vehicles = []

    for entity in feed.entity:
        if not entity.HasField(
            "vehicle"
        ):
            continue

        vehicle = entity.vehicle

        if not vehicle.HasField(
            "position"
        ):
            continue

        position = vehicle.position

        train = {
            "id":
                entity.id,

            "type":
                train_type,

            "latitude":
                position.latitude,

            "longitude":
                position.longitude,

            "bearing":
                (
                    position.bearing
                    if position.HasField(
                        "bearing"
                    )
                    else None
                ),

            "route_id":
                None,

            "trip_id":
                None,

            "stop_id":
                (
                    vehicle.stop_id
                    if vehicle.HasField(
                        "stop_id"
                    )
                    else None
                ),

            "timestamp":
                (
                    vehicle.timestamp
                    if vehicle.HasField(
                        "timestamp"
                    )
                    else None
                )
        }

        if vehicle.HasField(
            "trip"
        ):

            trip = vehicle.trip

            if trip.HasField(
                "route_id"
            ):

                train["route_id"] = (
                    trip.route_id
                )

            if trip.HasField(
                "trip_id"
            ):

                train["trip_id"] = (
                    trip.trip_id
                )

        vehicles.append(
            train
        )

    cache[cache_key] = {

        "time":
            time.time(),

        "data":
            vehicles
    }

    print(
        f"{feed_name}: "
        f"{len(vehicles)} vehicles"
    )

    return vehicles

def get_trip_updates(
    transport_type
):
    cache_key = (
        f"{transport_type}_trips"
    )

    if (
        time.time()
        - cache[cache_key]["time"]
        < CACHE_SECONDS
    ):

        return cache[cache_key]["data"]

    if transport_type == "metro":
        url = (
            f"{METRO_BASE}"
            "/trip-updates"
        )

        train_type = "Metro Train"

        feed_name = (
            "Metro trip updates"
        )

    elif transport_type == "vline":
        url = (
            f"{VLINE_BASE}"
            "/trip-updates"
        )

        train_type = "V/Line Train"

        feed_name = (
            "V/Line trip updates"
        )

    else:
        raise ValueError(
            f"Unknown transport type: "
            f"{transport_type}"
        )

    feed = download_feed(
        url,
        feed_name
    )

    trips = []

    for entity in feed.entity:
        if not entity.HasField(
            "trip_update"
        ):
            continue

        update = entity.trip_update

        trip = update.trip

        trip_data = {
            "entity_id":
                entity.id,
            "type":
                train_type,
            "trip_id":
                (
                    trip.trip_id
                    if trip.HasField(
                        "trip_id"
                    )
                    else None
                ),
            "route_id":
                (
                    trip.route_id
                    if trip.HasField(
                        "route_id"
                    )
                    else None
                ),
            "start_time":
                (
                    trip.start_time
                    if trip.HasField(
                        "start_time"
                    )
                    else None
                ),
            "start_date":
                (
                    trip.start_date
                    if trip.HasField(
                        "start_date"
                    )
                    else None
                ),
            "stops": []
        }

        for stop in (
            update.stop_time_update
        ):
            stop_data = {
                "stop_id":
                    (
                        stop.stop_id
                        if stop.HasField(
                            "stop_id"
                        )
                        else None
                    ),
                "stop_sequence":
                    (
                        stop.stop_sequence
                        if stop.HasField(
                            "stop_sequence"
                        )
                        else None
                    ),
                "arrival":
                    None,
                "departure":
                    None,
                "arrival_delay":
                    None,
                "departure_delay":
                    None
            }

            if stop.HasField(
                "arrival"
            ):

                if stop.arrival.HasField(
                    "time"
                ):
                    stop_data[
                        "arrival"
                    ] = (stop.arrival.time)


                if stop.arrival.HasField(
                    "delay"
                ):
                    stop_data[
                        "arrival_delay"
                    ] = (stop.arrival.delay)

            if stop.HasField(
                "departure"
            ):
                if stop.departure.HasField(
                    "time"
                ):
                    stop_data[
                        "departure"
                    ] = (stop.departure.time)

                if stop.departure.HasField(
                    "delay"
                ):
                    stop_data[
                        "departure_delay"
                    ] = (
                        stop.departure.delay
                    )
            trip_data[
                "stops"
            ].append(
                stop_data
            )

        trips.append(
            trip_data
        )

    cache[cache_key] = {
        "time":
            time.time(),
        "data":
            trips
    }

    print(f"{feed_name}: {len(trips)} trips")

    return trips

@app.get("/api/transport")

def transport():
    print()
    print("Updating Victorian transport data...")

    try:
        metro_vehicles = (get_vehicle_positions("metro"))

        vline_vehicles = (get_vehicle_positions("vline"))

        metro_trips = (get_trip_updates("metro"))

        vline_trips = (get_trip_updates("vline"))

        vehicles = (metro_vehicles + vline_vehicles)

        trips = (metro_trips + vline_trips)

        print()
        print(f"Received {len(vehicles)} vehicles and {len(trips)} trips.")
        print()

        return jsonify({
            "success":
                True,
            "updated":
                int(time.time()),
            "vehicles":
                vehicles,
            "trips":
                trips
        })


    except Exception as error:
        print()
        print("TRANSPORT ERROR")
        print(error)
        print()

        return jsonify({
            "success":
                False,
            "error":
                str(error)
        }), 500

@app.get(
    "/api/health"
)
def health():
    return jsonify({
        "success":
            True,
        "api_key_loaded":
            bool(TRANSPORT_VIC_KEY),
        "server":
            "RailBoard",
        "port":
            5050
    })

@app.get("/")
def index():
    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.get("/style.css")
def stylesheet():
    return send_from_directory(
        BASE_DIR,
        "style.css"
    )


@app.get("/app.js")
def javascript():
    return send_from_directory(
        BASE_DIR,
        "app.js"
    )

if __name__ == "__main__":
    print()
    print(
        "======================================"
    )
    print(
        "              RAILBOARD"
    )
    print(
        "======================================"
    )
    print()

    if TRANSPORT_VIC_KEY:
        print("API key: LOADED")
        print(f"API key length: {len(TRANSPORT_VIC_KEY)}")
    else:
        print("API key: MISSING")
        print("Check your .env file.")

    print()
    print("RailBoard is running on http://127.0.0.1:5050")
    print()
    print("Transport API: http://127.0.0.1:5050/api/transport")
    print()
    print("Health Check: http://127.0.0.1:5050/api/health")
    print()

    app.run(debug=True)