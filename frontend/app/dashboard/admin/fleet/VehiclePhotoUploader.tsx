import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import api from "@/lib/api";

type VehiclePhoto = {
    id: number;
    image: string;
};

type VehiclePhotoUploaderProps = {
    vehicleId: number;
    photos: VehiclePhoto[];
    onChange: (updatedPhotos: VehiclePhoto[]) => void;
};

export default function VehiclePhotoUploader({ vehicleId, photos, onChange }: VehiclePhotoUploaderProps) {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("vehicle_id", String(vehicleId));

        try {
            setUploading(true);
            const res = await api.post("fleet/upload-photo/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onChange([...photos, res.data]);
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId: number) => {
        if (!confirm("Are you sure you want to delete this photo?")) return;

        try {
            await api.delete(`fleet/delete-photo/${photoId}/`);
            onChange(photos.filter((p) => p.id !== photoId));
        } catch (err) {
            console.error("Failed to delete photo", err);
        }
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        Array.from(files).forEach(uploadFile);
    };

    return (
        <div className="w-full">
            {/* Upload Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                    dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                }}
            >
                <Upload className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-gray-600 text-sm">
                    {uploading ? "Uploading..." : "Drag & drop photos here or browse"}
                </p>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {/* Preview Section */}
            {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-5">
                    {photos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                            <img src={photo.image} alt={`Vehicle Photo ${photo.id}`} className="w-full h-32 object-cover" />
                            <button
                                onClick={() => deletePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
