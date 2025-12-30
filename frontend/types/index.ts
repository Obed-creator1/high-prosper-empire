export interface User {
    id: number;
    username: string;
    email?: string | null;
    role?:
        | "ceo"
        | "admin"
        | "hr"
        | "account"
        | "manager"
        | "supervisor"
        | "collector"
        | "staff"
        | "driver"
        | "manpower"
        | "customer";
    is_active?: boolean;
    date_joined?: string;
    phone?: string | null;
    status?: string;
    profile_picture?: string | null;
    last_seen?: string | null;
    is_online?: boolean;

    // Chat-related
    last_message?: string;
    unread_count?: number;
}

/* ---------------------------
   Dashboard & Payments Types
----------------------------*/

export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    pendingTasks: number;
    totalVehicles?: number;
    totalRevenue?: number;
    totalMessages?: number;
    totalCustomers?: number; // optional total customers
}

/* ---------------------------
   Customers & Villages
----------------------------*/

export interface Customer {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    village?: string | null;
    status?: string;
}

/* ---------------------------
   Payment Summary Structure
----------------------------*/

export interface VillagePayment {
    id: number;
    name: string;
    total_collected: number;
    total_outstanding: number;
}

export interface PaymentSummary {
    today_collected: number;
    month_collected: number;
    total_outstanding: number;
    per_village: VillagePayment[];
}

/* ---------------------------
   Chat Message Type
----------------------------*/

export interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    attachment_type?: "text" | "image" | "video" | "audio" | "document" | "sticker" | "gif" | "emoji";
    timestamp: string; // ISO string
}
