// frontend/components/CustomerCard.tsx
"use client";

import { Card, CardContent, Button } from "@/components/ui";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface CustomerCardProps {
    customer: any;
    onEdit: (customer: any) => void;
    onDelete: (id: number) => void;
}

export default function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
    return (
        <motion.div whileHover={{ scale: 1.03 }} className="transition">
            <Card>
                <CardContent className="space-y-2">
                    <h2 className="text-lg font-semibold">{customer.name}</h2>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    <p className="text-sm">Monthly fee: {customer.monthly_fee || "-"}</p>
                    <p className="text-sm">Outstanding: {customer.outstanding || "-"}</p>
                    <p className="text-sm">Village: {customer.village_name || "-"}</p>
                    <p className="text-sm">Collector: {customer.collector_name || "-"}</p>
                    <p className="text-sm font-medium">
                        Status:{" "}
                        <span className={customer.status === "Active" ? "text-green-600" : "text-red-600"}>
              {customer.status}
            </span>
                    </p>
                    <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
                            <Pencil size={16} /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(customer.id)}>
                            <Trash2 size={16} /> Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
