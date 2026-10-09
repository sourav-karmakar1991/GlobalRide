from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Form
from pydantic import BaseModel, Field

app = FastAPI(title='Eziride API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

users: Dict[str, Dict[str, Any]] = {}
rides: Dict[int, Dict[str, Any]] = {}
ratings: List[Dict[str, Any]] = []
ride_counter = 1000

websocket_clients: Dict[int, List[WebSocket]] = {}


def generate_token(user_id: int, role: str) -> str:
    return f"demo-{role}-token-{user_id}"


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec='seconds') + 'Z'


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return users.get(email.lower())


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    for user in users.values():
        if int(user['id']) == int(user_id):
            return user
    return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return radius * c


def estimate_fare(ride_type: str, distance_km: float) -> int:
    pricing = {
        'Economy': 18,
        'Scooter': 16,
        'Premium Bike': 24,
        'Sports / Premium Bike': 24,
    }
    base = pricing.get(ride_type, 18)
    return max(120, int(base * distance_km + 30))


def estimate_duration(distance_km: float) -> str:
    minutes = max(10, int(distance_km * 3.4))
    return f'{minutes} min'


def serialize_ride(ride: Dict[str, Any]) -> Dict[str, Any]:
    data = dict(ride)
    data['pickup_lat'] = ride.get('pickup_lat')
    data['pickup_lng'] = ride.get('pickup_lng')
    data['drop_lat'] = ride.get('drop_lat')
    data['drop_lng'] = ride.get('drop_lng')
    return data


def broadcast_ride_update(ride_id: int, ride: Dict[str, Any]) -> None:
    payload = json.dumps({
        'type': 'status',
        'ride_id': ride_id,
        'status': ride['status'],
    })
    for ws in websocket_clients.get(ride_id, []):
        try:
            ws.send_text(payload)
        except Exception:
            pass


def ensure_demo_accounts() -> None:
    defaults = [
        {'id': 1, 'full_name': 'System Admin', 'email': 'admin@eziride.com', 'phone': '9999999999', 'password': 'admin123', 'role': 'admin'},
        {'id': 2, 'full_name': 'Demo Rider', 'email': 'rider@eziride.com', 'phone': '9999999998', 'password': 'rider123', 'role': 'rider'},
        {'id': 3, 'full_name': 'Demo Driver', 'email': 'driver@eziride.com', 'phone': '9999999997', 'password': 'driver123', 'role': 'driver'},
    ]
    for user in defaults:
        users.setdefault(user['email'].lower(), user)


ensure_demo_accounts()


class RegisterPayload(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str
    phone: str
    password: str = Field(..., min_length=4)
    role: str = 'rider'
    vehicle_number: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    role: str
    user_id: int
    full_name: str


@app.get('/')
def index() -> Dict[str, str]:
    return {'message': 'Eziride API is running'}


@app.post('/auth/register', response_model=TokenResponse)
def register_user(payload: RegisterPayload):
    email = payload.email.strip().lower()
    existing = users.get(email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered.')

    new_id = max((user['id'] for user in users.values()), default=0) + 1
    user = {
        'id': new_id,
        'full_name': payload.full_name,
        'email': email,
        'phone': payload.phone,
        'password': payload.password,
        'role': payload.role.lower(),
        'vehicle_number': payload.vehicle_number,
    }
    users[email] = user
    return {
        'access_token': generate_token(user['id'], user['role']),
        'token_type': 'bearer',
        'role': user['role'],
        'user_id': user['id'],
        'full_name': user['full_name'],
    }


@app.post('/auth/token', response_model=TokenResponse)
def login_user(username: str = Form(...), password: str = Form(...)):
    email = username.strip().lower()
    user = get_user_by_email(email)
    if not user or user['password'] != password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password.')
    return {
        'access_token': generate_token(user['id'], user['role']),
        'token_type': 'bearer',
        'role': user['role'],
        'user_id': user['id'],
        'full_name': user['full_name'],
    }


@app.get('/rides/estimate')
def estimate_ride(
    pickup: str = Query(...),
    drop: str = Query(...),
    ride_type: str = Query('Economy'),
    pickup_lat: Optional[float] = Query(None),
    pickup_lng: Optional[float] = Query(None),
    drop_lat: Optional[float] = Query(None),
    drop_lng: Optional[float] = Query(None),
):
    if pickup_lat is not None and pickup_lng is not None and drop_lat is not None and drop_lng is not None:
        distance_km = haversine_km(float(pickup_lat), float(pickup_lng), float(drop_lat), float(drop_lng))
    else:
        distance_km = 10.0

    distance_km = round(max(distance_km, 4.0), 1)
    fare = estimate_fare(ride_type, distance_km)
    return {
        'pickup': pickup,
        'drop': drop,
        'ride_type': ride_type,
        'distance_km': distance_km,
        'distance': f'{distance_km} km',
        'estimated_duration_text': estimate_duration(distance_km),
        'fare': fare,
        'pickup_lat': float(pickup_lat) if pickup_lat is not None else None,
        'pickup_lng': float(pickup_lng) if pickup_lng is not None else None,
        'drop_lat': float(drop_lat) if drop_lat is not None else None,
        'drop_lng': float(drop_lng) if drop_lng is not None else None,
    }


@app.post('/rides/request')
def create_ride(payload: Dict[str, Any]):
    global ride_counter
    ride_counter += 1
    ride = {
        'ride_id': ride_counter,
        'user_id': payload.get('user_id') or 2,
        'pickup': payload.get('pickup') or 'Unknown pickup',
        'drop': payload.get('drop') or 'Unknown drop',
        'ride_type': payload.get('ride_type') or 'Economy',
        'client_name': payload.get('client_name') or 'Demo Rider',
        'client_phone': payload.get('client_phone') or '9999999999',
        'driver_choice': payload.get('driver_choice') or '',
        'requested_driver': payload.get('driver_choice') or 'Any available driver',
        'captain_name': 'Awaiting assignment',
        'captain_phone': 'Awaiting assignment',
        'otp': 'Assigned after acceptance',
        'payment_status': 'Pending',
        'status': 'Requested',
        'fare': payload.get('fare') or 250,
        'pickup_lat': payload.get('pickup_lat'),
        'pickup_lng': payload.get('pickup_lng'),
        'drop_lat': payload.get('drop_lat'),
        'drop_lng': payload.get('drop_lng'),
        'created_at': now_iso(),
        'updated_at': now_iso(),
    }

    if ride.get('pickup_lat') is not None and ride.get('pickup_lng') is not None and ride.get('drop_lat') is not None and ride.get('drop_lng') is not None:
        distance = haversine_km(float(ride['pickup_lat']), float(ride['pickup_lng']), float(ride['drop_lat']), float(ride['drop_lng']))
        ride['fare'] = estimate_fare(ride['ride_type'], round(max(distance, 4.0), 1))

    rides[ride['ride_id']] = ride
    broadcast_ride_update(ride['ride_id'], ride)
    return serialize_ride(ride)


@app.get('/rides/available')
def list_available_rides():
    return [serialize_ride(ride) for ride in rides.values() if ride['status'] in {'Requested', 'Accepted', 'Ongoing'}]


@app.get('/rides/{ride_id}')
def get_ride(ride_id: int):
    ride = rides.get(ride_id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ride not found.')
    return serialize_ride(ride)


@app.post('/rides/{ride_id}/accept')
def accept_ride(ride_id: int):
    ride = rides.get(ride_id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ride not found.')
    ride['status'] = 'Accepted'
    ride['captain_name'] = 'Demo Driver'
    ride['captain_phone'] = '9876543210'
    ride['otp'] = str(123456 + ride_id % 100)
    ride['updated_at'] = now_iso()
    broadcast_ride_update(ride_id, ride)
    return serialize_ride(ride)


@app.post('/rides/{ride_id}/start')
def start_ride(ride_id: int, entered_otp: str = Query(...)):
    ride = rides.get(ride_id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ride not found.')
    if str(ride.get('otp', '')) != str(entered_otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid OTP.')
    ride['status'] = 'Ongoing'
    ride['updated_at'] = now_iso()
    broadcast_ride_update(ride_id, ride)
    return serialize_ride(ride)


@app.post('/rides/{ride_id}/complete')
def complete_ride(ride_id: int):
    ride = rides.get(ride_id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ride not found.')
    ride['status'] = 'Completed'
    ride['payment_status'] = 'Paid'
    ride['updated_at'] = now_iso()
    broadcast_ride_update(ride_id, ride)
    return serialize_ride(ride)


@app.get('/history/rides')
def get_history_rides():
    return [serialize_ride(ride) for ride in rides.values() if ride['status'] == 'Completed']


@app.post('/history/ratings')
def submit_rating(payload: Dict[str, Any]):
    rating = {
        'ride_id': payload.get('ride_id'),
        'stars': payload.get('stars', 5),
        'feedback': payload.get('feedback', ''),
        'created_at': now_iso(),
    }
    ratings.append(rating)
    return {'message': 'Rating saved successfully', 'rating': rating}


@app.websocket('/ws/ride/{ride_id}')
async def ride_socket(websocket: WebSocket, ride_id: int):
    await websocket.accept()
    websocket_clients.setdefault(ride_id, []).append(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message:
                data = json.loads(message)
                ride = rides.get(ride_id)
                if ride and 'lat' in data and 'lng' in data:
                    ride['lat'] = data['lat']
                    ride['lng'] = data['lng']
                    ride['updated_at'] = now_iso()
                    await websocket.send_text(json.dumps({'type': 'location', 'lat': data['lat'], 'lng': data['lng']}))
    except WebSocketDisconnect:
        websocket_clients.get(ride_id, []).remove(websocket)
    except Exception:
        websocket_clients.get(ride_id, []).remove(websocket)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app.main:app', host='127.0.0.1', port=8000, reload=True)
