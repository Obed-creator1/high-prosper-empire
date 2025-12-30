// components/fleet/VehicleDetailModal.tsx
import { X, Car, Gauge, Calendar, DollarSign, Shield } from "lucide-react";
import { format } from "date-fns";

interface Vehicle {
    id: number;
    registration_number: string;
    brand: string;
    model: string;
    photo?: string;
    status: string;
    odometer_reading: number;
    bdm_kg: number;
    registration_date: string;
    purchase_price?: number;
}

export default function VehicleDetailModal({ vehicle, isOpen, onClose }: { vehicle: Vehicle | null; isOpen: boolean; onClose: () => void }) {
    if (!isOpen || !vehicle) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-8 py-5 flex justify-between items-center">
                    <h2 className="text-3xl font-bold">Vehicle Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        {vehicle.photo ? (
                            <img src={vehicle.photo} alt={vehicle.registration_number} className="w-full rounded-2xl shadow-xl" />
                        ) : (
                            <div className="bg-gradient-to-br from-slate-200 to-slate-300 border-4 border-dashed rounded-2xl w-full h-80 flex items-center justify-center">
                                <Car className="w-24 h-24 text-slate-500" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-slate-500">Registration Number</p>
                            <p className="text-3xl font-black text-blue-700">{vehicle.registration_number}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <Gauge className="w-8 h-8 text-blue-600 mb-2" />
                                <p className="text-sm text-slate-600">Odometer</p>
                                <p className="text-xl font-bold">{vehicle.odometer_reading.toLocaleString()} km</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <Shield className="w-8 h-8 text-green-600 mb-2" />
                                <p className="text-sm text-slate-600">Status</p>
                                <p className="text-xl font-bold capitalize">{vehicle.status.replace("_", " ")}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-lg">
                            <p><strong>Brand & Model:</strong> {vehicle.brand} {vehicle.model}</p>
                            <p><strong>BDM:</strong> {vehicle.bdm_kg} kg</p>
                            <p><strong>Reg Date:</strong> {format(new Date(vehicle.registration_date), "dd MMM yyyy")}</p>
                            {vehicle.purchase_price && (
                                <p><strong>Value:</strong> RM {vehicle.purchase_price.toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}