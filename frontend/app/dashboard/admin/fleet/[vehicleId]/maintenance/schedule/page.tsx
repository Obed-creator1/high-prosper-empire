"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import ScheduleMaintenanceClient from "./ScheduleMaintenanceClient";

// Server component wrapper
export default async function ScheduleMaintenancePage({
                                                          params,
                                                      }: {
    params: Promise<{ vehicleId: string }>;
}) {
    const { vehicleId } = await params; // unwrap async params
    return <ScheduleMaintenanceClient vehicleId={vehicleId} />;
}
