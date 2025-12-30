// components/fleet/VehicleKanbanBoard.tsx
"use client";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Car, Wrench, MapPin, Package } from "lucide-react";

const statusColumns = {
    standby: { title: "Standby", icon: Package, color: "purple" },
    active: { title: "Ready", icon: Car, color: "green" },
    on_road: { title: "On Road", icon: MapPin, color: "blue" },
    workshop: { title: "Workshop", icon: Wrench, color: "orange" },
};

function KanbanCard({ vehicle }: { vehicle: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: vehicle.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing mb-3"
        >
            <p className="font-bold text-lg">{vehicle.registration_number}</p>
            <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model}</p>
        </div>
    );
}

export default function VehicleKanbanBoard({ vehicles }: { vehicles: any[] }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        // In real app: call API to update vehicle status
        console.log("Moved vehicle", active.id, "to", over.id);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(statusColumns).map(([status, config]) => {
                    const columnVehicles = vehicles.filter(v => v.status === status);

                    return (
                        <div key={status} className="bg-gray-100 dark:bg-gray-900 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-3 rounded-xl bg-${config.color}-100 dark:bg-${config.color}-900`}>
                                    <config.icon className={`w-6 h-6 text-${config.color}-600`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{config.title}</h3>
                                    <p className="text-sm text-gray-500">{columnVehicles.length} vehicles</p>
                                </div>
                            </div>

                            <SortableContext items={columnVehicles.map(v => v.id)} strategy={horizontalListSortingStrategy}>
                                <div className="space-y-3 min-h-96">
                                    {columnVehicles.map(vehicle => (
                                        <KanbanCard key={vehicle.id} vehicle={vehicle} />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    );
                })}
            </div>
        </DndContext>
    );
}