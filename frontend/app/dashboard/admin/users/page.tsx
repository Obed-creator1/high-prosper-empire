// app/dashboard/admin/users/page.tsx
"use client";

import React, {useEffect, useRef, useState} from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    ArrowLeftIcon,
    XMarkIcon,
    KeyIcon,
    ArrowDownTrayIcon,
    DocumentIcon,
    CameraIcon,
    CheckCircleIcon,
    XCircleIcon,
    UsersIcon,
    UserPlusIcon,
    UserMinusIcon,
    ClockIcon,
    EyeIcon,
    EyeSlashIcon,
    ExclamationTriangleIcon,
    ChartBarIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, BuildingStorefrontIcon, BuildingOfficeIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
    Legend,
    BarChart,
    Bar,
    LineChart,
    Line,
    Rectangle,
    Brush,
} from "recharts";
import dayjs from "dayjs";
import Image from "next/image";
import axios from "axios";
import { Button, Spin, message } from 'antd';
import dynamic from "next/dynamic";
import {sum} from "es-toolkit";
import Cropper from 'react-easy-crop';

interface RoleTrendChartProps {
    data: Array<Record<string, any>>;          // [{ month: "2025-01", admin: 5, manager: 12, ... }]
    viewMode?: 'absolute' | 'percentage';
    showComparison?: boolean;
    selectedRole?: string | null;
}

interface HeatmapDataPoint {
    day: number;   // 1 = Monday ... 7 = Sunday
    hour: number;  // 0–23
    value: number;
}

interface HeatmapChartProps {
    data: HeatmapDataPoint[];
    selectedDays: number[];
    dragStartDay: number | null;
    hoveredDay: number | null;
    isDragging: boolean;
    onDayClick: (day: number, isMultiSelect: boolean) => void;
    onDayHover?: (day: number | null) => void; // optional hover callback
}

// ─── Types ──────────────────────────────────────────────────────────────────

// Full Company (Tenant) type - matches most fields from Company model
type Company = {
    id: number;
    name: string;
    slug?: string;              // used for subdomains
    logo?: string | null;       // URL to logo image
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;     // province/state
    country?: string;           // default 'Rwanda'
    currency?: string;          // ISO code e.g. 'RWF'
    timezone?: string;          // e.g. 'Africa/Kigali'
    tax_id?: string | null;     // VAT/TIN
    is_active: boolean;
    created_at: string;         // ISO datetime
    updated_at?: string;
    created_by?: number | null; // user ID who created it
};

// Full Branch type - matches Branch model
type Branch = {
    id: number;
    company: number;            // company ID (foreign key)
    name: string;
    slug?: string;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    phone?: string | null;
    email?: string | null;
    is_active: boolean;
    manager?: number | null;    // user ID of branch manager
    created_at: string;
    updated_at?: string;
};

// Extended User type - includes display-friendly company/branch names
type User = {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;

    // Foreign keys
    company_id: number | null;
    branch_id: number | null;

    company_name?: string | null;   // ← add this (backend can return it)
    branch_name?: string | null;    // ← add this
    // or keep nested if your API returns them
    company?: { id: number; name: string; } | null;
    branch?: { id: number; name: string; } | null;

    // Auth & status
    last_login: string | null;
    date_joined: string;
    is_online: boolean;
    is_verified: boolean;
    is_active: boolean;

    // Profile
    profile_picture_url: string | null;

    // Optional extra fields you might add later
    last_seen?: string | null;
    created_at?: string;

    new_password?: string | null;
    confirmPassword?: string | null;
    new_photo?: string | null;
};

type Analytics = {
    total_users: number;
    users_by_role: Record<string, number>;
    total_online: number;
    total_offline: number;
    new_users_today: number;
    new_users_month: number;
    blocked_users: number;
    inactive_users: number;
    deleted_users: number;
    logged_in_total: number;
    logged_in_month: number;
    usage_hours: number;
    performance_percentage: number;
    monthly_growth: Array<{ month: string; registrations: number }>;
    role_trend: Array<Record<string, any>>;
    role_trend_previous: Array<Record<string, any>>;
    activity_heatmap: Array<{ day: number; hour: number; value: number }>;
    status_breakdown: {
        active: number;
        inactive: number;
        verified: number;
        unverified: number;
        online: number;
        offline: number;
    };
};

// ─── Constants ──────────────────────────────────────────────────────────────

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#845EC2", "#D65DB1", "#FF6F91", "#FFC75F", "#2C73D2"];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatRelativeTime = (date: string) => {
    const d = dayjs(date);
    const diff = dayjs().diff(d, 'minute');
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.format('MMM D');
};

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'login': return <ArrowRightOnRectangleIcon className="w-5 h-5 text-green-600" />;
        case 'logout': return <ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-600" />;
        case 'posted': return <PencilSquareIcon className="w-5 h-5 text-blue-600" />;
        // ... add more
        default: return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
};

// Dummy chart data (replace with real API data later)
const performanceData = [
    { date: "Jan", performance: 65 },
    { date: "Feb", performance: 72 },
    { date: "Mar", performance: 81 },
    { date: "Apr", performance: 90 },
    { date: "May", performance: 85 },
    { date: "Jun", performance: 95 },
];

const newUsersData = [
    { name: "Today", value: 12 },
    { name: "This Month", value: 45 },
];

const statusData = [
    { name: "Blocked", count: 8 },
    { name: "Inactive", count: 22 },
    { name: "Deleted", count: 15 },
];


// ─── Main Component ─────────────────────────────────────────────────────────

function RoleTrendChart(props: {
    data: Array<Record<string, any>>,
    viewMode: "absolute" | "percentage",
    showComparison: boolean,
    selectedRole: string | null
}) {
    return null;
}

export default function UsersPage() {
    const router = useRouter();
    const token = Cookies.get("token");
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [blockedAnalytics, setBlockedAnalytics] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalUser, setModalUser] = useState<Partial<User> | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    const [exporting, setExporting] = useState(false);
    const [tenants, setTenants] = useState([]); // Companies from backend (Tenants model)
    const [branches, setBranches] = useState([]); // Branches filtered by selected company
    const [previewUrl, setPreviewUrl] = useState<string | null>(null); // Photo preview
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [imageError, setImageError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState('');
    const [passwordStrengthColor, setPasswordStrengthColor] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [loadingForm, setLoadingForm] = useState(false);

    // Refs for export
    const trendChartRef = useRef<HTMLDivElement>(null);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [roleViewMode, setRoleViewMode] = useState<'absolute' | 'percentage'>('absolute');
    const [showComparison, setShowComparison] = useState(false);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);

    // For time range filter (in zoom view)
    const [timeRange, setTimeRange] = useState<[number, number]>([0, 23]); // [startHour, endHour]

    // Companies (formerly tenants) and branches
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);

    // For week comparison
    const [compareWeek, setCompareWeek] = useState<'current' | 'previous' | 'both'>('current');
    const [showDifference, setShowDifference] = useState(false); // optional difference mode
    const [zoomMode, setZoomMode] = useState<'average' | 'lines'>('average');
    const [dragStartDay, setDragStartDay] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [zoomedDay, setZoomedDay] = useState<number | null>(null);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [selectedDays, setSelectedDays] = useState<number[]>([]); // array of day numbers 1-7

    const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
    const [allRoles, setAllRoles] = useState<string[]>([]);

    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [suggestedPasswords, setSuggestedPasswords] = useState<string[]>([]);
    const isNewUser = modalUser && !modalUser.id;
    const isEditingUser = !!modalUser?.id;
    const [uploadProgress, setUploadProgress] = useState(0);


    // ─── Data Fetching ────────────────────────────────────────────────────────

    // ─── FETCH DATA ─────────────────────────────────────────────────────────────
    const fetchData = async () => {
        if (!token) {
            setError("No authentication token found. Please log in again.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const [usersRes, analyticsRes, companiesRes] = await Promise.all([
                api.get("/users/admin/users/", {
                    headers: { Authorization: `Token ${token}` },
                }),
                api.get("/users/admin/analytics/", {
                    headers: { Authorization: `Token ${token}` },
                }),
                api.get("/tenants/companies/", {
                    headers: { Authorization: `Token ${token}` },
                }),
            ]);
            // FIX: Extract the array of users (handles pagination response)
            const userList = Array.isArray(usersRes.data)
                ? usersRes.data
                : usersRes.data?.results || usersRes.data?.data || [];
            setUsers(userList);
            setFilteredUsers(userList);
            setAnalytics(analyticsRes.data);
            setCompanies(companiesRes.data || []); // Add this to populate companies
        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError("Failed to load users and analytics.");
            toast.error("Failed to load data!");
        } finally {
            setLoading(false);
        }
    };

    // ─── Data Fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchAllData = async () => {
            if (!token) {
                setError("No authentication token found. Please log in.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const authHeader = { headers: { Authorization: `Token ${token}` } };

                const [usersRes, analyticsRes, companiesRes] = await Promise.all([
                    api.get("/users/admin/users/", authHeader),
                    api.get("/users/admin/analytics/", authHeader),
                    api.get("/tenants/companies/", authHeader), // ← FIXED: full API path
                ]);

                // Debug logs – remove later if not needed
                console.log("Companies raw response:", companiesRes.data);

                // Users (handle paginated or flat array)
                const userList = Array.isArray(usersRes.data)
                    ? usersRes.data
                    : usersRes.data?.results || usersRes.data?.data || [];
                setUsers(userList);
                setFilteredUsers(userList);

                // Analytics
                setAnalytics(analyticsRes.data);

                // Companies – handle both direct array and DRF paginated response
                let companyData = companiesRes.data;

                // If it's a paginated response (common in DRF), extract results
                if (companyData && typeof companyData === 'object' && !Array.isArray(companyData)) {
                    companyData = companyData.results || companyData.data || [];
                }

                console.log("Processed companies array:", companyData);

                // Final safety check
                if (!Array.isArray(companyData)) {
                    console.warn("Companies data is not an array:", companyData);
                    toast.error("Company list format invalid – showing empty");
                    setCompanies([]);
                } else {
                    setCompanies(companyData);
                    console.log(`Loaded ${companyData.length} companies`);
                }
            } catch (err: any) {
                console.error("Fetch error:", err);
                const msg = err.response?.data?.detail || err.message || "Unknown error";
                setError(`Failed to load data: ${msg}`);
                toast.error("Could not load users, analytics or companies");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [token]);

    // ─── Modal Handlers ───────────────────────────────────────────────────────
    const openModal = (user?: User) => {
        if (user) {
            // Editing existing user
            const companyId = user.company_id || null;
            const branchId = user.branch_id || null;

            const suggestions = Array.from({ length: 3 }, () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
                let pwd = '';
                for (let i = 0; i < 16; i++) {
                    pwd += chars[Math.floor(Math.random() * chars.length)];
                }
                return pwd;
            });
            setSuggestedPasswords(suggestions);

            setModalUser({
                ...user,
                company_id: companyId,
                branch_id: branchId,
                new_password: "", // clear password field when editing
            });

            setPreviewUrl(user.profile_picture_url || null);
            setShowPassword(false); // hide password fields by default when editing
            setConfirmPassword("");
            setPasswordMismatch(false);
            setUsernameError("");
            setEmailError("");
            setImageError("");

            // If company is pre-selected → trigger branch fetch immediately
            if (companyId) {
                // This will be picked up by the useEffect that watches modalUser.company_id
                // No need to call fetchBranches manually here
            }
        } else {
            // Creating new user
            setModalUser({
                username: "",
                full_name: "",
                email: "",
                phone: "",
                role: "collector",
                company_id: null,
                branch_id: null,
                is_verified: false,
                is_active: true,
                new_password: "",
            });

            setPreviewUrl(null);
            setShowPassword(true); // show password fields for new user
            setConfirmPassword("");
            setPasswordMismatch(false);
            setUsernameError("");
            setEmailError("");
            setImageError("");
        }

        setModalOpen(true);
    };

    // Compute allRoles once analytics loads
    useEffect(() => {
        if (analytics?.role_trend?.length) {
            const roles = Array.from(
                new Set(
                    analytics.role_trend.flatMap(item =>
                        Object.keys(item).filter(key => key !== 'month' && typeof item[key] === 'number')
                    )
                )
            ).sort();

            setAllRoles(roles);
        }
    }, [analytics]);

    // ================================================
    // Photo Handling (Professional Preview + Validation)
    // ================================================
    // Photo handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setImageError('File too large (max 2MB)');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setImageError('Invalid file type. Only images allowed.');
            return;
        }

        setImageError('');
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        setModalUser(prev => ({ ...prev, new_photo: file }));
    };

    // Password strength
    const checkPasswordStrength = (password: string) => {
        if (!password) {
            setPasswordStrength('');
            setPasswordStrengthColor('');
            return;
        }

        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[@$!%*?&]/.test(password);
        const lengthOk = password.length >= 12;

        const score = [hasUpper, hasLower, hasNumber, hasSpecial, lengthOk].filter(Boolean).length;

        if (score <= 2) {
            setPasswordStrength('Weak');
            setPasswordStrengthColor('text-red-500');
        } else if (score <= 4) {
            setPasswordStrength('Medium');
            setPasswordStrengthColor('text-yellow-500');
        } else {
            setPasswordStrength('Strong');
            setPasswordStrengthColor('text-green-500');
        }
    };

    const generateStrongPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
        let pass = '';
        for (let i = 0; i < 16; i++) {
            pass += chars[Math.floor(Math.random() * chars.length)];
        }

        setModalUser(prev => ({ ...prev, new_password: pass }));
        setConfirmPassword(pass);
        checkPasswordStrength(pass);
        toast.info('Strong password generated!');
    };

    // Unique checks
    const checkUsernameUnique = async (e: React.FocusEvent<HTMLInputElement>) => {
        if (modalUser?.id) return;
        const value = e.target.value.trim();
        if (!value) return;

        try {
            await api.post('/users/check-unique/', { field: 'username', value });
            setUsernameError('');
        } catch (err: any) {
            setUsernameError(err.response?.data?.detail || 'Username already exists');
        }
    };

    const checkEmailUnique = async (e: React.FocusEvent<HTMLInputElement>) => {
        if (modalUser?.id) return;
        const value = e.target.value.trim();
        if (!value) return;

        try {
            await api.post('/users/check-unique/', { field: 'email', value });
            setEmailError('');
        } catch (err: any) {
            setEmailError(err.response?.data?.detail || 'Email already exists');
        }
    };

    // New handler (same pattern as username/email)
    const checkPhoneUnique = async (e: React.FocusEvent<HTMLInputElement>) => {
        if (modalUser?.id) return; // skip when editing existing user
        const value = e.target.value.trim();
        if (!value) {
            setPhoneError('');
            return;
        }

        try {
            const res = await api.post('/users/check-unique/', {
                field: 'phone',
                value,
            });

            if (res.data.available) {
                setPhoneError('');
            } else {
                setPhoneError('Phone number already in use');
            }
        } catch (err: any) {
            setPhoneError(err.response?.data?.detail || 'Error checking phone');
        }
    };

    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // ─── Profile Photo Upload Handler ───────────────────────────────────────────
    const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetUserId?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageError(null);
        setUploadingPhoto(true);

        const formData = new FormData();
        formData.append('file', file);

        // If admin is editing another user, send target_user_id
        if (targetUserId && targetUserId !== modalUser?.id) {
            formData.append('target_user_id', targetUserId.toString());
        }

        try {
            const response = await api.post('/upload/profile-picture/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const newPhotoUrl = response.data?.profile_picture_url || response.data?.url;

            if (!newPhotoUrl) {
                throw new Error("No photo URL returned from server");
            }

            // Update modalUser with the new URL
            setModalUser(prev => ({
                ...prev,
                profile_picture_url: newPhotoUrl,
            }));

            toast.success("Profile picture uploaded successfully!");
        } catch (err: any) {
            const errMsg = err.response?.data?.error || 'Failed to upload profile picture';
            setImageError(errMsg);
            toast.error(errMsg);
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    // Usage in component
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await handleProfilePhotoUpload(file);
            console.log("Uploaded:", data.url);
            // Update user profile with new url
        } catch (err) {
            toast.error("Upload failed");
        }
    };

    const [cropImage, setCropImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspectRatio, setAspectRatio] = useState(1); // default square
    // With this (inline type):
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // ─── Handle file selection (input or drag & drop) ────────────────────────────
    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setImageError("Please select an image file");
            toast.error("Invalid file type");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setImageError("File size must be less than 2MB");
            toast.error("File too large");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result as string);
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // ─── Crop & Upload ──────────────────────────────────────────────────────────
    const handleCropComplete = async () => {
        if (!cropImage || !croppedAreaPixels) return;

        setUploadingPhoto(true);
        setUploadProgress(0);

        try {
            const croppedImage = await getCroppedImg(cropImage, croppedAreaPixels);
            const blob = await fetch(croppedImage).then(res => res.blob());
            const croppedFile = new File([blob], "cropped-profile.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append('file', croppedFile);

            const response = await api.post('/api/v1/upload/profile-picture/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
                    setUploadProgress(percent);
                },
            });

            const newPhotoUrl = response.data?.profile_picture_url || response.data?.url;

            if (!newPhotoUrl) {
                throw new Error("No photo URL returned from server");
            }

            setModalUser(prev => ({
                ...prev,
                profile_picture_url: newPhotoUrl,
            }));

            setPreviewUrl(newPhotoUrl);
            toast.success("Profile picture cropped & uploaded!");
        } catch (err: any) {
            const errMsg = err.response?.data?.error || 'Failed to crop/upload photo';
            setImageError(errMsg);
            toast.error(errMsg);
        } finally {
            setUploadingPhoto(false);
            setUploadProgress(0);
            setCropImage(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setAspectRatio(1);
            setCroppedAreaPixels(null);
        }
    };

    // ─── Utility: Crop image to data URL ────────────────────────────────────────
    const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;
                const ctx = canvas.getContext('2d');

                if (!ctx) return reject(new Error("Canvas context not available"));

                ctx.drawImage(
                    image,
                    pixelCrop.x,
                    pixelCrop.y,
                    pixelCrop.width,
                    pixelCrop.height,
                    0,
                    0,
                    pixelCrop.width,
                    pixelCrop.height
                );

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error("Failed to create blob"));
                    resolve(URL.createObjectURL(blob));
                }, 'image/jpeg', 0.85);
            };
            image.onerror = reject;
        });
    };

    // ─── Form Submit Handler ─────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // ─── 1. Early validation (before any loading or API calls) ────────────────
        if (phoneError) {
            toast.error("Please fix the phone number error before submitting");
            return;
        }

        const isNewUser = !modalUser?.id;

        // Password validation
        if (isNewUser) {
            if (!modalUser.new_password) {
                toast.error("Password is required for new users");
                return;
            }
            if (modalUser.new_password !== confirmPassword) {
                setPasswordMismatch(true);
                toast.error("Passwords do not match");
                return;
            }
            if (passwordStrength !== 'Strong') {
                toast.error("Password must be strong before submitting");
                return;
            }
        } else if (modalUser.new_password) {
            // Editing: if new password provided, must match and be strong
            if (modalUser.new_password !== confirmPassword) {
                setPasswordMismatch(true);
                toast.error("Passwords do not match");
                return;
            }
            if (passwordStrength !== 'Strong') {
                toast.error("New password must be strong if changing");
                return;
            }
        }

        // Clear mismatch flag if validation passed
        setPasswordMismatch(false);

        // ─── 2. Start loading ─────────────────────────────────────────────────────
        setLoadingForm(true);

        let photoUrl = modalUser.profile_picture_url;

        try {
            // ─── 2.1: Upload profile photo if a new one was selected ─────────────────
            if (modalUser.new_photo) {
                const formData = new FormData();
                formData.append('file', modalUser.new_photo);

                try {
                    const uploadRes = await api.post('/upload/profile-picture/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });

                    photoUrl = uploadRes.data.url || uploadRes.data.profile_picture_url;
                    toast.success('Profile picture uploaded successfully!');
                } catch (uploadErr: any) {
                    console.error('Photo upload failed:', uploadErr);
                    const errMsg = uploadErr.response?.data?.error || uploadErr.response?.data?.detail || 'Failed to upload profile picture';
                    toast.error(errMsg);
                    // Continue saving user (photo failure is non-critical)
                }
            }

            // ─── 2.2: Prepare clean payload (remove temporary fields) ───────────────
            const userData = {
                ...modalUser,
                first_name: modalUser.first_name?.trim() || "",
                last_name: modalUser.last_name?.trim() || "",
                profile_picture_url: photoUrl,
                company_id: modalUser.company_id || null,
                branch_id: modalUser.branch_id || null,
                password: modalUser.new_password || undefined, // backend hashes it
            };

            // Remove all temporary / non-persisted fields
            delete userData.new_password;
            delete userData.confirmPassword; // if exists in state
            delete userData.new_photo;
            delete userData.full_name; // computed field, don't send

            // ─── 3: API call ─────────────────────────────────────────────────────────
            let response;
            if (modalUser.id) {
                // Update existing user
                response = await api.put(`/users/users/${modalUser.id}/`, userData);
                toast.success('User updated successfully!');
            } else {
                // Create new user
                response = await api.post('/users/users/', userData);
                toast.success('User created successfully!');
            }

            // ─── 4: Success actions ──────────────────────────────────────────────────
            setModalOpen(false);
            fetchData(); // Refresh user list

            // Clear sensitive form state
            setModalUser(prev => ({
                ...prev,
                new_password: undefined,
                profile_picture: undefined,
                new_photo: undefined,
            }));
            setConfirmPassword('');
            setPasswordStrength('');
            setPasswordMismatch(false);

        } catch (err: any) {
            // ─── 5: Detailed error handling ─────────────────────────────────────────
            console.error('User save error:', err);

            let errorMsg = 'Failed to save user. Please try again.';

            if (err.response?.data) {
                const data = err.response.data;

                // Prioritize most useful message
                if (data.detail) {
                    errorMsg = data.detail;
                } else if (data.non_field_errors?.length) {
                    errorMsg = data.non_field_errors[0];
                } else {
                    // Field-specific errors (username taken, email invalid, etc.)
                    const fieldErrors = Object.entries(data)
                        .filter(([key]) => key !== 'detail' && key !== 'non_field_errors')
                        .map(([field, msgs]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
                        .join(' • ');
                    if (fieldErrors) errorMsg = fieldErrors;
                }
            }

            toast.error(errorMsg);
        } finally {
            setLoadingForm(false);
        }
    };

    const isFormValid = () => {
        if (phoneError) return false;
        if (isNewUser && !modalUser.new_password) return false;
        if (modalUser.new_password && passwordStrength !== 'Strong') return false;
        if (modalUser.new_password && modalUser.new_password !== confirmPassword) return false;
        return true;
    };

    useEffect(() => {
        // ─── Safety guard: no company selected ───────────────────────────────────
        if (!modalUser?.company_id) {
            console.log("[BRANCH FETCH] No company selected → clearing branches list");
            setBranches([]);
            setLoadingBranches(false);
            return;
        }

        const companyId = modalUser.company_id;
        console.log(`[BRANCH FETCH] Starting fetch for company ID: ${companyId}`);

        const fetchBranches = async () => {
            setLoadingBranches(true);

            try {
                const url = `/tenants/branches/?company_id=${companyId}`;
                console.log(`[BRANCH FETCH] Request URL: ${url}`);

                const res = await api.get(url);

                // ─── Debug: Show EVERYTHING we received ───────────────────────────────
                console.groupCollapsed(`[BRANCH FETCH] API Response for company ${companyId}`);
                console.log("HTTP Status:", res.status);
                console.log("Full axios response:", res);
                console.log("Raw body (res.data):", res.data);
                console.log("Type of res.data:", typeof res.data);
                console.log("Is direct array?", Array.isArray(res.data));

                if (Array.isArray(res.data)) {
                    console.log("Direct array → length:", res.data.length);
                    if (res.data.length > 0) {
                        console.log("First branch:", res.data[0]);
                    }
                } else if (res.data && typeof res.data === 'object') {
                    console.log("Object received → keys:", Object.keys(res.data));
                    console.log("Contains 'results'?", !!res.data.results);
                    console.log("Contains 'data'?", !!res.data.data);
                    console.log("Contains 'branches'?", !!res.data.branches);
                    console.log("Contains 'items'?", !!res.data.items);
                } else {
                    console.warn("Unexpected response shape:", res.data);
                }
                console.groupEnd();

                // ─── Extract array from any known structure ───────────────────────────
                let branchData = res.data ?? [];

                // Try all common DRF / custom wrapper shapes
                if (!Array.isArray(branchData)) {
                    branchData =
                        res.data?.results ||          // standard DRF pagination
                        res.data?.data ||             // custom { data: [...] }
                        res.data?.branches ||         // { branches: [...] }
                        res.data?.items ||            // { items: [...] }
                        res.data?.objects ||          // rare
                        [];
                }

                // Final safety: force array
                const finalBranches = Array.isArray(branchData) ? branchData : [];

                console.log(`[BRANCH FETCH] Final branches array (length ${finalBranches.length}):`, finalBranches);

                setBranches(finalBranches);

                if (finalBranches.length === 0) {
                    console.warn("[BRANCH FETCH] No branches returned for company", companyId);
                }
            } catch (err: any) {
                console.error("[BRANCH FETCH] Error:", err);
                const msg = err.response?.data?.detail || err.message || "Unknown error";
                toast.error(`Failed to load branches: ${msg}`);
                setBranches([]);
            } finally {
                setLoadingBranches(false);
            }
        };

        fetchBranches();

        // Cleanup (optional but good practice)
        return () => {
            console.log("[BRANCH FETCH] Cleanup for company", companyId);
        };
    }, [modalUser?.company_id]);

    useEffect(() => {
        // Only run when branches load AND modal is open AND no branch selected
        if (!modalUser || branches.length !== 1 || modalUser.branch_id) {
            return;
        }

        // Auto-select the only branch
        setModalUser(prev => ({
            ...prev,
            branch_id: branches[0].id
        }));

        // Optional: toast feedback
        toast.success(`Auto-selected branch: ${branches[0].name}`);
    }, [branches, modalUser]);


    // ─── EXPORTS ────────────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const csvContent =
            "data:text/csv;charset=utf-8," +
            ["ID,Username,Full Name,Email,Phone,Role,Company,Branch,Last Login,Date Joined,Is Online,Is Verified,Is Active"]
                .concat(
                    users.map((u) =>
                        `${u.id},${u.username},${u.full_name},${u.email},${u.phone},${u.role},${u.company},${u.branch},${u.last_login || ''},${u.date_joined},${u.is_online},${u.is_verified},${u.is_active}`
                    )
                )
                .join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.href = encodedUri;
        link.download = "users.csv";
        link.click();
    };

    const handleExportPDF = async () => {
        try {
            const res = await api.get("/users/admin/users/export_pdf/", {
                headers: {
                    Authorization: `Token ${token}`,
                },
                responseType: "blob",
                timeout: 120000, // 2 minutes — safe for your ~7MB file
            });

            // Quick debug logs (remove after confirmation)
            console.log('Export Status:', res.status);
            console.log('Content-Type:', res.headers['content-type'] || 'unknown');
            console.log('File Size:', res.headers['content-length'] || 'unknown', 'bytes');

            const contentType = (res.headers['content-type'] || '').toLowerCase();

            // === CRITICAL: If PDF → download immediately (skip .text() forever) ===
            if (contentType.includes('application/pdf')) {
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `high_prosper_users_${new Date().toISOString().split('T')[0]}.pdf`);
                document.body.appendChild(link);
                link.click();

                // Cleanup
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                toast.success('PDF downloaded successfully!');
                return; // ← Success - exit function here!
            }

            // Only reach here if NOT PDF (error response)
            let errorDetail = 'Server returned unexpected format';

            try {
                const text = await res.data.text();
                try {
                    const json = JSON.parse(text);
                    errorDetail = json.detail || json.message || json.error || text;
                } catch {
                    errorDetail = text.slice(0, 300) || errorDetail;
                }
            } catch {
                // silent fail - probably binary, but we already checked type
            }

            throw new Error(errorDetail);

        } catch (err) {
            console.error('PDF Export Failed:', err);

            let msg = 'Failed to download PDF. Please try again.';

            if (err.message.includes('timeout')) {
                msg = 'Export timed out - report may be large';
            } else if (axios.isAxiosError(err)) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    msg = 'Authentication error - please log in again';
                } else if (err.response?.status === 500) {
                    msg = 'Server error - check backend logs';
                } else if (err.response) {
                    msg = `Server error (${err.response.status})`;
                } else if (err.request) {
                    msg = 'No response from server - check connection';
                }
            }

            toast.error(msg, { duration: 6000 });
        }
    };

    const handleExportExcel = async () => {
        try {
            const res = await api.get("/users/admin/users/export_excel/", {
                headers: {Authorization: `Token ${token}`},
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "users.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Excel exported!");
        } catch (err) {
            toast.error("Failed to export Excel!");
        }
    };

    // ---------------- DELETE USER ----------------
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`users/admin/users/${id}/`, {
                headers: {Authorization: `Token ${token}`},
            });
            setUsers(users.filter((u) => u.id !== id));
            toast.success("User deleted successfully!");
            fetchData(); // Refresh analytics
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete user!");
        }
    };

    // ─── Search & Filter ──────────────────────────────────────────────────────

    useEffect(() => {
        let result = [...users];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.username.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.full_name?.toLowerCase().includes(term)
            );
        }

        if (filterRole) {
            result = result.filter(u => u.role === filterRole);
        }

        setFilteredUsers(result);
        setCurrentPage(1);
    }, [searchTerm, filterRole, users]);

    // ─── PAGINATION ─────────────────────────────────────────────────────────────
    // Safe access – treat non-array as empty array
    const safeFilteredUsers = Array.isArray(filteredUsers) ? filteredUsers : [];

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = safeFilteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(safeFilteredUsers.length / usersPerPage);



    const RoleTrendChart = ({
                                data,
                                viewMode = 'absolute',
                                showComparison = false,
                                selectedRole = null,
                            }: RoleTrendChartProps) => {
        // Extract all unique roles from the dataset
        const allRoles = Array.from(
            new Set(
                data.flatMap(item =>
                    Object.keys(item).filter(key => key !== 'month' && typeof item[key] === 'number')
                )
            )
        ).sort();

        // Filter to visible roles (either selected one or all)
        const visibleRoles = selectedRole && allRoles.includes(selectedRole)
            ? [selectedRole]
            : allRoles;

        // Color mapping for roles (expand as needed)
        const roleColors: Record<string, string> = {
            admin: '#3B82F6',         // blue
            manager: '#10B981',       // green
            collector: '#F59E0B',     // amber
            driver: '#EF4444',        // red
            supervisor: '#8B5CF6',    // violet
            hr: '#EC4899',            // pink
            ceo: '#6366F1',           // indigo
            account: '#14B8A6',       // teal
            manpower: '#F97316',      // orange
            unknown: '#6B7280',       // gray
        };

        // Prepare chart data
        const chartData = data.map((item) => {
            const month = item.month;

            // Calculate total users in this month (only visible roles)
            const total = visibleRoles.reduce((sum, role) => sum + (Number(item[role]) || 0), 0);

            // Absolute or percentage values
            const values = visibleRoles.reduce((acc, role) => {
                const count = Number(item[role]) || 0;
                acc[role] = viewMode === 'percentage' && total > 0 ? (count / total) * 100 : count;
                return acc;
            }, {} as Record<string, number>);

            return {
                month,
                ...values,
                total,
            };
        });

        // Then filter chartData:
        const filteredData = brushRange.startIndex !== undefined && brushRange.endIndex !== undefined
            ? chartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
            : chartData;

        // Helper: Calculate the highest month-to-month growth percentage
        // Remove the one inside RoleTrendChart
        // Keep and fix this one:
        const getPeakGrowth = () => {
            if (!analytics?.role_trend?.length || analytics.role_trend.length < 2) {
                return { growth: "0.0", month: "N/A" };
            }
            let maxGrowth = -Infinity;
            let peakMonth = "N/A";
            for (let i = 1; i < analytics.role_trend.length; i++) {
                const prevItem = analytics.role_trend[i - 1];
                const currItem = analytics.role_trend[i];
                // Sum only the roles that exist in both months (safer)
                const prevTotal = allRoles.reduce((sum, role) => {
                    return sum + (Number(prevItem[role]) || 0);
                }, 0);
                const currTotal = allRoles.reduce((sum, role) => { // FIX: "suma" -> "sum"
                    return sum + (Number(currItem[role]) || 0);
                }, 0);
                // Avoid division by zero
                const growth = prevTotal === 0 ? 0 : ((currTotal - prevTotal) / prevTotal) * 100;
                if (growth > maxGrowth) {
                    maxGrowth = growth;
                    peakMonth = currItem.month; // growth is attributed to the month it reached
                }
            }
            return {
                growth: maxGrowth.toFixed(1),
                month: peakMonth,
            };
        };

        // Helper: Find the month with the highest total number of users
        const getPeakMonth = () => {
            if (!analytics?.role_trend?.length) {
                return "N/A";
            }

            let maxTotal = -Infinity;
            let peakMonth = analytics.role_trend[0].month;

            analytics.role_trend.forEach(item => {
                const total = allRoles.reduce((sum, role) => sum + (item[role] || 0), 0);

                if (total > maxTotal) {
                    maxTotal = total;
                    peakMonth = item.month;
                }
            });

            return peakMonth;
        };

        // Prepare previous period comparison data (shifted by 12 months)
        const comparisonData = showComparison
            ? chartData.map((item, index) => {
                const prevIndex = Math.max(0, index - 12);
                const prevItem = data[prevIndex] || {};

                return {
                    month: item.month,
                    ...visibleRoles.reduce((acc, role) => {
                        acc[`prev_${role}`] = Number(prevItem[role]) || 0;
                        return acc;
                    }, {} as Record<string, number>),
                };
            })
            : [];

        // If no data → show placeholder
        if (chartData.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No role trend data available
                </div>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    stackOffset={viewMode === 'percentage' ? 'expand' : 'none'}
                >
                    {/* Gradient fills */}
                    <defs>
                        {visibleRoles.map((role) => (
                            <linearGradient key={role} id={`fill-${role}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={roleColors[role] || '#6B7280'} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={roleColors[role] || '#6B7280'} stopOpacity={0.1} />
                            </linearGradient>
                        ))}
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="month"
                        stroke="#9CA3AF"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tickFormatter={(value) => (viewMode === 'percentage' ? `${value}%` : value)}
                        stroke="#9CA3AF"
                    />

                    <Tooltip
                        contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                        labelStyle={{ color: "#F3F4F6" }}
                        formatter={(value: number, name: string) => [
                            viewMode === 'percentage' ? `${value.toFixed(1)}%` : value.toLocaleString(),
                            name,
                        ]}
                    />

                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} />

                    {/* Current period stacked areas */}
                    {visibleRoles.map((role) => (
                        <Area
                            key={role}
                            type="monotone"
                            dataKey={role}
                            name={role.charAt(0).toUpperCase() + role.slice(1)}
                            stackId="1"
                            stroke={roleColors[role] || '#6B7280'}
                            fill={`url(#fill-${role})`}
                            fillOpacity={0.7}
                            strokeWidth={2}
                        />
                    ))}

                    {/* Previous period comparison lines (dashed) */}
                    {showComparison &&
                        visibleRoles.map((role) => (
                            <Line
                                key={`prev-${role}`}
                                type="monotone"
                                dataKey={`prev_${role}`}
                                name={`${role.charAt(0).toUpperCase() + role.slice(1)} (Prev)`}
                                stroke={roleColors[role] || '#6B7280'}
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    const HeatmapChart: React.FC<HeatmapChartProps> = ({
                                                           data = [],
                                                           selectedDays = [],
                                                           dragStartDay = null,
                                                           hoveredDay = null,
                                                           isDragging = false,
                                                           onDayClick,
                                                           onDayHover,
                                                       }) => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Compute chartData once — before any JSX
        const chartData = days.map((dayName, dayIndex) => {
            const dayNum = dayIndex + 1;
            return {
                day: dayName,
                dayNum,
                isSelected: selectedDays.includes(dayNum),
                ...hours.reduce((acc: Record<string, number>, hour) => {
                    const point = data.find((d) => d.day === dayNum && d.hour === hour);
                    acc[`h${hour}`] = point ? point.value : 0;
                    return acc;
                }, {}),
            };
        });

        // Drag range check (used in highlight rectangles)
        const isInRange = (dayNum: number): boolean =>
            dragStartDay !== null &&
            isDragging &&
            dayNum >= Math.min(dragStartDay, hoveredDay ?? 0) &&
            dayNum <= Math.max(dragStartDay, hoveredDay ?? 0);

        // Color scale (green intensity based on value)
        const getColor = (value: number): string => {
            if (value === 0) return '#1f2937';       // dark gray (no activity)
            if (value < 10) return '#bbf7d0';        // very light green
            if (value < 30) return '#86efac';
            if (value < 60) return '#4ade80';
            if (value < 100) return '#22c55e';
            return '#15803d';                        // dark green (high activity)
        };

        return (
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
                >
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="day"
                        width={60}
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        onClick={(e: any) => {
                            const dayIndex = days.indexOf(e.value);
                            if (dayIndex !== -1) {
                                const dayNum = dayIndex + 1;
                                const isMulti = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
                                onDayClick(dayNum, isMulti);
                            }
                        }}
                        cursor="pointer"
                    />

                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                        content={({ active, payload }) => {
                            if (active && payload?.length) {
                                const entry = payload[0];
                                const hour = entry.name?.replace('h', '') ?? '';
                                return (
                                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                                        <p className="font-medium">{hour}:00 – {entry.value} activities</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Main heatmap cells */}
                    {hours.map((hour) => (
                        <Rectangle
                            key={`h${hour}`}
                            dataKey={`h${hour}`}
                            fill={(entry: any) => getColor(entry[`h${hour}`])}
                            stroke="rgba(255,255,255,0.05)"
                            width={40}
                            height={40}
                            radius={6}
                        />
                    ))}

                    {/* Highlight selected days + drag range */}
                    {chartData.map((entry) => {
                        const isHighlighted =
                            entry.isSelected ||
                            (isInRange(entry.dayNum) && isDragging);

                        if (!isHighlighted) return null;

                        return (
                            <Rectangle
                                key={`highlight-${entry.dayNum}`}
                                y={entry.day}
                                height={40}
                                width="100%"
                                fill={
                                    isInRange(entry.dayNum) && isDragging
                                        ? 'rgba(59, 130, 246, 0.25)'
                                        : 'rgba(59, 130, 246, 0.15)'
                                }
                                stroke={
                                    isInRange(entry.dayNum) && isDragging
                                        ? '#3b82f6'
                                        : 'rgba(59, 130, 246, 0.4)'
                                }
                                strokeWidth={isInRange(entry.dayNum) && isDragging ? 2 : 1}
                                radius={6}
                            />
                        );
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        );
    };

    // Helper: Get the highest month-to-month growth percentage + the month it occurred
    const getPeakGrowth = () => {
        if (!analytics?.role_trend?.length || analytics.role_trend.length < 2) {
            return { growth: "0.0", month: "N/A" };
        }

        let maxGrowth = -Infinity;
        let peakMonth = "N/A";

        for (let i = 1; i < analytics.role_trend.length; i++) {
            const prevItem = analytics.role_trend[i - 1];
            const currItem = analytics.role_trend[i];

            // Sum only the roles that exist in both months (safer)
            const prevTotal = allRoles.reduce((sum, role) => {
                return sum + (Number(prevItem[role]) || 0);
            }, 0);

            const currTotal = allRoles.reduce((sum, role) => {
                return sum + (Number(currItem[role]) || 0);
            }, 0);

            // Avoid division by zero
            const growth = prevTotal === 0 ? 0 : ((currTotal - prevTotal) / prevTotal) * 100;

            if (growth > maxGrowth) {
                maxGrowth = growth;
                peakMonth = currItem.month; // growth is attributed to the month it reached
            }
        }

        return {
            growth: maxGrowth.toFixed(1),
            month: peakMonth,
        };
    };

    // Helper: Find the month with the highest total number of users across all roles
    const getPeakMonth = () => {
        if (!analytics?.role_trend?.length) {
            return "N/A";
        }

        let maxTotal = -Infinity;
        let peakMonth = analytics.role_trend[0].month;

        analytics.role_trend.forEach(item => {
            const total = allRoles.reduce((sum, role) => {
                return sum + (Number(item[role]) || 0);
            }, 0);

            if (total > maxTotal) {
                maxTotal = total;
                peakMonth = item.month;
            }
        });

        return peakMonth;
    };

    // State for chart ref (for PNG export)
    const chartRef = useRef<HTMLDivElement>(null);

    // Helper: Get latest role ranking
    const getRoleRanking = (trendData: any[]) => {
        if (!trendData.length) return [];
        const latest = trendData[trendData.length - 1];
        const total = Object.values(latest).reduce((sum: number, v: any) => sum + (typeof v === 'number' ? v : 0), 0);

        return Object.entries(latest)
            .filter(([key]) => key !== 'month')
            .map(([role, current]) => {
                const first = trendData[0]?.[role] || 0;
                const growth = first === 0 ? 0 : Math.round(((current as number) - first) / first * 100);
                return {
                    role,
                    current: current as number,
                    growth,
                    percentage: total > 0 ? ((current as number) / total) * 100 : 0,
                };
            })
            .sort((a, b) => b.current - a.current);
    };

    // ─── Exports ──────────────────────────────────────────────────────────────

    // ─── Dynamic PDF Exporter ────────────────────────────────────────────────
    const Html2PdfWrapper = dynamic(() => import('html2pdf.js'), {
        ssr: false,
        loading: () => null, // or a small spinner
    });

    // Then in your export function:
    const exportDashboardAsPDF = async () => {
        if (typeof window === 'undefined' || !trendChartRef.current) {
            toast.error("Cannot export on server or chart not ready");
            return;
        }

        try {
            setExportingPDF(true);

            const html2pdf = (await Html2PdfWrapper).default; // ← access default export

            const element = trendChartRef.current;
            const opt = {
                margin: 0.5,
                filename: `dashboard_${dayjs().format('YYYY-MM-DD')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, logging: false, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
            };

            await html2pdf().from(element).set(opt).save();
            toast.success('Dashboard exported as PDF');
        } catch (err) {
            console.error('PDF export failed:', err);
            toast.error('Failed to export PDF');
        } finally {
            setExportingPDF(false);
        }
    };

    // ─── Export Helpers ─────────────────────────────────────────────────────────

// 1. Export Role Trend as CSV (improved version)
    const exportTrendAsCSV = () => {
        if (!analytics?.role_trend?.length) {
            toast.error("No role trend data available to export");
            return;
        }

        try {
            // Get all unique roles from the data
            const allRoles = Array.from(
                new Set(
                    analytics.role_trend.flatMap(item =>
                        Object.keys(item).filter(key => key !== 'month')
                    )
                )
            ).sort();

            const headers = ['Month', ...allRoles];

            const rows = analytics.role_trend.map(item => [
                item.month,
                ...allRoles.map(role => item[role] ?? 0)
            ]);

            // Add UTF-8 BOM for better Excel compatibility
            const BOM = '\uFEFF';
            const csvContent = BOM + [
                headers.join(','),
                ...rows.map(row => row.map(val => `"${val}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `role_trend_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Role trend data exported as CSV", { duration: 4000 });
        } catch (err) {
            console.error("CSV export failed:", err);
            toast.error("Failed to export CSV");
        }
    };

    // 2. Export any chart (or DOM element) as PNG using html2canvas
    const exportChartAsPNG = async (chartId: string, fileNamePrefix = "chart") => {
        const element = document.getElementById(chartId);

        if (!element) {
            toast.error("Chart element not found");
            console.warn(`No element found with id: ${chartId}`);
            return;
        }

        try {
            toast.loading("Generating PNG...", { id: "png-export" });

            // Dynamically import html2canvas only when needed
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(element, {
                scale: 2,                    // Higher quality
                useCORS: true,               // Allow cross-origin images
                logging: false,
                backgroundColor: null,       // Transparent background
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const dataUrl = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();

            toast.dismiss("png-export");
            toast.success("Chart exported as PNG");
        } catch (err) {
            console.error("PNG export failed:", err);
            toast.dismiss("png-export");
            toast.error("Failed to export chart as PNG");
        }
    };

    // Add global mouse up handler to stop drag if mouse leaves chart
    useEffect(() => {
        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragStartDay(null);
            }
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isDragging]);


    const HourlyZoomChart = ({ data }: { data: HeatmapDataPoint[] }) => {
        const hourCounts = new Map<number, { sum: number; count: number }>();

        data.forEach(d => {
            if (!hourCounts.has(d.hour)) {
                hourCounts.set(d.hour, { sum: 0, count: 0 });
            }
            const entry = hourCounts.get(d.hour)!;
            entry.sum += d.value;
            entry.count += 1;
        });

        const averagedData = Array.from(hourCounts.entries()).map(([hour, { sum, count }]) => ({
            hour,
            value: count > 0 ? Math.round(sum / count) : 0,
        })).sort((a, b) => a.hour - b.hour);

        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={averagedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" label={{ value: "Hour of Day", position: "bottom" }} stroke="#9CA3AF" />
                    <YAxis label={{ value: "Average Activity per Day", angle: -90, position: "insideLeft" }} stroke="#9CA3AF" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} />
                    <Bar
                        dataKey="value"
                        fill="#fbbf24"
                        radius={[4, 4, 0, 0]}
                        name="Avg Activity"
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    const MultiDayLineZoomChart = ({ data }: { data: HeatmapDataPoint[] }) => {
        // Group by day
        const daysData = selectedDays.map(day => {
            const dayData = hours.map(hour => {
                const point = data.find(d => d.day === day && d.hour === hour);
                return { hour, value: point ? point.value : 0 };
            });
            return { day, data: dayData };
        });

        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" label={{ value: "Hour of Day", position: "bottom" }} stroke="#9CA3AF" />
                    <YAxis label={{ value: "Activity Count", angle: -90, position: "insideLeft" }} stroke="#9CA3AF" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} />
                    <Legend />

                    {daysData.map(({ day, data: dayData }, index) => (
                        <Line
                            key={day}
                            type="monotone"
                            data={dayData}
                            dataKey="value"
                            name={days[day - 1]}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // Filter data by selected time range
    const filterDataByTimeRange = (data: HeatmapDataPoint[], [start, end]: [number, number]) => {
        return data.filter(d => d.hour >= start && d.hour <= end);
    };

// Mock previous week data (replace with real backend data if available)
    const getPreviousWeekData = () => {
        // For demo: shift current data back by 7 days (you can fetch real previous data from backend)
        return analytics?.activity_heatmap?.map(point => ({
            ...point,
            day: ((point.day - 1 - 7 + 7) % 7) + 1, // shift days back
        })) || [];
    };

// Multi-week comparison chart
    const MultiWeekComparisonChart = ({ currentData, previousData }: {
        currentData: HeatmapDataPoint[];
        previousData: HeatmapDataPoint[]
    }) => {
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const chartData = hours.map(hour => {
            const current = currentData.filter(d => d.hour === hour).reduce((sum, d) => sum + d.value, 0);
            const previous = previousData.filter(d => d.hour === hour).reduce((sum, d) => sum + d.value, 0);
            return {
                hour,
                current,
                previous,
                difference: current - previous,
            };
        });

        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" label={{ value: "Hour of Day", position: "bottom" }} stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="current" stroke="#3B82F6" name="Current Week" strokeWidth={2} />
                    <Line type="monotone" dataKey="previous" stroke="#F59E0B" name="Previous Week" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        );
    };




    // ──────────────────────────────────────────────────────────────
    //  RENDER
    // ──────────────────────────────────────────────────────────────

    if (loading) return <Loader/>;

    if (error) return <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>;


        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                {/* Header */}
                <header className="bg-white dark:bg-gray-900 shadow-sm p-6 sticky top-0 z-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/dashboard/admin")}
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 transition"
                            >
                                <ArrowLeftIcon className="w-6 h-6"/>
                                Back
                            </button>
                            <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => openModal()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5"/>
                                Add User
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5"/>
                                CSV
                            </button>



                            <Button
                                type="primary"
                                loading={exporting || undefined}
                                onClick={() => {
                                    setExporting(true);
                                    handleExportPDF().finally(() => setExporting(false));
                                }}
                            >
                                {exporting ? 'Exporting PDF...' : 'Export PDF'}
                            </Button>

                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                            >
                                <DocumentIcon className="w-5 h-5"/>
                                Excel
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="p-6 max-w-7xl mx-auto space-y-8">
                    {/* Summary Cards */}
                    <motion.section
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.6}}
                    >
                        <SummaryCard
                            title="Total Users"
                            value={analytics?.total_users ?? 0}
                            icon={<UsersIcon className="w-8 h-8 text-blue-600"/>}
                            color="blue"
                        />
                        <SummaryCard
                            title="Online Users"
                            value={analytics?.total_online ?? 0}
                            icon={<CheckCircleIcon className="w-8 h-8 text-green-600"/>}
                            color="green"
                        />
                        <SummaryCard
                            title="New Today"
                            value={analytics?.new_users_today ?? 0}
                            icon={<UserPlusIcon className="w-8 h-8 text-purple-600"/>}
                            color="purple"
                        />
                        <SummaryCard
                            title="Performance"
                            value={`${analytics?.performance_percentage ?? 0}%`}
                            icon={<ChartBarIcon className="w-8 h-8 text-indigo-600"/>}
                            color="indigo"
                        />
                    </motion.section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                        {/* 1. User Growth – Monthly registrations (Line + Area) */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg col-span-1 lg:col-span-2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <ChartBarIcon className="w-6 h-6 text-blue-600" />
                                    User Growth (Monthly Registrations)
                                </h3>
                                <button
                                    onClick={() => exportChartAsPNG("user-growth")}
                                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    PNG
                                </button>
                            </div>

                            <ResponsiveContainer width="100%" height={340}>
                                <AreaChart
                                    data={analytics?.monthly_growth || []}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F3F4F6" }}
                                        labelStyle={{ color: "#F3F4F6" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="registrations"
                                        stroke="#3B82F6"
                                        fillOpacity={1}
                                        fill="url(#colorRegistrations)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* 2. Role Distribution – Pie Chart */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <UsersIcon className="w-6 h-6 text-purple-600" />
                                Users by Role
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={Object.entries(analytics?.users_by_role || {}).map(([role, count]) => ({
                                            name: role.charAt(0).toUpperCase() + role.slice(1),
                                            value: count as number,
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : null}
                                        labelLine={false}
                                    >
                                        {Object.keys(analytics?.users_by_role || {}).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                                    />
                                    <Legend layout="horizontal" verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* 6. Role Trend Over Time - Enhanced with Annotations + CSV + PDF Export */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg col-span-1 lg:col-span-2 xl:col-span-3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            ref={trendChartRef} // for PDF export
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 flex-wrap">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <UsersIcon className="w-6 h-6 text-indigo-600" />
                                    Role Trend Over Time
                                </h3>

                                <div className="flex flex-wrap gap-3 items-center">
                                    {/* View Mode */}
                                    <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
                                        <button
                                            onClick={() => setRoleViewMode('absolute')}
                                            className={`px-4 py-2 text-sm font-medium ${
                                                roleViewMode === 'absolute' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                                            }`}
                                        >
                                            Counts
                                        </button>
                                        <button
                                            onClick={() => setRoleViewMode('percentage')}
                                            className={`px-4 py-2 text-sm font-medium ${
                                                roleViewMode === 'percentage' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                                            }`}
                                        >
                                            Percentage
                                        </button>
                                    </div>

                                    {/* Comparison */}
                                    <button
                                        onClick={() => setShowComparison(prev => !prev)}
                                        className={`px-4 py-2 rounded text-sm font-medium ${
                                            showComparison ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                    >
                                        {showComparison ? 'Hide Prev' : 'Compare Prev 12m'}
                                    </button>

                                    {/* Role Filter */}
                                    <select
                                        value={selectedRoleFilter || ''}
                                        onChange={(e) => setSelectedRoleFilter(e.target.value || null)}
                                        className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-indigo-500"
                                    >
                                        <option value="">All Roles</option>
                                        {allRoles.map(role => (
                                            <option key={role} value={role}>
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Export Buttons */}
                                    <button
                                        onClick={exportTrendAsCSV}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm font-medium flex items-center gap-2"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        CSV Trend
                                    </button>
                                    <button
                                        onClick={exportDashboardAsPDF}
                                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-sm font-medium flex items-center gap-2"
                                        disabled={exportingPDF}
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        {exportingPDF ? 'Exporting PDF...' : 'Export Dashboard PDF'}
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-[520px] w-full" ref={trendChartRef}>
                                {analytics?.role_trend?.length ? (
                                    <RoleTrendChart
                                        data={analytics.role_trend}
                                        viewMode={roleViewMode}
                                        showComparison={showComparison}
                                        selectedRole={selectedRoleFilter}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        No role trend data available yet
                                    </div>
                                )}

                                {/* Brush for interactive zoom */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-100 dark:bg-gray-800 rounded-b-xl">
                                    <ResponsiveContainer width="100%" height={60}>
                                        <Brush
                                            dataKey="month"
                                            height={30}
                                            stroke="#8884d8"
                                            fill="#8884d8"
                                            fillOpacity={0.3}
                                            onChange={({ startIndex, endIndex }) => {
                                                setBrushRange({ startIndex, endIndex });
                                            }}
                                        />
                                    </ResponsiveContainer>
                                </div>

                                {/* Annotations (example: peak growth marker) */}
                                {analytics?.role_trend?.length > 1 && (
                                    <div className="absolute top-4 right-4 bg-indigo-100 dark:bg-indigo-900/40 px-4 py-2 rounded-lg text-sm font-medium text-indigo-800 dark:text-indigo-300 shadow-sm">
                                        Peak Growth: +{getPeakGrowthInfo().growth}% in {getPeakGrowthInfo().month}
                                    </div>
                                )}
                            </div>

                            {/* Role Ranking Table */}
                            {analytics?.role_trend?.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-lg font-semibold mb-3">Current Role Ranking</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Users</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Growth (Last 12m)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">% of Total</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {getRoleRanking(analytics.role_trend).map((ranked, index) => (
                                                <tr key={ranked.role} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{index + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize">{ranked.role}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{ranked.current}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={ranked.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {ranked.growth >= 0 ? '+' : ''}{ranked.growth}%
                  </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                        {ranked.percentage.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* 3. Status Breakdown – Donut */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                Status Breakdown
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Active', value: analytics?.status_breakdown?.active || 0 },
                                            { name: 'Inactive', value: analytics?.status_breakdown?.inactive || 0 },
                                            { name: 'Online', value: analytics?.total_online || 0 },
                                            { name: 'Verified', value: analytics?.status_breakdown?.verified || 0 },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) => percent > 0.08 ? `${name} (${(percent * 100).toFixed(0)}%)` : null}
                                    >
                                        <Cell fill="#10B981" />
                                        <Cell fill="#EF4444" />
                                        <Cell fill="#3B82F6" />
                                        <Cell fill="#8B5CF6" />
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* 4. Online vs Offline – Simple Bar */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <ClockIcon className="w-6 h-6 text-indigo-600" />
                                Online vs Offline
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={[
                                        {
                                            name: 'Now',
                                            Online: analytics?.total_online || 0,
                                            Offline: analytics?.total_offline || 0,
                                        }
                                    ]}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                                    <Legend />
                                    <Bar dataKey="Online" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Offline" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* 5. Activity Heatmap (Day vs Hour) with Hourly Zoom */}
                        <motion.div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg col-span-1 lg:col-span-2 xl:col-span-3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <ClockIcon className="w-6 h-6 text-amber-600" />
                                User Activity Heatmap (Day vs Hour)
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-auto">
      {selectedDays.length > 0 && `(${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected)`}
    </span>
                            </h3>

                            <div className="relative h-[420px] w-full">
                                {analytics?.activity_heatmap?.length ? (
                                    <HeatmapChart
                                        data={analytics.activity_heatmap}
                                        onDayClick={(day, isMulti) => {
                                            if (isMulti) {
                                                // Ctrl/Cmd + click → toggle multi-select
                                                setSelectedDays(prev =>
                                                    prev.includes(day)
                                                        ? prev.filter(d => d !== day)
                                                        : [...prev, day]
                                                );
                                            } else {
                                                // Normal click → zoom into single day
                                                setZoomedDay(day);
                                                setSelectedDays([day]); // auto-select the clicked day
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        No activity data available yet (users need to log in)
                                    </div>
                                )}
                            </div>

                            {/* Multi-select hint */}
                            {analytics?.activity_heatmap?.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                                    Click a day to zoom • Hold Ctrl/Cmd + click to select multiple days
                                </p>
                            )}
                        </motion.div>

                        {/* Zoom Modal - Hourly view for selected day */}
                        {selectedDays.length > 0 && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                                    onClick={() => {
                                        setSelectedDays([]);
                                        setZoomedDay(null);
                                        setTimeRange([0, 23]);
                                        setCompareWeek('current');
                                        setShowDifference(false);
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0.85, y: 50 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.85, y: 50 }}
                                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-6">
                                            {/* Header */}
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-2xl font-bold">
                                                    Hourly Activity — {selectedDays.map(d => days[d-1]).join(', ')}
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDays([]);
                                                            setZoomedDay(null);
                                                            setTimeRange([0, 23]);
                                                            setCompareWeek('current');
                                                            setShowDifference(false);
                                                        }}
                                                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                    >
                                                        <XMarkIcon className="w-8 h-8" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex flex-col sm:flex-row gap-6 mb-6">
                                                {/* Time Range Slider */}
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium mb-2">
                                                        Time Range: {timeRange[0]}:00 – {timeRange[1]}:00
                                                    </label>
                                                    <div className="flex gap-4 items-center">
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={23}
                                                            value={timeRange[0]}
                                                            onChange={(e) => setTimeRange([Number(e.target.value), timeRange[1]])}
                                                            className="w-full accent-blue-600"
                                                        />
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={23}
                                                            value={timeRange[1]}
                                                            onChange={(e) => setTimeRange([timeRange[0], Number(e.target.value)])}
                                                            className="w-full accent-blue-600"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Week Comparison Toggle */}
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Compare</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setCompareWeek('current')}
                                                            className={`px-4 py-2 rounded text-sm ${
                                                                compareWeek === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            Current Week
                                                        </button>
                                                        <button
                                                            onClick={() => setCompareWeek('previous')}
                                                            className={`px-4 py-2 rounded text-sm ${
                                                                compareWeek === 'previous' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            Previous Week
                                                        </button>
                                                        <button
                                                            onClick={() => setCompareWeek('both')}
                                                            className={`px-4 py-2 rounded text-sm ${
                                                                compareWeek === 'both' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            Both
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Chart Area */}
                                            <div className="h-[420px] w-full">
                                                {compareWeek === 'both' ? (
                                                    <MultiWeekComparisonChart
                                                        currentData={filterDataByTimeRange(analytics.activity_heatmap, timeRange)}
                                                        previousData={filterDataByTimeRange(getPreviousWeekData(), timeRange)}
                                                    />
                                                ) : (
                                                    <HourlyZoomChart
                                                        data={filterDataByTimeRange(
                                                            analytics.activity_heatmap.filter(d => selectedDays.includes(d.day)),
                                                            timeRange
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        )}

                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search by username, email, or full name..."
                            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="ceo">CEO</option>
                            <option value="hr">HR</option>
                            <option value="account">Accounting</option>
                            <option value="manager">Manager</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="collector">Collector</option>
                            <option value="driver">Driver</option>
                            <option value="manpower">Manpower</option>
                        </select>
                    </div>

                    {/* Users Table */}
                    <div
                        className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">ID</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Profile</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Username</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Full
                                    Name
                                </th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Email</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Phone</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Role</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Company</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Branch</th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Last
                                    Login
                                </th>
                                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Joined</th>
                                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Online</th>
                                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Verified</th>
                                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Active</th>
                                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                            {!Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={15}
                                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {loading ? "Loading users..." : "No users found matching your filters."}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers
                                    .slice(indexOfFirstUser, indexOfLastUser)
                                    .map((u, index) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{opacity: 0, y: 20}}
                                            animate={{opacity: 1, y: 0}}
                                            transition={{duration: 0.4, delay: index * 0.05}}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{u.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div
                                                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <Image
                                                        src={u.profile_picture_url || "/static/images/avatar-placeholder.png"}
                                                        alt={u.full_name || u.username}
                                                        width={40}
                                                        height={40}
                                                        className="object-cover"
                                                        unoptimized // if images are from different domain
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{u.username}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{u.full_name || "—"}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{u.email}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{u.phone || "—"}</td>
                                            <td className="px-6 py-4 capitalize text-gray-900 dark:text-gray-100">{u.role}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                                                {u.company_id ? (
                                                    companies.find(c => c.id === u.company_id)?.name ||
                                                    u.company_name ||          // fallback if API returns denormalized name
                                                    "Loading company..."       // or "—" if you prefer
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                {u.branch_id && u.company_id ? (
                                                    branches.find(b => b.id === u.branch_id)?.name ||
                                                    u.branch_name ||           // fallback if API returns denormalized name
                                                    "Loading branch..."        // or "—" if you prefer
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                {u.last_login ? dayjs(u.last_login).format("MMM D, YYYY h:mm A") : "Never"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                {dayjs(u.date_joined).format("MMM D, YYYY")}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {u.is_online ? (
                                                    <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto"
                                                                     title="Online"/>
                                                ) : (
                                                    <XCircleIcon className="w-6 h-6 text-red-500 mx-auto"
                                                                 title="Offline"/>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {u.is_verified ? (
                                                    <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto"
                                                                     title="Verified"/>
                                                ) : (
                                                    <XCircleIcon className="w-6 h-6 text-red-500 mx-auto"
                                                                 title="Not Verified"/>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {u.is_active ? (
                                                    <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto"
                                                                     title="Active"/>
                                                ) : (
                                                    <XCircleIcon className="w-6 h-6 text-red-500 mx-auto"
                                                                 title="Inactive/Blocked"/>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-3">
                                                <button
                                                    onClick={() => openModal(u)}
                                                    className="text-blue-600 hover:text-blue-800 transition p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                    title="Edit User"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5"/>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="text-red-600 hover:text-red-800 transition p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    title="Delete User"
                                                >
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-3 mt-8">
                            {Array.from({length: totalPages}, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => paginate(i + 1)}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentPage === i + 1
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border"
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </main>

                {/* Modal - Add/Edit User */}
                {modalOpen && modalUser && (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 50 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 50 }}
                                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold">
                                            {modalUser.id ? "Edit User" : "Create New User"}
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setModalOpen(false);
                                                setPasswordStrength('');
                                                setPasswordMismatch(false);
                                                setConfirmPassword('');
                                                setPreviewUrl(null);
                                                setImageError('');
                                            }}
                                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            <XMarkIcon className="w-8 h-8" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* ─── Profile Picture Upload Section ─────────────────────────────────────── */}
                                        <div className="flex flex-col items-center space-y-6">
                                            {/* Preview Container */}
                                            <div className="relative mx-auto group">
                                                {/* Circular Preview with Drag & Drop */}
                                                <div
                                                    className={`
        w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden
        border-4 border-indigo-500 dark:border-indigo-400
        shadow-2xl transition-all duration-300
        group-hover:shadow-3xl group-hover:border-indigo-600
        ${dragActive ? 'border-4 border-dashed border-indigo-600 scale-105' : ''}
      `}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setDragActive(true);
                                                    }}
                                                    onDragLeave={() => setDragActive(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setDragActive(false);
                                                        const droppedFile = e.dataTransfer.files[0];
                                                        if (droppedFile) handleFileSelect(droppedFile);
                                                    }}
                                                >
                                                    <Image
                                                        src={previewUrl || modalUser.profile_picture_url || "/images/avatar-placeholder.png"}
                                                        alt="Profile picture preview"
                                                        width={192}
                                                        height={192}
                                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                                                        priority
                                                        unoptimized={previewUrl?.startsWith('data:')}
                                                    />
                                                </div>

                                                {/* Upload Button */}
                                                <label
                                                    htmlFor="profile-photo-upload"
                                                    className={`
        absolute -bottom-2 -right-2 z-10
        w-14 h-14 flex items-center justify-center
        bg-gradient-to-br from-indigo-600 to-purple-600
        hover:from-indigo-700 hover:to-purple-700
        rounded-full cursor-pointer shadow-lg
        transition-all duration-300 transform
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2
        focus:ring-offset-white dark:focus:ring-offset-gray-900
        ${uploadingPhoto ? 'opacity-50 cursor-wait' : 'opacity-90 hover:opacity-100'}
      `}
                                                    title="Upload or change profile picture (max 2MB)"
                                                    aria-label="Upload or change profile picture"
                                                >
                                                    <CameraIcon className="w-7 h-7 text-white drop-shadow-md" />

                                                    <input
                                                        id="profile-photo-upload"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileSelect(file);
                                                        }}
                                                        disabled={uploadingPhoto}
                                                    />
                                                </label>

                                                {/* Progress Bar Overlay */}
                                                {uploadingPhoto && (
                                                    <div className="absolute inset-x-0 bottom-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden z-20">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Crop Modal */}
                                            {cropImage && (
                                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                                                        {/* Header */}
                                                        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                                Crop Profile Picture
                                                            </h3>
                                                            <button
                                                                onClick={() => {
                                                                    setCropImage(null);
                                                                    setPreviewUrl(modalUser.profile_picture_url || null);
                                                                }}
                                                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>

                                                        {/* Cropper Area */}
                                                        <div className="relative flex-1 min-h-[400px]">
                                                            <Cropper
                                                                image={cropImage}
                                                                crop={crop}
                                                                zoom={zoom}
                                                                aspect={aspectRatio}
                                                                onCropChange={setCrop}
                                                                onZoomChange={setZoom}
                                                                onCropComplete={(croppedArea, croppedAreaPixels) => {
                                                                    setCroppedAreaPixels(croppedAreaPixels);
                                                                }}
                                                                cropShape="round" // round for avatars
                                                                showGrid={false}
                                                            />
                                                        </div>

                                                        {/* Controls */}
                                                        <div className="p-5 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                            {/* Aspect Ratio Selector */}
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    onClick={() => setAspectRatio(1)}
                                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                        aspectRatio === 1
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                                    }`}
                                                                >
                                                                    Square 1:1
                                                                </button>
                                                                <button
                                                                    onClick={() => setAspectRatio(4 / 3)}
                                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                        aspectRatio === 4 / 3
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                                    }`}
                                                                >
                                                                    4:3
                                                                </button>
                                                                <button
                                                                    onClick={() => setAspectRatio(3 / 4)}
                                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                        aspectRatio === 3 / 4
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                                    }`}
                                                                >
                                                                    3:4
                                                                </button>
                                                                <button
                                                                    onClick={() => setAspectRatio(NaN)} // freeform
                                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                        isNaN(aspectRatio)
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                                    }`}
                                                                >
                                                                    Free
                                                                </button>
                                                            </div>

                                                            {/* Zoom Slider */}
                                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                                <span className="text-sm text-gray-700 dark:text-gray-300">Zoom:</span>
                                                                <input
                                                                    type="range"
                                                                    min={1}
                                                                    max={3}
                                                                    step={0.01}
                                                                    value={zoom}
                                                                    onChange={(e) => setZoom(Number(e.target.value))}
                                                                    className="w-32 accent-indigo-600"
                                                                />
                                                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {(zoom * 100).toFixed(0)}%
            </span>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex gap-3 w-full sm:w-auto justify-center sm:justify-end">
                                                                <button
                                                                    onClick={() => {
                                                                        setCropImage(null);
                                                                        setPreviewUrl(modalUser.profile_picture_url || null);
                                                                    }}
                                                                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
                                                                >
                                                                    Cancel
                                                                </button>

                                                                <button
                                                                    onClick={handleCropComplete}
                                                                    className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium shadow-md"
                                                                >
                                                                    Apply & Upload
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status Messages */}
                                            <div className="text-center space-y-2">
                                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                                    Profile Picture
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Recommended: 400×400 px or larger, JPEG/PNG/WebP (max 2MB)
                                                </p>

                                                {imageError && (
                                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                                        {imageError}
                                                    </p>
                                                )}

                                                {uploadingPhoto && (
                                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                                                        Uploading profile picture...
                                                    </p>
                                                )}
                                            </div>

                                            {/* Remove Photo Button */}
                                            {modalUser.profile_picture_url && !uploadingPhoto && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to remove the current profile picture?")) {
                                                            setModalUser(prev => ({ ...prev, profile_picture_url: null }));
                                                            setPreviewUrl(null);
                                                            toast.info("Profile picture removed. Save changes to confirm.");
                                                        }
                                                    }}
                                                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors duration-200"
                                                >
                                                    Remove current photo
                                                </button>
                                            )}
                                        </div>

                                        {/* Form Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Username</label>
                                                <input
                                                    type="text"
                                                    required
                                                    minLength={3}
                                                    maxLength={20}
                                                    pattern="^[a-zA-Z0-9_]+$"
                                                    title="Username can only contain letters, numbers, and underscores"
                                                    value={modalUser.username || ""}
                                                    onChange={(e) => setModalUser({ ...modalUser, username: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                                    onBlur={checkUsernameUnique}
                                                />
                                                {usernameError && <p className="text-sm text-red-500 mt-1">{usernameError}</p>}
                                            </div>

                                            {/* Instead of one full_name input */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label>First Name</label>
                                                    <input
                                                        value={modalUser.first_name || ""}
                                                        onChange={e => setModalUser({...modalUser, first_name: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label>Last Name</label>
                                                    <input
                                                        value={modalUser.last_name || ""}
                                                        onChange={e => setModalUser({...modalUser, last_name: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                                                    title="Enter a valid email address"
                                                    value={modalUser.email || ""}
                                                    onChange={(e) => setModalUser({ ...modalUser, email: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                                    onBlur={checkEmailUnique}
                                                />
                                                {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
                                            </div>

                                            {/* Phone Field */}
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={modalUser.phone || ""}
                                                    // Inside onChange for phone
                                                    onChange={(e) => {
                                                        const val = e.target.value.trim();
                                                        // Optional: auto-format international phone
                                                        const formatted = val.startsWith('+') ? val : `+${val}`;
                                                        setModalUser({ ...modalUser, phone: formatted });
                                                        setPhoneError('');
                                                    }}
                                                    onBlur={checkPhoneUnique}  // ← NEW: add this
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                                    placeholder="+250123456789"
                                                />
                                                {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Role</label>
                                                <select
                                                    value={modalUser.role || ""}
                                                    onChange={(e) => setModalUser({ ...modalUser, role: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Role</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="ceo">CEO</option>
                                                    <option value="hr">HR</option>
                                                    <option value="account">Accounting</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="supervisor">Supervisor</option>
                                                    <option value="collector">Collector</option>
                                                    <option value="driver">Driver</option>
                                                    <option value="manpower">Manpower</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* ─── Company Selection ──────────────────────────────────────────────── */}
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="company-select"
                                                        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
                                                    >
                                                        Company <span className="text-red-500">*</span>
                                                    </label>

                                                    <div className="relative">
                                                        <select
                                                            id="company-select"
                                                            value={modalUser.company_id || ""}
                                                            onChange={(e) => {
                                                                const companyId = e.target.value ? Number(e.target.value) : null;
                                                                setModalUser(prev => ({
                                                                    ...prev,
                                                                    company_id: companyId,
                                                                    branch_id: null, // reset branch when company changes
                                                                }));
                                                            }}
                                                            disabled={loadingCompanies}
                                                            required
                                                            className={`
          w-full px-4 py-3 pr-10
          bg-white dark:bg-gray-800 
          border border-gray-300 dark:border-gray-600 
          rounded-xl 
          text-gray-900 dark:text-gray-100 
          shadow-sm 
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
          focus:outline-none 
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          appearance-none cursor-pointer
        `}
                                                        >
                                                            <option value="">Select a Company</option>

                                                            {loadingCompanies ? (
                                                                <option disabled>Loading companies...</option>
                                                            ) : companies.length === 0 ? (
                                                                <option disabled>No companies available</option>
                                                            ) : (
                                                                companies.map((company) => (
                                                                    <option key={company.id} value={company.id}>
                                                                        {company.name}
                                                                        {company.city && ` • ${company.city}`}
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>

                                                        {/* Custom dropdown arrow */}
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Selected Company Preview Card */}
                                                    {modalUser.company_id && (
                                                        <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                            <div className="flex items-center gap-4">
                                                                {/* Logo */}
                                                                <div className="flex-shrink-0">
                                                                    {companies.find(c => c.id === modalUser.company_id)?.logo ? (
                                                                        <img
                                                                            src={companies.find(c => c.id === modalUser.company_id)?.logo}
                                                                            alt={`${companies.find(c => c.id === modalUser.company_id)?.name} logo`}
                                                                            className="w-14 h-14 object-contain rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = "/images/company-placeholder.png";
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-sm">
                                                                            <BuildingOfficeIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Company Details */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                                        {companies.find(c => c.id === modalUser.company_id)?.name || 'Selected Company'}
                                                                    </p>
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-x-3">
                                                                        {companies.find(c => c.id === modalUser.company_id)?.city && (
                                                                            <span>📍 {companies.find(c => c.id === modalUser.company_id)?.city}</span>
                                                                        )}
                                                                        {companies.find(c => c.id === modalUser.company_id)?.email && (
                                                                            <span className="inline-flex items-center gap-1">
                  ✉️ <span className="truncate max-w-[180px]">
                    {companies.find(c => c.id === modalUser.company_id)?.email}
                  </span>
                </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ─── Branch Selection ───────────────────────────────────────────────── */}
                                                <div className="space-y-2">
                                                    <label
                                                        htmlFor="branch-select"
                                                        className="block text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"
                                                    >
                                                        Branch
                                                        {modalUser.company_id ? (
                                                            <span className="text-red-500">*</span>
                                                        ) : (
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">
          (select company first)
        </span>
                                                        )}
                                                        {loadingBranches && modalUser.company_id && (
                                                            <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
          Loading...
        </span>
                                                        )}
                                                    </label>

                                                    <div className="relative">
                                                        <select
                                                            id="branch-select"
                                                            value={modalUser.branch_id || ""}
                                                            onChange={(e) =>
                                                                setModalUser({
                                                                    ...modalUser,
                                                                    branch_id: e.target.value ? Number(e.target.value) : null,
                                                                })
                                                            }
                                                            disabled={!modalUser.company_id || loadingBranches}
                                                            required={!!modalUser.company_id}
                                                            className={`
          w-full px-4 py-3 pr-10
          bg-white dark:bg-gray-800 
          border border-gray-300 dark:border-gray-600 
          rounded-xl 
          text-gray-900 dark:text-gray-100 
          shadow-sm 
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
          focus:outline-none 
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          appearance-none cursor-pointer
        `}
                                                        >
                                                            <option value="">Select Branch</option>

                                                            {loadingBranches ? (
                                                                <option disabled>Loading branches...</option>
                                                            ) : !modalUser.company_id ? (
                                                                <option disabled>Select company first</option>
                                                            ) : !Array.isArray(branches) || branches.length === 0 ? (
                                                                <option disabled>No branches available</option>
                                                            ) : (
                                                                branches.map((branch) => (
                                                                    <option key={branch.id} value={branch.id}>
                                                                        {branch.name}
                                                                        {branch.city && ` • ${branch.city}`}
                                                                        {branch.region && ` • ${branch.region}`}
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>

                                                        {/* Dropdown arrow */}
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Branch Preview Card */}
                                                    {modalUser.branch_id && Array.isArray(branches) && branches.length > 0 && (
                                                        <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                            <div className="flex items-center gap-4">
                                                                {/* Branch Icon */}
                                                                <div className="flex-shrink-0">
                                                                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-sm">
                                                                        <BuildingStorefrontIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                                                                    </div>
                                                                </div>

                                                                {/* Branch Details */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                                        {branches.find(b => b.id === modalUser.branch_id)?.name || 'Selected Branch'}
                                                                    </p>
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-x-3">
                                                                        {branches.find(b => b.id === modalUser.branch_id)?.city && (
                                                                            <span>📍 {branches.find(b => b.id === modalUser.branch_id)?.city}</span>
                                                                        )}
                                                                        {branches.find(b => b.id === modalUser.branch_id)?.region && (
                                                                            <span>• {branches.find(b => b.id === modalUser.branch_id)?.region}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Checkboxes */}
                                        <div className="flex flex-wrap gap-6">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={modalUser.is_verified || false}
                                                    onChange={(e) => setModalUser({ ...modalUser, is_verified: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded"
                                                />
                                                Verified
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={modalUser.is_active || false}
                                                    onChange={(e) => setModalUser({ ...modalUser, is_active: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded"
                                                />
                                                Active
                                            </label>
                                        </div>

                                        {/* Password Section */}
                                        {/* ─── Password Section ───────────────────────────────────────────────────── */}
                                        {showPassword && (
                                            <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    Set Password {modalUser.id ? '(Optional - leave blank to keep current)' : '*'}
                                                </h3>

                                                {/* New Password */}
                                                <div className="space-y-2">
                                                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        New Password
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            id="new-password"
                                                            type={showPasswordInput ? "text" : "password"}
                                                            placeholder="Minimum 12 characters"
                                                            value={modalUser.new_password || ""}
                                                            onChange={(e) => {
                                                                setModalUser({ ...modalUser, new_password: e.target.value });
                                                                checkPasswordStrength(e.target.value);
                                                            }}
                                                            className={`
            w-full px-4 py-3 pr-12
            border border-gray-300 dark:border-gray-600 
            rounded-xl bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            transition-all duration-200
          `}
                                                            minLength={12}
                                                            required={!modalUser.id}
                                                        />

                                                        {/* Visibility toggle */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswordInput(!showPasswordInput)}
                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        >
                                                            {showPasswordInput ? (
                                                                <EyeSlashIcon className="h-5 w-5" />
                                                            ) : (
                                                                <EyeIcon className="h-5 w-5" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Strength meter */}
                                                    {passwordStrength && (
                                                        <div className="mt-2">
                                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-300 ${
                                                                        passwordStrength === 'Weak' ? 'bg-red-500 w-1/4' :
                                                                            passwordStrength === 'Medium' ? 'bg-yellow-500 w-2/4' :
                                                                                'bg-green-500 w-full'
                                                                    }`}
                                                                />
                                                            </div>
                                                            <p className={`text-sm mt-1 font-medium ${passwordStrengthColor}`}>
                                                                Password Strength: {passwordStrength}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Password suggestions */}
                                                    <div className="mt-3">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                            Suggested strong passwords (click to use):
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {suggestedPasswords.map((pwd, index) => (
                                                                <button
                                                                    key={index}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setModalUser(prev => ({ ...prev, new_password: pwd }));
                                                                        setConfirmPassword(pwd);
                                                                        checkPasswordStrength(pwd);
                                                                        toast.success('Password applied!');
                                                                    }}
                                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200 text-sm rounded-lg border border-gray-300 dark:border-gray-600 transition-colors duration-150"
                                                                >
                                                                    {pwd}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Confirm Password */}
                                                <div className="space-y-2">
                                                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Confirm Password
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            id="confirm-password"
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="Re-enter password"
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            className={`
            w-full px-4 py-3 pr-12
            border border-gray-300 dark:border-gray-600 
            rounded-xl bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            transition-all duration-200
          `}
                                                            required={!modalUser.id}
                                                        />

                                                        {/* Visibility toggle for confirm */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        >
                                                            {showConfirmPassword ? (
                                                                <EyeSlashIcon className="h-5 w-5" />
                                                            ) : (
                                                                <EyeIcon className="h-5 w-5" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Mismatch warning */}
                                                    {passwordMismatch && (
                                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                                            <ExclamationTriangleIcon className="h-4 w-4" />
                                                            Passwords do not match
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Requirements list */}
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                                                    <p className="font-medium mb-1">Password requirements:</p>
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        <li className={modalUser.new_password?.length >= 12 ? 'text-green-600 dark:text-green-400' : ''}>
                                                            At least 12 characters
                                                        </li>
                                                        <li className={/[A-Z]/.test(modalUser.new_password || '') ? 'text-green-600 dark:text-green-400' : ''}>
                                                            One uppercase letter
                                                        </li>
                                                        <li className={/[a-z]/.test(modalUser.new_password || '') ? 'text-green-600 dark:text-green-400' : ''}>
                                                            One lowercase letter
                                                        </li>
                                                        <li className={/\d/.test(modalUser.new_password || '') ? 'text-green-600 dark:text-green-400' : ''}>
                                                            One number
                                                        </li>
                                                        <li className={/[@$!%*?&]/.test(modalUser.new_password || '') ? 'text-green-600 dark:text-green-400' : ''}>
                                                            One special character (@$!%*?&)
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <div className="flex justify-end gap-4 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModalOpen(false);
                                                    setPasswordStrength('');
                                                    setPasswordMismatch(false);
                                                    setConfirmPassword('');
                                                    setPreviewUrl(null);
                                                    setImageError('');
                                                }}
                                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={loadingForm || !isFormValid()}
                                                className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all ${
                                                    isFormValid()
                                                        ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md'
                                                        : 'bg-gray-400 cursor-not-allowed opacity-70'
                                                }`}
                                            >
                                                {loadingForm ? (
                                                    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
      </svg>
      Saving...
    </span>
                                                ) : modalUser.id ? 'Update User' : 'Create User'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        );
}


// ─── Reusable Summary Card ──────────────────────────────────────────────────
const SummaryCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => (
    <motion.div
        className={`p-6 rounded-xl shadow-lg border bg-white dark:bg-gray-800 border-${color}-200 dark:border-${color}-800`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className={`text-3xl font-bold text-${color}-600 dark:text-${color}-400 mt-1`}>{value}</p>
            </div>
            <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-full`}>
                {icon}
            </div>
        </div>
    </motion.div>
);