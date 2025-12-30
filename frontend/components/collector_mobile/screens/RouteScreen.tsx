// collector-mobile/screens/RouteScreen.tsx
import {useEffect} from "react";

useEffect(() => {
    if (urgentOrder) {
        Alert.alert(
            "URGENT COLLECTION",
            `${urgentOrder.customer.name} owes RWF ${urgentOrder.amount.toLocaleString()}\nDistance: ${distance} km`,
            [{ text: "Navigate Now", onPress: () => openMaps(urgentOrder.customer.gps) }]
        );
    }
}, [urgentOrder]);