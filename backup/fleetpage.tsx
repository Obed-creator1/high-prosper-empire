"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
    Plus,
    Edit2,
    Trash2,
    ArrowLeft,
    Car,
    MapPin,
} from "lucide-react";
import CountUp from "react-countup";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import VehicleInfoTabs from "./VehicleInfoTabs";
import VehicleForm from "./VehicleForm";

type Vehicle = {
    id: number;
    plate_number: string;
    brand: string;
    model_name: string;
    status: string;
    year_of_manufacture: number;
    photo?: string | null; // photo URL from backend
    lat?: number | null;
    lng?: number | null;
};

export default function FleetDashboard() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [openInfo, setOpenInfo] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    const mapContainerStyle = { width: "100%", height: "350px", borderRadius: "0.75rem" };
    const center = { lat: -1.95, lng: 30.05 };
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    useEffect(() => {
        if (loadError) setMapError("Failed to load Google Maps. Check your API key.");
    }, [loadError]);

    // Fetch vehicles and attach photo URL from backend
    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const res = await api.get("fleet/vehicles/");
            const vehiclesWithPhoto = await Promise.all(
                res.data.map(async (v: Vehicle) => {
                    // If backend stores photos separately, fetch first photo URL
                    let photoUrl: string | null = null;
                    if (v.id) {
                        try {
                            const photoRes = await api.get(`fleet/vehicle-photos/?vehicle=${v.id}`);
                            if (photoRes.data.length > 0) photoUrl = photoRes.data[0].image; // first photo
                        } catch (err) {
                            console.error("Failed to fetch vehicle photo:", err);
                        }
                    }
                    return { ...v, photo: photoUrl };
                })
            );
            setVehicles(vehiclesWithPhoto);
        } catch (err) {
            console.error("Failed to fetch vehicles:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    // Update a vehicle instantly after form submission
    const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
        setVehicles((prev) =>
            prev.some((v) => v.id === updatedVehicle.id)
                ? prev.map((v) => (v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v))
                : [...prev, updatedVehicle] // new vehicle
        );
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return;
        try {
            await api.delete(`fleet/vehicles/${id}/`);
            setVehicles((prev) => prev.filter((v) => v.id !== id));
        } catch (err) {
            console.error("Failed to delete vehicle:", err);
            alert("Failed to delete vehicle");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-blue-700 flex items-center gap-2">
                        <Car className="w-6 h-6" /> Fleet Admin
                    </h2>
                    <nav className="space-y-3">
                        <Link href="/dashboard/admin" className="block text-gray-700 hover:text-blue-600">Dashboard</Link>
                        <Link href="/dashboard/admin/fleet" className="block text-blue-700 font-semibold">Fleet Management</Link>
                        <Link href="/dashboard/admin/customers" className="block text-gray-700 hover:text-blue-600">Customers</Link>
                        <Link href="/dashboard/admin/payments" className="block text-gray-700 hover:text-blue-600">Payments</Link>
                    </nav>
                </div>
                <div className="mt-6 text-sm text-gray-400 text-center">© 2025 Fleet System</div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Navbar */}
                <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/admin" className="flex items-center gap-2 text-blue-700 hover:text-blue-900">
                            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-800">Fleet Management</h1>
                    </div>
                    <Button
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setOpenForm(true)}
                    >
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </Button>
                </header>

                {/* Stats Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
                    <div className="card bg-white rounded-xl shadow p-4">
                        <h3 className="text-gray-600">Total Vehicles</h3>
                        <CountUp end={vehicles.length} duration={1.2} className="text-3xl font-bold text-blue-700" />
                    </div>
                    <div className="card bg-white rounded-xl shadow p-4">
                        <h3 className="text-gray-600">Active Vehicles</h3>
                        <CountUp
                            end={vehicles.filter((v) => v.status === "active").length}
                            duration={1.2}
                            className="text-3xl font-bold text-green-600"
                        />
                    </div>
                    <div className="card bg-white rounded-xl shadow p-4">
                        <h3 className="text-gray-600">In Maintenance</h3>
                        <CountUp
                            end={vehicles.filter((v) => v.status === "maintenance").length}
                            duration={1.2}
                            className="text-3xl font-bold text-yellow-600"
                        />
                    </div>
                </section>

                {/* Vehicle Grid */}
                <section className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <p className="text-gray-500">Loading vehicles...</p>
                    ) : vehicles.length === 0 ? (
                        <p className="text-gray-500">No vehicles found.</p>
                    ) : (
                        vehicles.map((v) => (
                            <div
                                key={v.id}
                                className="relative bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer group"
                                onClick={() => {
                                    setSelectedVehicle(v);
                                    setOpenInfo(true);
                                }}
                            >
                                <img
                                    src={v.photo || "/images/vehicle-placeholder.png"}
                                    alt={v.plate_number}
                                    className="w-full h-48 object-cover rounded-t-xl"
                                />
                                <div className="p-4 space-y-1">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        {v.brand} {v.model_name}
                                    </h3>
                                    <p className="text-sm text-gray-500">{v.plate_number}</p>
                                    <p className={`text-sm ${v.status === "active" ? "text-green-600" : "text-yellow-600"}`}>
                                        {v.status}
                                    </p>
                                    <p className="text-xs text-gray-400">Year: {v.year_of_manufacture}</p>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <Button
                                        size="icon"
                                        className="bg-blue-500 hover:bg-blue-600 text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingVehicle(v);
                                            setOpenForm(true);
                                        }}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(v.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </section>

                {/* Google Map */}
                <section className="p-6">
                    <div className="bg-white rounded-xl shadow p-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                            <MapPin className="w-5 h-5 text-blue-600" /> Vehicle Locations
                        </h2>
                        {mapError && <p className="text-red-600">{mapError}</p>}
                        {isLoaded && !mapError && (
                            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12}>
                                {vehicles.map((v) => v.lat && v.lng && <Marker key={v.id} position={{ lat: v.lat, lng: v.lng }} />)}
                            </GoogleMap>
                        )}
                    </div>
                </section>
            </div>

            {/* Vehicle Info Modal */}
            <Dialog open={openInfo} onOpenChange={setOpenInfo}>
                <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Vehicle Information</DialogTitle>
                    </DialogHeader>
                    {selectedVehicle && <VehicleInfoTabs vehicle={selectedVehicle} />}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Vehicle Modal */}
            <Dialog open={openForm} onOpenChange={() => setOpenForm(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
                    </DialogHeader>
                    <VehicleForm
                        vehicle={editingVehicle ?? undefined}
                        onClose={() => setOpenForm(false)}
                        onSave={() => { setOpenForm(false); fetchVehicles(); }}
                        onVehicleUpdate={handleVehicleUpdate} // instant update
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
