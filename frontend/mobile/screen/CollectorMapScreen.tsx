import * as Location from 'expo-location';
import { useEffect } from 'react';
import api from '../lib/api';

useEffect(() => {
    (async () => {
        await Location.requestForegroundPermissionsAsync();
        await Location.requestBackgroundPermissionsAsync();

        Location.watchPositionAsync({
            accuracy: Location.Accuracy.High,
            timeInterval: 30000, // 30 sec
            distanceInterval: 50     // 50 meters
        }, async (location) => {
            const villages = await api.get('/customers/villages/').then(r => r.data);
            const nearby = villages.find(v =>
                getDistance(location.coords, v.gps_coordinates) < 500 // 500m radius
            );

            if (nearby && nearby.id !== lastVillageId) {
                // COLLECTOR ENTERED VILLAGE → TRIGGER REMINDERS
                await api.post('/notifications/trigger-geofence/', {
                    village_id: nearby.id
                });
                setLastVillageId(nearby.id);
            }
        });
    })();
}, []);