// app/dashboard/hr.../hr/staff/page.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import api from "@/lib/api";
import {
    Plus, Search, Edit, Trash2, UserPlus, AlertCircle, Building, DollarSign, FileText, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";

export default function StaffManagement() {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, any>>({});

    // SWR with your fixed API
    const { data: staffData, mutate: mutateStaff } = useSWR("/hr/staff/", () => api.get("/hr/staff/").then(r => r.data));
    const { data: usersData } = useSWR("/users/all-users/", () => api.get("/users/all-users/").then(r => r.data));

    const staffList = Array.isArray(staffData) ? staffData : staffData?.results || [];
    const users = Array.isArray(usersData) ? usersData : [];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrors({});

        const formData = new FormData(e.currentTarget);

        try {
            if (editingStaff) {
                await api.patch(`/hr/staff/${editingStaff.id}/`, formData);
                toast.success("Staff updated successfully!");
            } else {
                await api.post("/hr/staff/", formData);
                toast.success(isCreatingUser ? "New user + staff created!" : "Staff profile created!");
            }

            mutateStaff();
            setIsOpen(false);
            setEditingStaff(null);
            setIsCreatingUser(false);
        } catch (err: any) {
            const errData = err.response?.data || {};
            setErrors(errData);
            toast.error("Please fix the errors below");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Permanently delete this staff member?")) return;
        try {
            await api.delete(`/hr/staff/${id}/`);
            toast.success("Staff deleted");
            mutateStaff();
        } catch {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Staff Management
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Manage employee profiles • Link or create users • Upload contracts & photos
                    </p>
                </div>
                <Button size="lg" onClick={() => { setEditingStaff(null); setIsOpen(true); }}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add Staff
                </Button>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">
                            {editingStaff ? "Edit Staff Profile" : "Add New Staff"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingStaff ? "Update staff details" : "Link an existing user or create a new one"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Switcher */}
                    {!editingStaff && (
                        <div className="flex gap-3 mb-6 -mt-4">
                            <Button
                                type="button"
                                variant={!isCreatingUser ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsCreatingUser(false)}
                            >
                                Link Existing User
                            </Button>
                            <Button
                                type="button"
                                variant={isCreatingUser ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsCreatingUser(true)}
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create New User
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Alert */}
                        {Object.keys(errors).length > 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-5 w-5" />
                                <AlertTitle>Validation Errors</AlertTitle>
                                <AlertDescription className="mt-2 space-y-1">
                                    {Object.entries(errors).map(([field, msg]) => (
                                        <div key={field} className="text-sm">
                                            • <strong>{field}:</strong> {Array.isArray(msg) ? msg[0] : msg}
                                        </div>
                                    ))}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* USER SELECTION */}
                        {!isCreatingUser && !editingStaff && (
                            <div>
                                <Label>Select Existing User <span className="text-red-500">*</span></Label>
                                <Select name="user_id" required>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Search users..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        {users.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500">No users found</div>
                                        ) : (
                                            users.map((u: any) => (
                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={u.profile_picture} />
                                                            <AvatarFallback>{u.username[0].toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{u.username}</p>
                                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* CREATE NEW USER */}
                        {isCreatingUser && (
                            <div className="space-y-4 p-5 bg-gray-50 rounded-lg border">
                                <h3 className="font-semibold text-lg">New User Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>First Name <span className="text-red-500">*</span></Label>
                                        <Input name="first_name" required />
                                    </div>
                                    <div>
                                        <Label>Last Name <span className="text-red-500">*</span></Label>
                                        <Input name="last_name" required />
                                    </div>
                                </div>
                                <div>
                                    <Label>Email (will be username) <span className="text-red-500">*</span></Label>
                                    <Input type="email" name="email" required />
                                </div>
                                <div>
                                    <Label>Initial Password</Label>
                                    <Input name="password" defaultValue="default123" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        User will be forced to change password on first login
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* COMMON FIELDS */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label>Department <span className="text-red-500">*</span></Label>
                                <Select name="department" defaultValue={editingStaff?.department} required>
                                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                                    <SelectContent>
                                        {["HR", "Finance", "IT", "Operations", "Logistics", "Sales & Marketing", "Administration"].map(d => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select name="status" defaultValue={editingStaff?.status || "Active"}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                        <SelectItem value="On Leave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Monthly Salary (CFA) <span className="text-red-500">*</span></Label>
                            <Input type="number" name="salary" defaultValue={editingStaff?.salary} placeholder="750000" required />
                        </div>

                        <div>
                            <Label>Contract Details</Label>
                            <Textarea name="contract" rows={5} defaultValue={editingStaff?.contract} placeholder="Employment terms, benefits, probation period..." />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label>Contract File (PDF)</Label>
                                <Input type="file" name="contract_file" accept=".pdf" />
                                {editingStaff?.contract_file && (
                                    <a href={editingStaff.contract_file} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 block mt-2">
                                        Current file
                                    </a>
                                )}
                            </div>
                            <div>
                                <Label>Profile Photo</Label>
                                <Input type="file" name="profile_photo" accept="image/*" />
                                {editingStaff?.profile_photo && (
                                    <img src={editingStaff.profile_photo} alt="Current" className="w-24 h-24 rounded-full object-cover mt-3 border" />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <Button type="submit" size="lg" className="flex-1">
                                {editingStaff ? "Update Staff" : isCreatingUser ? "Create User + Staff" : "Create Staff Profile"}
                            </Button>
                            <Button type="button" variant="outline" size="lg" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Staff Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">All Staff Members</CardTitle>
                    <p className="text-muted-foreground">Total: {staffList.length} employees</p>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            No staff members yet. Click "Add Staff" to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffList.map((s: any) => (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={s.profile_photo} />
                                                        <AvatarFallback>{s.user?.username?.[0]?.toUpperCase() || "S"}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{s.user?.username || "Unknown"}</p>
                                                        <p className="text-sm text-muted-foreground">{s.user?.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{s.department || "—"}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {Number(s.salary || 0).toLocaleString()} CFA
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={s.status === "Active" ? "default" : s.status === "On Leave" ? "secondary" : "destructive"}>
                                                    {s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="ghost" onClick={() => { setEditingStaff(s); setIsOpen(true); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(s.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}