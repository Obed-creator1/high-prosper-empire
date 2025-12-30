"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Upload } from "lucide-react";
import Image from "next/image";

interface VehiclePhoto {
  id: number;
  image: string;
}

interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model_name: string;
  year?: number;
  color?: string;
  mileage?: number;
  photos?: VehiclePhoto[];
}

interface VehicleInfoTabsProps {
  vehicle: Vehicle;
  onPhotoUpload?: (file: File) => void;
  onPhotoDelete?: (photoId: number) => void;
}

export default function VehicleInfoTabs({
  vehicle,
  onPhotoUpload,
  onPhotoDelete,
}: VehicleInfoTabsProps) {
  const [photos, setPhotos] = useState<VehiclePhoto[]>(vehicle.photos || []);

  const handlePhotoDelete = (photoId: number) => {
    if (onPhotoDelete) onPhotoDelete(photoId);
    setPhotos(photos.filter((p) => p.id !== photoId));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoUpload) onPhotoUpload(file);
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="details">
        <TabsList className="border-b mb-4 flex gap-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        {/* --- VEHICLE DETAILS TAB --- */}
        <TabsContent value="details">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4">
              <div>
                <strong>Plate Number:</strong> {vehicle.plate_number}
              </div>
              <div>
                <strong>Brand:</strong> {vehicle.brand}
              </div>
              <div>
                <strong>Model:</strong> {vehicle.model_name}
              </div>
              {vehicle.year && (
                <div>
                  <strong>Year:</strong> {vehicle.year}
                </div>
              )}
              {vehicle.color && (
                <div>
                  <strong>Color:</strong> {vehicle.color}
                </div>
              )}
              {vehicle.mileage && (
                <div>
                  <strong>Mileage:</strong> {vehicle.mileage} km
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- VEHICLE PHOTOS TAB --- */}
        <TabsContent value="photos">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Vehicle Photos</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <p className="text-gray-500 text-sm">No photos uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="relative group">
                  <Image
                    src={p.image}
                    alt={`Vehicle ${vehicle.plate_number}`}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <Button
                    variant="secondary" // must use allowed variant
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-red-100 hover:bg-red-200 text-red-600"
                    onClick={() => handlePhotoDelete(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
