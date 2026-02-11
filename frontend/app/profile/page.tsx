// app/profile/page.tsx
"use client";

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api"; // Your axios instance with token interceptor
import Image from "next/image";
import {
    CameraIcon,
    PencilIcon,
    CheckIcon,
    HeartIcon,
    ChatBubbleBottomCenterTextIcon,
    ShareIcon,
    TrashIcon,
    VideoCameraIcon,
    MicrophoneIcon,
    PlayIcon,
    EyeIcon,
    ChevronDownIcon, BellIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, Transition } from "@headlessui/react";
import Cookies from "js-cookie";
import {
    ArrowPathIcon,
    ArrowRightOnRectangleIcon,
    ArrowLeftOnRectangleIcon,
    PencilSquareIcon,
    ChatBubbleLeftIcon,
    UserPlusIcon,
    UserCircleIcon,
    KeyIcon,
    ArrowTopRightOnSquareIcon,
    XMarkIcon,
} from "@heroicons/react/24/solid";
import {DownloadIcon, ImageIcon, XIcon } from "lucide-react";
import {toast} from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────
interface UserProfile {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    profile_picture_url: string | null;
    branch: string | null;
    company: string | null;
    last_seen: string | null;
    status_display: string;
    notify_email: boolean;
    notify_sms: boolean;
    notify_browser: boolean;
    notify_sound: boolean;
    bio?: string;
    location?: string;
    website?: string;
    birth_date?: string;
}

interface Comment {
    id: number;
    user: { id: number; username: string; full_name: string };
    content: string;
    created_at: string;
    is_editing?: boolean;
    tempId?: string; // for optimistic updates
}

interface Post {
    id: number;
    user: { id: number; username: string; full_name: string; profile_picture_url?: string };
    content: string;
    media_type: "photo" | "video" | "audio" | null;
    media: string | null;
    privacy: "public" | "friends" | "private" | "specific";
    is_announcement: boolean;
    created_at: string;
    views: number;
    shares: number;
    likes_count: number;
    user_has_liked: boolean;
    comments: Comment[];
    tempId?: string; // for optimistic new posts
}

interface Activity {
    id: number;
    user: { username: string };
    action_type: string;
    target_summary: string;
    created_at: string;
}

const ProfilePage = () => {
    const router = useRouter();

    // ─── Core State ─────────────────────────────────────────────────────────────
    const [user, setUser] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);

    // Post creation modal states
    const [showPostModal, setShowPostModal] = useState(false);
    const [postContent, setPostContent] = useState("");
    const [postMedia, setPostMedia] = useState<File | null>(null);
    const [postMediaType, setPostMediaType] = useState<"photo" | "video" | "audio" | null>(null);
    const [postMediaPreview, setPostMediaPreview] = useState<string | null>(null);
    const [postPrivacy, setPostPrivacy] = useState<"public" | "friends" | "private" | "specific">("public");
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [recording, setRecording] = useState(false);
    const audioRecorder = useRef<MediaRecorder | null>(null);
    const [audioURL, setAudioURL] = useState<string | null>(null);

    // Interaction states
    const [commentModals, setCommentModals] = useState<{ [key: number]: boolean }>({});
    const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
    const [zoomMediaUrl, setZoomMediaUrl] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});

    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [passwordData, setPasswordData] = useState({ new_password: "", confirm_password: "" });
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // WebSocket & Infinite Scroll refs
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 2000;


    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [selectedActionType, setSelectedActionType] = useState('');
    const [markingRead, setMarkingRead] = useState<number | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    // Ref for infinite scroll
    const activitiesContainerRef = useRef<HTMLDivElement>(null);

    // Action types (fetch from backend or hardcode)
    const actionTypes = [
        'login', 'logout', 'posted', 'commented', 'shared', 'reacted_like',
        'reacted_love', 'friended', 'updated_profile', 'password_change'
    ];


    const loaderRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // ─── Initial Data Fetch ─────────────────────────────────────────────────────
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);

                const [profileRes, postsRes, activitiesRes, usersRes] = await Promise.all([
                    api.get("/users/profile/"),              // /api/v1/users/profile/
                    api.get("/users/posts/"),                // user's own posts
                    api.get("/users/activities/"),           // recent activities
                    api.get("/users/"),                      // all users for private sharing
                ]);

                setUser(profileRes.data);
                setPosts(postsRes.data.results || postsRes.data || []);
                setActivities(activitiesRes.data.results || activitiesRes.data || []);
                setAllUsers(usersRes.data.results || usersRes.data || []);

                setFormData({
                    first_name: profileRes.data.first_name || "",
                    last_name: profileRes.data.last_name || "",
                    email: profileRes.data.email || "",
                    phone: profileRes.data.phone || "",
                    bio: profileRes.data.bio || "",
                });

            } catch (err: any) {
                console.error("Profile data fetch error:", err);
                setError("Failed to load profile data. Please try again.");
                if (err.response?.status === 401) {
                    Cookies.remove("token");
                    router.push("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [router]);

    // WebSocket connection
    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const baseReconnectDelay = 2000; // 2 seconds

        const connectWebSocket = () => {
            const token = localStorage.getItem("token") || Cookies.get("token");
            if (!token) {
                console.warn("No token found → skipping WebSocket");
                return;
            }

            const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/activities/`;
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("WebSocket OPENED successfully");
                socket.send(JSON.stringify({ type: "hello_from_client" }));
            };

            // In WebSocket onmessage (when new activity arrives)
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "new_activity") {
                    setActivities((prev) => [data.activity, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // Show browser notification
                    if (Notification.permission === "granted") {
                        new Notification("New Activity", {
                            body: formatActivitySummary(data.activity),
                            icon: "/favicon.ico", // or your logo
                        });
                    } else {
                        toast.success(formatActivitySummary(data.activity), {
                            duration: 6000,
                            icon: getActivityIcon(data.activity.action_type),
                        });
                    }
                } else if (data.type === "unread_count") {
                    setUnreadCount(data.count);
                }
            };

            socket.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                if (reconnectAttempts < maxReconnectAttempts && !event.wasClean) {
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
                    console.log(`Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                    setTimeout(connectWebSocket, delay);
                    reconnectAttempts++;
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    console.error("Max reconnect attempts reached. Giving up.");
                    toast.error("Connection lost. Please refresh the page.", { duration: 8000 });
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
        };

        connectWebSocket();

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, []);

    // Fetch initial activities
    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await api.get("/users/activities/my/?page_size=20");
                setActivities(res.data.results || res.data);
                // Count unread from initial fetch
                setUnreadCount(res.data.results?.filter((a: any) => !a.is_read).length || 0);
            } catch (err) {
                console.error("Failed to load activities:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, []);

    // Request permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);


    // Open detail modal
    const openActivityDetail = (act: any) => {
        setSelectedActivity(act);
        if (!act.is_read) {
            markAsRead(act.id);
        }
    };

    // Fetch activities
    const fetchActivities = async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const params = {
                page: isLoadMore ? page + 1 : 1,
                page_size: 10,
                ...(selectedActionType && { action_type: selectedActionType }),
            };

            const res = await api.get('/users/activities/my/', { params });

            const newActivities = res.data.results || res.data;

            setActivities(prev => isLoadMore ? [...prev, ...newActivities] : newActivities);
            setHasMore(!!res.data.next);
            if (isLoadMore) setPage(prev => prev + 1);
        } catch (err) {
            console.error('Failed to load activities:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

// Initial fetch + refetch on filter change
    useEffect(() => {
        fetchActivities();
    }, [selectedActionType]);

// Infinite scroll observer
    useEffect(() => {
        if (!activitiesContainerRef.current || !hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchActivities(true);
                }
            },
            { threshold: 0.1 }
        );

        const lastElement = activitiesContainerRef.current.lastElementChild;
        if (lastElement) observer.observe(lastElement);

        return () => {
            if (lastElement) observer.unobserve(lastElement);
        };
    }, [activities, hasMore, loadingMore]);

// Mark single activity as read
    const markAsRead = async (activityId: number) => {
        setMarkingRead(activityId);
        try {
            await api.patch(`/users/activities/${activityId}/read/`);
            setActivities(prev =>
                prev.map(act =>
                    act.id === activityId ? { ...act, is_read: true } : act
                )
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        } finally {
            setMarkingRead(null);
        }
    };

// Mark all visible as read
    const markAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await api.post('/users/activities/mark-all-read/');
            setActivities(prev => prev.map(act => ({ ...act, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        } finally {
            setMarkingAll(false);
        }
    };

// Click handler for linking to content
    const handleActivityClick = (act: any) => {
        if (act.target_type && act.object_id) {
            if (act.target_type === 'post') {
                router.push(`/posts/${act.object_id}`);
            } else if (act.target_type === 'comment') {
                router.push(`/comments/${act.object_id}`);
            }
            // Add more cases as needed
        }
    };

// Format action type for display
    const formatActionType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };


    // ─── Infinite Scroll ────────────────────────────────────────────────────────
    const loadMorePosts = async (targetPage: number) => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);

        try {
            const res = await api.get(`/users/posts/?page=${targetPage}`);
            const newPosts = res.data.results || res.data || [];

            setPosts((prev) => (targetPage === 1 ? newPosts : [...prev, ...newPosts]));
            setHasMore(!!res.data.next);
            setPage(targetPage);
        } catch (err) {
            console.error("Failed to load more posts:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMorePosts(page + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) observerRef.current.observe(loaderRef.current);

        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, page]);

    // ─── WebSocket with Reconnection Logic ──────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const connectWebSocket = () => {
            const wsUrl = `ws://${window.location.host}/ws/users/${user.id}/`; // Adjust to your WS URL
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log("WebSocket connected");
                reconnectAttemptsRef.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case "new_comment":
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === data.post_id
                                    ? { ...p, comments: [...p.comments, data.comment] }
                                    : p
                            )
                        );
                        break;

                    case "new_post":
                        setPosts((prev) => [data.post, ...prev]);
                        break;

                    case "post_updated":
                        setPosts((prev) =>
                            prev.map((p) => (p.id === data.post.id ? { ...p, ...data.post } : p))
                        );
                        break;

                    case "comment_deleted":
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === data.post_id
                                    ? {
                                        ...p,
                                        comments: p.comments.filter((c) => c.id !== data.comment_id),
                                    }
                                    : p
                            )
                        );
                        break;

                    case "comment_updated":
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === data.post_id
                                    ? {
                                        ...p,
                                        comments: p.comments.map((c) =>
                                            c.id === data.comment.id ? data.comment : c
                                        ),
                                    }
                                    : p
                            )
                        );
                        break;
                }
            };

            wsRef.current.onerror = () => {
                console.error("WebSocket error");
                attemptReconnect();
            };

            wsRef.current.onclose = () => {
                console.log("WebSocket closed");
                attemptReconnect();
            };
        };

        const attemptReconnect = () => {
            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                console.warn("Max WebSocket reconnect attempts reached");
                return;
            }

            const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current++;

            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        };

        connectWebSocket();

        return () => {
            wsRef.current?.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [user]);

    // ─── Optimistic Like Toggle ─────────────────────────────────────────────────
    const toggleLike = async (postId: number, wasLiked: boolean, currentLikesCount: number) => {
        // Use the passed value (safe number)
        const currentLikes = Number(currentLikesCount ?? 0);

        // Optimistic update
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        likes_count: wasLiked ? currentLikes - 1 : currentLikes + 1,
                        user_has_liked: !wasLiked,
                    }
                    : p
            )
        );

        try {
            const res = await api.post(`/users/posts/${postId}/like/`, {
                action: wasLiked ? "unlike" : "like",
            });

            // Confirm with real data
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p,
                            likes_count: Number(res.data.likes_count ?? 0),
                            user_has_liked: res.data.user_has_liked,
                        }
                        : p
                )
            );
        } catch (err) {
            // Rollback
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p,
                            likes_count: currentLikes,
                            user_has_liked: wasLiked,
                        }
                        : p
                )
            );
            console.error("Like update failed:", err);
            // Optional: show toast/error message
        }
    };

    // ─── Create Post (Optimistic + Broadcast) ──────────────────────────────────
    const handlePostSubmit = async () => {
        if (!postContent.trim() && !postMedia) {
            setError("Post content or media is required");
            return;
        }

        // Optimistic post
        const tempId = `temp-${Date.now()}`;
        const optimisticPost: Post = {
            id: 0,
            tempId,
            user: {
                id: user!.id,
                username: user!.username,
                full_name: user!.full_name,
                profile_picture_url: user!.profile_picture_url,
            },
            content: postContent,
            media_type: postMediaType,
            media: postMediaPreview,
            privacy: postPrivacy,
            is_announcement: isAnnouncement,
            created_at: new Date().toISOString(),
            views: 0,
            shares: 0,
            likes_count: 0,
            user_has_liked: false,
            comments: [],
        };

        setPosts((prev) => [optimisticPost, ...prev]);
        setShowPostModal(false);
        setPostContent("");
        setPostMedia(null);
        setPostMediaType(null);
        setPostMediaPreview(null);
        setAudioURL(null);
        setSelectedUsers([]);
        setIsAnnouncement(false);

        const formData = new FormData();
        formData.append("content", postContent);
        formData.append("privacy", postPrivacy);
        if (postMedia) {
            formData.append("media", postMedia);
            formData.append("media_type", postMediaType || "");
        }
        if (postPrivacy === "specific") {
            formData.append("allowed_users", JSON.stringify(selectedUsers));
        }
        if (isAnnouncement) {
            formData.append("is_announcement", "true");
        }

        try {
            const res = await api.post("/users/posts/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Replace optimistic with real post
            setPosts((prev) =>
                prev.map((p) => (p.tempId === tempId ? { ...res.data, tempId: undefined } : p))
            );
        } catch (err) {
            // Rollback
            setPosts((prev) => prev.filter((p) => p.tempId !== tempId));
            setError("Failed to create post");
        }
    };

    // ─── Comment Creation (Optimistic) ──────────────────────────────────────────
    const handleCommentSubmit = async (postId: number) => {
        const content = newComment[postId]?.trim();
        if (!content) return;

        const tempId = `temp-comment-${Date.now()}`;
        const optimisticComment: Comment = {
            id: 0,
            tempId,
            user: {
                id: user!.id,
                username: user!.username,
                full_name: user!.full_name,
            },
            content,
            created_at: new Date().toISOString(),
        };

        // Optimistic add
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        comments: [...(p.comments || []), optimisticComment]  // ← safe: || []
                    }
                    : p
            )
        );
        setNewComment((prev) => ({ ...prev, [postId]: "" }));

        try {
            const res = await api.post(`/users/posts/${postId}/comments/`, { content });

            // Replace with real comment
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p,
                            comments: p.comments.map((c) =>
                                c.tempId === tempId ? res.data : c
                            ),
                        }
                        : p
                )
            );
        } catch (err) {
            // Rollback
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, comments: p.comments.filter((c) => !c.tempId) }
                        : p
                )
            );
            alert("Failed to post comment");
        }
    };

    // ─── Comment Edit (Optimistic) ─────────────────────────────────────────────
    const startEditComment = (postId: number, commentId: number, content: string) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        comments: p.comments.map((c) =>
                            c.id === commentId ? { ...c, is_editing: true, content } : c
                        ),
                    }
                    : p
            )
        );
    };

    // ─── Notification Settings Toggle ──────────────────────────────────────────
    const toggleNotification = async (field: keyof UserProfile, value: boolean) => {
        try {
            await api.patch("/users/notification-settings/", { [field]: value });
            setUser((prev) => prev ? { ...prev, [field]: value } : null);
        } catch (err) {
            setError("Failed to update notification settings");
        }
    };

    // ─── Comments & Interactions ────────────────────────────────────────────────
    const toggleComments = (postId: number) => {
        setCommentModals((prev) => ({ ...prev, [postId]: !prev[postId] }));
    };

    // ─── Create Post ────────────────────────────────────────────────────────────
    const handlePostMediaChange = (e: ChangeEvent<HTMLInputElement>, type: "photo" | "video" | "audio") => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setPostMedia(file);
            setPostMediaType(type);
            setPostMediaPreview(URL.createObjectURL(file));
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                setAudioURL(url);
                setPostMedia(new File([blob], "voice.webm", { type: "audio/webm" }));
                setPostMediaType("audio");
                setPostMediaPreview(url);
            };

            recorder.start();
            audioRecorder.current = recorder;
            setRecording(true);
        } catch (err) {
            setError("Failed to access microphone");
        }
    };

    const stopRecording = () => {
        if (audioRecorder.current) {
            audioRecorder.current.stop();
            setRecording(false);
        }
    };

    const saveEditedComment = async (postId: number, commentId: number, newContent: string) => {
        const originalComment = posts
            .find((p) => p.id === postId)
            ?.comments.find((c) => c.id === commentId);

        if (!originalComment) return;

        // Optimistic update
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        comments: (p.comments || []).map((c) =>
                            c.id === commentId ? { ...c, content: newContent, is_editing: false } : c
                        ),
                    }
                    : p
            )
        );

        try {
            await api.patch(`/users/comments/${commentId}/`, { content: newContent });
        } catch (err) {
            // Rollback
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p,
                            comments: p.comments.map((c) =>
                                c.id === commentId ? { ...c, content: originalComment.content, is_editing: false } : c
                            ),
                        }
                        : p
                )
            );
            alert("Failed to update comment");
        }
    };

    // ─── Activity Icon Mapping ────────────────────────────────────────────────
    const getActivityIcon = (actionType: string) => {
        switch (actionType) {
            case 'login':
                return <ArrowRightOnRectangleIcon className="w-5 h-5 text-green-600" />;
            case 'logout':
                return <ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-600" />;
            case 'posted':
                return <PencilSquareIcon className="w-5 h-5 text-blue-600" />;
            case 'commented':
                return <ChatBubbleLeftIcon className="w-5 h-5 text-purple-600" />;
            case 'shared':
                return <ShareIcon className="w-5 h-5 text-indigo-600" />;
            case 'reacted_like':
            case 'reacted_love':
                return <HeartIcon className="w-5 h-5 text-pink-600" />;
            case 'friended':
                return <UserPlusIcon className="w-5 h-5 text-teal-600" />;
            case 'updated_profile':
                return <UserCircleIcon className="w-5 h-5 text-amber-600" />;
            case 'password_change':
                return <KeyIcon className="w-5 h-5 text-yellow-600" />;
            default:
                return <ClockIcon className="w-5 h-5 text-gray-600" />;
        }
    };


// ─── Format Activity Summary ──────────────────────────────────────────────
    const formatActivitySummary = (act: any) => {
        const userName = act.user?.full_name || act.user?.username || 'You';

        switch (act.action_type) {
            case 'login':
                return `${userName} logged in`;
            case 'logout':
                return `${userName} logged out`;
            case 'posted':
                return `${userName} posted new content`;
            case 'commented':
                return `${userName} commented`;
            case 'shared':
                return `${userName} shared something`;
            case 'reacted_like':
                return `${userName} liked an item`;
            case 'reacted_love':
                return `${userName} loved an item`;
            case 'friended':
                return `${userName} added a friend`;
            case 'updated_profile':
                return `${userName} updated profile`;
            case 'password_change':
                return `${userName} changed password`;
            default:
                return `${userName} performed action: ${act.action_type}`;
        }
    };

    // Helper to group activities
    const groupActivities = (activities: any[]) => {
        const grouped: any[] = [];
        let currentGroup: any = null;

        activities.forEach((act) => {
            const key = `${act.action_type}-${act.target_type}-${act.object_id}`;

            if (
                currentGroup &&
                currentGroup.key === key &&
                Date.now() - new Date(currentGroup.created_at).getTime() < 5 * 60 * 1000 // within 5 min
            ) {
                currentGroup.count = (currentGroup.count || 1) + 1;
                currentGroup.last_created_at = act.created_at;
            } else {
                if (currentGroup) grouped.push(currentGroup);
                currentGroup = {
                    ...act,
                    key,
                    count: 1,
                    last_created_at: act.created_at,
                };
            }
        });

        if (currentGroup) grouped.push(currentGroup);
        return grouped;
    };

    const formatGroupedSummary = (group: any) => {
        const base = formatActivitySummary(group);
        if (group.count > 1) {
            const action = group.action_type.includes('reacted') ? 'reacted' : group.action_type;
            return `${base} (${group.count} times)`;
        }
        return base;
    };

// ─── Relative Time ────────────────────────────────────────────────────────
    const formatRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

// ─── Target Link (optional) ───────────────────────────────────────────────
    const getTargetLink = (act: any) => {
        if (!act.target_type) return '#';
        // Customize based on target_type
        if (act.target_type === 'post') return `/posts/${act.object_id}`;
        if (act.target_type === 'comment') return `/comments/${act.object_id}`;
        return '#';
    };

    // ─── Profile Picture & Edit Form ────────────────────────────────────────────
    const handlePictureChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                form.append(key, value as string);
            }
        });
        if (profilePicture) {
            form.append("profile_picture", profilePicture);
        }

        try {
            const res = await api.put("/users/profile/", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setUser(res.data);
            setEditing(false);
            setPreviewUrl(null);
            setProfilePicture(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to update profile");
        }
    };

    // ─── Password Change ────────────────────────────────────────────────────────
    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
        setPasswordError(null);
        setPasswordSuccess(false);
    };

    const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError("Passwords do not match");
            return;
        }

        if (passwordData.new_password.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }

        try {
            await api.post("/users/change-password/", {
                new_password: passwordData.new_password,
            });
            setPasswordSuccess(true);
            setPasswordData({ new_password: "", confirm_password: "" });
        } catch (err: any) {
            setPasswordError(err.response?.data?.detail || "Failed to change password");
        }
    };

    // ─── Comment Delete (Optimistic) ───────────────────────────────────────────
    const deleteComment = async (postId: number, commentId: number) => {
        if (!confirm("Delete this comment?")) return;

        const originalComments = posts.find((p) => p.id === postId)?.comments || [];

        // Optimistic remove
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        comments: (p.comments || []).filter((c) => c.id !== commentId),
                    }
                    : p
            )
        );

        try {
            await api.delete(`/users/comments/${commentId}/`);
            // WS will sync for others
        } catch (err) {
            // Rollback
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, comments: originalComments } : p
                )
            );
            alert("Failed to delete comment");
        }
    };

    // ─── Share Functionality ────────────────────────────────────────────────────
    const handleShare = (postId: number) => {
        const url = `${window.location.origin}/posts/${postId}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("Post link copied to clipboard!");
        });
    };

    // ─── Render Post Media (Existing & Preview) ────────────────────────────────
    const renderMedia = (mediaUrl: string | null, mediaType: string | null, isPreview = false) => {
        if (!mediaUrl) return null;

        const src = isPreview ? mediaUrl : mediaUrl; // relative path via proxy

        switch (mediaType) {
            case "photo":
                return (
                    <img
                        src={src}
                        alt="Post media"
                        className="max-w-full h-auto rounded-lg cursor-pointer object-contain"
                        onClick={() => !isPreview && setZoomMediaUrl(src)}
                    />
                );
            case "video":
                return (
                    <video
                        src={src}
                        controls
                        className="max-w-full h-auto rounded-lg"
                        preload="metadata"
                    >
                        <source src={src} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
            case "audio":
                return (
                    <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <audio controls className="w-full">
                            <source src={src} type="audio/webm" />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                );
            default:
                return null;
        }
    };

    // ─── Superuser check ────────────────────────────────────────────────────────
    const isSuperUser = ["ceo", "admin", "manager"].includes(user?.role || "");

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-black dark:text-white">
                Loading profile...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen text-black dark:text-white">
                No profile data available
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 text-black dark:text-white">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
                    )}
                    <p className="mt-2">Manage your information, posts and privacy</p>
                </div>
                <div className="relative inline-block">
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <BellIcon className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
                        )}
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-8">
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded mb-6">
                            {error}
                        </div>
                    )}

                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
                        {/* Avatar */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative shrink-0"
                        >
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
                                <Image
                                    src={previewUrl || user.profile_picture_url || "/images/avatar-placeholder.png"}
                                    alt={user.full_name}
                                    width={160}
                                    height={160}
                                    className="object-cover w-full h-full"
                                />
                            </div>

                            {editing && (
                                <label className="absolute bottom-2 right-2 bg-blue-600 text-white p-3 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition">
                                    <CameraIcon className="w-6 h-6" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                const file = e.target.files[0];
                                                setProfilePicture(file);
                                                setPreviewUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </motion.div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-bold">{user.full_name}</h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">@{user.username}</p>

                            <div className="mt-4 space-y-2">
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Phone:</strong> {user.phone || "Not set"}</p>
                                <p><strong>Role:</strong> <span className="capitalize font-medium">{user.role}</span></p>
                                <p><strong>Status:</strong> {user.status_display}</p>
                                {user.branch && <p><strong>Branch:</strong> {user.branch}</p>}
                            </div>

                            <button
                                onClick={() => setEditing(!editing)}
                                className="mt-6 inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {editing ? (
                                    <>
                                        <XIcon className="w-5 h-5 mr-2" />
                                        Cancel
                                    </>
                                ) : (
                                    <>
                                        <PencilIcon className="w-5 h-5 mr-2" />
                                        Edit Profile
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <AnimatePresence>
                        {editing && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleSubmit}
                                className="mb-12"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                                >
                                    <CheckIcon className="w-5 h-5 inline mr-2" />
                                    Save Changes
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Notification Preferences */}
                    <section className="mb-12">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                            <BellIcon className="w-6 h-6 mr-2" />
                            Notification Preferences
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: "notify_email", label: "Email Notifications" },
                                { key: "notify_sms", label: "SMS Notifications" },
                                { key: "notify_browser", label: "Browser Notifications" },
                                { key: "notify_sound", label: "Sound Alerts" },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={!!user?.[key as keyof UserProfile]}
                                        onChange={(e) => toggleNotification(key as keyof UserProfile, e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Password Change */}
                    <section className="mb-12">
                        <h3 className="text-xl font-semibold mb-6">Change Password</h3>

                        {passwordError && (
                            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-lg mb-4">
                                Password updated successfully!
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium mb-1">New Password</label>
                                <input
                                    type="password"
                                    name="new_password"
                                    value={passwordData.new_password}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirm_password"
                                    value={passwordData.confirm_password}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
                            >
                                Update Password
                            </button>
                        </form>
                    </section>

                    {/* Recent Activities - Enhanced */}
                    <section className="mb-12">
                        {/* Header with filter and mark all */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <ClockIcon className="w-6 h-6 text-indigo-600" />
                                    Recent Activities
                                </h3>

                                {unreadCount > 0 && (
                                    <span className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
          {unreadCount} unread
        </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                {/* Action Type Filter */}
                                <select
                                    value={selectedActionType}
                                    onChange={(e) => {
                                        setSelectedActionType(e.target.value);
                                        setPage(1);
                                        setActivities([]);
                                        setHasMore(true);
                                    }}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">All Actions</option>
                                    {actionTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {formatActionType(type)}
                                        </option>
                                    ))}
                                </select>

                                {/* Mark All as Read */}
                                {activities.some((act) => !act.is_read) && (
                                    <button
                                        onClick={markAllAsRead}
                                        disabled={markingAll}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {markingAll ? (
                                            <>
                                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                                Marking...
                                            </>
                                        ) : (
                                            "Mark All as Read"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Loading / Empty State */}
                        {loading && activities.length === 0 ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
                                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                                    No recent activities yet
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    {selectedActionType
                                        ? `No activities matching "${formatActionType(selectedActionType)}"`
                                        : "Your actions will appear here as you use the platform"}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Activity List */}
                                <div className="space-y-4" ref={activitiesContainerRef}>
                                    {activities.map((act) => (
                                        <div
                                            key={act.id}
                                            onClick={() => openActivityDetail(act)}
                                            className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                                act.is_read
                                                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
                                                    : "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md"
                                            }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                                                        {getActivityIcon(act.action_type)}
                                                    </div>
                                                </div>

                                                {/* Main Content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Summary */}
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {formatActivitySummary(act)}
                                                        {act.count > 1 && (
                                                            <span className="ml-1.5 text-gray-500 dark:text-gray-400 font-normal">
                      ({act.count} times)
                    </span>
                                                        )}
                                                    </p>

                                                    {/* Meta */}
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                                        <span>{act.user?.full_name || act.user?.username || "You"}</span>
                                                        <span className="hidden sm:inline">•</span>
                                                        <span title={new Date(act.created_at).toLocaleString()}>
                    {formatRelativeTime(act.created_at)}
                  </span>
                                                    </div>

                                                    {/* Target Link */}
                                                    {act.target_type && act.object_id && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={getTargetLink(act)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1 hover:underline"
                                                            >
                                                                View {act.target_type}
                                                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Read Indicator & Action */}
                                                <div className="flex-shrink-0 flex items-center gap-3">
                                                    {!act.is_read && (
                                                        <span className="inline-flex h-2 w-2 rounded-full bg-indigo-600"></span>
                                                    )}
                                                    {!act.is_read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(act.id);
                                                            }}
                                                            disabled={markingRead === act.id}
                                                            className="text-xs px-2.5 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition disabled:opacity-50"
                                                        >
                                                            {markingRead === act.id ? "..." : "Mark Read"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Load More / No More */}
                                {loadingMore && (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                    </div>
                                )}

                                {!hasMore && activities.length > 0 && (
                                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8 py-4 border-t border-gray-200 dark:border-gray-700">
                                        No more activities to load
                                    </p>
                                )}
                            </>
                        )}
                    </section>

                    {/* Posts Section */}
                    <section>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold">My Posts & Announcements</h3>
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition flex items-center"
                            >
                                <span className="mr-2">Create Post</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {posts.length === 0 && !loadingMore ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed">
                                <p className="text-gray-500 dark:text-gray-400">You haven't posted anything yet</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {posts.map((post) => {
                                    // Convert absolute URL to relative path (fixes Next.js private IP block)
                                    const mediaSrc = post.media
                                        ? post.media.replace(/^https?:\/\/[^/]+/, '') // removes http://127.0.0.1:8000
                                        : null;

                                    return (
                                        <article
                                            key={post.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
                                        >
                                            {/* Post Header */}
                                            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <Image
                                                        src={post.user.profile_picture_url || "/images/avatar-placeholder.png"}
                                                        alt={post.user.full_name}
                                                        width={48}
                                                        height={48}
                                                        className="rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <h4 className="font-semibold">{post.user.full_name}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(post.created_at).toLocaleString()}
                                                            {post.is_announcement && (
                                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Announcement
                                            </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {post.user.id === user?.id && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm("Delete this post?")) {
                                                                api.delete(`/users/posts/${post.id}/`).then(() => {
                                                                    setPosts((prev) => prev.filter((p) => p.id !== post.id));
                                                                }).catch(() => alert("Failed to delete post"));
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-6">
                                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>

                                                {/* Media Preview - Now fixed with relative path */}
                                                {mediaSrc && (
                                                    <div className="mt-4">
                                                        {post.media_type === "photo" && (
                                                            <img
                                                                src={mediaSrc}
                                                                alt="Post media"
                                                                className="max-w-full h-auto rounded-lg cursor-pointer object-contain"
                                                                onClick={() => setZoomMediaUrl(mediaSrc)}
                                                            />
                                                        )}

                                                        {post.media_type === "video" && (
                                                            <video controls className="max-w-full h-auto rounded-lg">
                                                                <source src={mediaSrc} type="video/mp4" />
                                                                Your browser does not support the video tag.
                                                            </video>
                                                        )}

                                                        {post.media_type === "audio" && (
                                                            <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                                <audio controls className="w-full">
                                                                    <source src={mediaSrc} type="audio/mpeg" />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Engagement Bar */}
                                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex items-center justify-between text-sm">
                                                <div className="flex items-center space-x-6">
                                                    <button
                                                        onClick={() => toggleLike(post.id, post.user_has_liked, post.likes_count)}
                                                        className={`flex items-center transition ${
                                                            post.user_has_liked ? "text-red-500" : "text-gray-500 hover:text-red-600"
                                                        }`}
                                                    >
                                                        <HeartIcon className={`w-5 h-5 ${post.user_has_liked ? "fill-current" : ""}`} />
                                                        <span className="ml-1.5">{post.likes_count ?? 0}</span>
                                                    </button>

                                                    <button
                                                        onClick={() => toggleComments(post.id)}
                                                        className="flex items-center text-gray-500 hover:text-blue-600 transition"
                                                    >
                                                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-1.5" />
                                                        {post.comments?.length ?? 0}
                                                    </button>

                                                    <button
                                                        onClick={() => handleShare(post.id)}
                                                        className="flex items-center text-gray-500 hover:text-green-600 transition"
                                                    >
                                                        <ShareIcon className="w-5 h-5 mr-1.5" />
                                                        Share
                                                    </button>
                                                </div>

                                                {mediaSrc && (
                                                    <button
                                                        onClick={() => {
                                                            const a = document.createElement("a");
                                                            a.href = mediaSrc;
                                                            a.download = `post-media-${post.id}`;
                                                            a.click();
                                                        }}
                                                        className="flex items-center text-gray-600 hover:text-gray-900 dark:hover:text-gray-300"
                                                    >
                                                        <DownloadIcon className="w-5 h-5 mr-1.5" />
                                                        Download
                                                    </button>
                                                )}
                                            </div>

                                            {/* Comments Section */}
                                            <AnimatePresence>
                                                {commentModals[post.id] && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                                            {(!post.comments || post.comments.length === 0) ? (
                                                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                                                    No comments yet
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-6">
                                                                    {(post.comments || []).map((comment) => (
                                                                        <div key={comment.id || comment.tempId} className="flex gap-4">
                                                                            <div className="shrink-0">
                                                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                                    {comment.user.username[0].toUpperCase()}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                                                                                    {comment.is_editing ? (
                                                                                        <div>
                                                                        <textarea
                                                                            value={comment.content}
                                                                            onChange={(e) =>
                                                                                setPosts((prev) =>
                                                                                    prev.map((p) =>
                                                                                        p.id === post.id
                                                                                            ? {
                                                                                                ...p,
                                                                                                comments: p.comments.map((c) =>
                                                                                                    (c.id || c.tempId) === (comment.id || comment.tempId)
                                                                                                        ? { ...c, content: e.target.value }
                                                                                                        : c
                                                                                                ),
                                                                                            }
                                                                                            : p
                                                                                    )
                                                                                )
                                                                            }
                                                                            className="w-full p-2 border rounded dark:bg-gray-700"
                                                                        />
                                                                                            <div className="mt-2 flex gap-3">
                                                                                                <button
                                                                                                    onClick={() => saveEditedComment(post.id, comment.id!, comment.content)}
                                                                                                    className="text-sm text-green-600 hover:underline"
                                                                                                >
                                                                                                    Save
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() =>
                                                                                                        setPosts((prev) =>
                                                                                                            prev.map((p) =>
                                                                                                                p.id === post.id
                                                                                                                    ? {
                                                                                                                        ...p,
                                                                                                                        comments: p.comments.map((c) =>
                                                                                                                            (c.id || c.tempId) === (comment.id || comment.tempId)
                                                                                                                                ? { ...c, is_editing: false }
                                                                                                                                : c
                                                                                                                        ),
                                                                                                                    }
                                                                                                                    : p
                                                                                                            )
                                                                                                        )
                                                                                                    }
                                                                                                    className="text-sm text-gray-500 hover:underline"
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <p className="font-medium">{comment.user.full_name}</p>
                                                                                            <p>{comment.content}</p>
                                                                                        </>
                                                                                    )}
                                                                                </div>

                                                                                <div className="mt-1 flex gap-4 text-xs text-gray-500">
                                                                                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                                                                                    {comment.user.id === user?.id && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => startEditComment(post.id, comment.id!, comment.content)}
                                                                                                className="hover:text-blue-600"
                                                                                            >
                                                                                                Edit
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => deleteComment(post.id, comment.id!)}
                                                                                                className="hover:text-red-600"
                                                                                            >
                                                                                                Delete
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* New Comment Input */}
                                                            <div className="mt-6 flex gap-3">
                                                                <input
                                                                    type="text"
                                                                    value={newComment[post.id] || ""}
                                                                    onChange={(e) =>
                                                                        setNewComment((prev) => ({ ...prev, [post.id]: e.target.value }))
                                                                    }
                                                                    placeholder="Write a comment..."
                                                                    className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleCommentSubmit(post.id);
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleCommentSubmit(post.id)}
                                                                    disabled={!newComment[post.id]?.trim()}
                                                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 transition"
                                                                >
                                                                    Send
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </article>
                                    );
                                })}

                                {/* Loader for infinite scroll */}
                                {hasMore && (
                                    <div ref={loaderRef} className="py-8 text-center">
                                        {loadingMore ? (
                                            <div className="flex justify-center">
                                                <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Loading more posts...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Create Post Modal */}
            <Transition appear show={showPostModal} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowPostModal(false)}>
                    {/* Backdrop */}
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </Transition.Child>

                    {/* Modal content */}
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
                                    {/* Title */}
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                        Create Post
                                    </Dialog.Title>

                                    {/* Textarea */}
                                    <textarea
                                        value={postContent}
                                        onChange={(e) => setPostContent(e.target.value)}
                                        placeholder="What's on your mind?"
                                        className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        maxLength={2000}
                                    />

                                    {/* Media Upload Buttons */}
                                    <div className="mt-6 flex flex-wrap gap-4">
                                        {/* Photo */}
                                        <label className="cursor-pointer flex flex-col items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <ImageIcon className="w-8 h-8 text-blue-500 mb-2" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handlePostMediaChange(e, "photo")}
                                            />
                                        </label>

                                        {/* Video */}
                                        <label className="cursor-pointer flex flex-col items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <VideoCameraIcon className="w-8 h-8 text-purple-500 mb-2" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Video</span>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={(e) => handlePostMediaChange(e, "video")}
                                            />
                                        </label>

                                        {/* Voice */}
                                        <button
                                            type="button"
                                            onClick={recording ? stopRecording : startRecording}
                                            className={`flex flex-col items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg transition-all ${
                                                recording
                                                    ? "bg-red-500 text-white border-red-600 shadow-red-500/30"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            <MicrophoneIcon className="w-8 h-8 mb-2" />
                                            <span className="text-sm font-medium">
                  {recording ? "Stop Recording" : "Voice"}
                </span>
                                        </button>
                                    </div>

                                    {/* Media Preview in modal */}
                                    {postMediaPreview && (
                                        <div className="mt-6 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-700">
                                            {renderMedia(postMediaPreview, postMediaType, true)}
                                        </div>
                                    )}

                                    {/* Privacy & Announcement */}
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Privacy
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={postPrivacy}
                                                    onChange={(e) => setPostPrivacy(e.target.value as any)}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="public">Public</option>
                                                    <option value="friends">Friends</option>
                                                    <option value="private">Private</option>
                                                    <option value="specific">Specific Users</option>
                                                </select>
                                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {postPrivacy === "specific" && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Select Users
                                                </label>
                                                <select
                                                    multiple
                                                    value={selectedUsers.map(String)}
                                                    onChange={(e) =>
                                                        setSelectedUsers(
                                                            Array.from(e.target.selectedOptions, (opt) => Number(opt.value))
                                                        )
                                                    }
                                                    className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {allUsers.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.full_name} (@{u.username})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {isSuperUser && (
                                        <div className="mt-6">
                                            <label className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isAnnouncement}
                                                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Post as Announcement
                  </span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="mt-10 flex justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowPostModal(false)}
                                            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePostSubmit}
                                            disabled={loading || (!postContent.trim() && !postMedia)}
                                            className={`px-8 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                                                loading || (!postContent.trim() && !postMedia)
                                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                            }`}
                                        >
                                            {loading ? (
                                                <>
                                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                    Posting...
                                                </>
                                            ) : (
                                                "Post"
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Zoom Modal */}
            <Transition appear show={!!zoomMediaUrl} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setZoomMediaUrl(null)}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="relative max-w-6xl w-full">
                                    {zoomMediaUrl && (
                                        <>
                                            <img
                                                src={zoomMediaUrl}
                                                alt="Zoomed media"
                                                className="max-h-[90vh] w-auto mx-auto rounded-2xl shadow-2xl object-contain"
                                            />
                                            <button
                                                onClick={() => setZoomMediaUrl(null)}
                                                className="absolute top-6 right-6 bg-black/60 text-white p-4 rounded-full hover:bg-black/80 transition backdrop-blur-sm"
                                            >
                                                <XIcon className="w-8 h-8" />
                                            </button>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ProfilePage;