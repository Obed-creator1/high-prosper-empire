"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

type Vehicle = {
  id: number;
  plate_number: string;
  brand: string;
  model_name: string;
  status: string;
  year_of_manufacture: number;
};

type VehicleFormProps = {
  vehicle?: Vehicle;
  onClose: () => void;
  onSave: () => void;
  onVehicleUpdate?: (updatedVehicle: Vehicle) => void; // optional callback for instant update
};

export default function VehicleForm({ vehicle, onClose, onSave, onVehicleUpdate }: VehicleFormProps) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate_number || "");
  const [brand, setBrand] = useState(vehicle?.brand || "");
  const [modelName, setModelName] = useState(vehicle?.model_name || "");
  const [status, setStatus] = useState(vehicle?.status || "active");
  const [year, setYear] = useState(vehicle?.year_of_manufacture || new Date().getFullYear());
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // Handle photo selection
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let vehicleId = vehicle?.id;

      // Add or update vehicle
      if (vehicleId) {
        await api.put(`fleet/vehicles/${vehicleId}/`, {
          plate_number: plateNumber,
          brand,
          model_name: modelName,
          status,
          year_of_manufacture: year,
        });
      } else {
        const res = await api.post("fleet/vehicles/", {
          plate_number: plateNumber,
          brand,
          model_name: modelName,
          status,
          year_of_manufacture: year,
        });
        vehicleId = res.data.id;
      }

      // Upload photos if any
      if (vehicleId && photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => formData.append("images", photo));
        formData.append("vehicle", vehicleId.toString());
        await api.post("fleet/upload-photo/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Propagate the updated/new vehicle to parent
      if (vehicleId) {
        onVehicleUpdate?.({
          id: vehicleId, // now guaranteed to be a number
          plate_number: plateNumber,
          brand,
          model_name: modelName,
          status,
          year_of_manufacture: year,
        });
      }

      onSave(); // Refresh vehicle list and gallery
      onClose();
    } catch (err) {
      console.error("Failed to save vehicle:", err);
      alert("Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Plate Number</label>
        <input
          type="text"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          className="mt-1 block w-full border rounded-md p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Brand</label>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="mt-1 block w-full border rounded-md p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Model Name</label>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          className="mt-1 block w-full border rounded-md p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Year of Manufacture</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="mt-1 block w-full border rounded-md p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full border rounded-md p-2"
        >
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Photos</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoChange}
          className="mt-1 block w-full"
        />
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : vehicle ? "Update Vehicle" : "Add Vehicle"}
        </Button>
      </div>
    </form>
  );
}
