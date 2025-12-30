"use client";

import React from "react";

interface RoleProtectedTabProps {
    userRole: string | null;           // Role of the logged-in user
    allowedRoles: string[];            // Roles allowed to see this content
    children: React.ReactNode;
}

export default function RoleProtectedTab({
                                             userRole,
                                             allowedRoles,
                                             children,
                                         }: RoleProtectedTabProps) {
    // Make sure allowedRoles is always an array
    if (!userRole || !allowedRoles?.includes(userRole)) return null;

    return <>{children}</>;
}
