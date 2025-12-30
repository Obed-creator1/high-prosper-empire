// components/fleet/ComplianceAlerts.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Shield, Calendar } from "lucide-react";
import api from "@/lib/api";

export default function ComplianceAlerts() {
    const [alerts, setAlerts] = useState<any>({});

    useEffect(() => {
        api.get("/fleet/compliance-alerts/").then(res => setAlerts(res.data));
    }, []);

    const { expired = [], critical_5_days = [] } = alerts;

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 border">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Shield className="w-7 h-7 text-red-600" />
                Compliance Alerts
            </h3>

            <div className="space-y-4">
                {expired.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                        <p className="font-bold text-red-800">EXPIRED ({expired.length})</p>
                        {expired.slice(0, 3).map((c: any) => (
                            <p key={c.id} className="text-sm mt-1">• {c.registration_number} - {c.type}</p>
                        ))}
                    </div>
                )}

                {critical_5_days.length > 0 && (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                        <p className="font-bold text-orange-800">CRITICAL - Expires in ≤5 days ({critical_5_days.length})</p>
                        {critical_5_days.slice(0, 3).map((c: any) => (
                            <p key={c.id} className="text-sm mt-1">• {c.registration_number} - {c.type} ({c.days_left}d)</p>
                        ))}
                    </div>
                )}

                {expired.length === 0 && critical_5_days.length === 0 && (
                    <p className="text-green-600 font-bold text-center py-8">
                        All compliance documents are valid!
                    </p>
                )}
            </div>
        </div>
    );
}