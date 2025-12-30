// app/dashboard/hr/payroll/page.tsx
"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { format } from "date-fns";
import {
    DollarSign, Users, Calendar, TrendingUp, Plus, Edit, Trash2,
    FileText, Download, Signature, CheckCircle2, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";
import SignatureCanvas from "react-signature-canvas";
import { BlobProvider, pdf } from "@react-pdf/renderer";
import { PayslipPDF } from "@/components/PayslipPDF";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// SAFE USER NAME & INITIALS EXTRACTOR — NEVER CRASHES
const getUserInfo = (staff: any) => {
    const user = staff?.user || {};
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const username = user.username || "Unknown";
    const fullName = `${firstName} ${lastName}`.trim() || username;
    const initials = fullName
        .split(" ")
        .map((n: string) => n[0]?.toUpperCase())
        .filter(Boolean)
        .join("")
        .slice(0, 2) || "??";
    const photo = staff?.profile_photo || user.profile_picture || null;

    return { fullName, initials, photo, username };
};

export default function PayrollPage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [signatureOpen, setSignatureOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
    const sigRef = useRef<any>(null);

    const { data: payrollData, mutate: mutatePayroll } = useSWR("/hr/payroll/", () => api.get("/hr/payroll/").then(r => r.data));
    const { data: staffData } = useSWR("/hr/staff/", () => api.get("/hr/staff/").then(r => r.data));

    const payrolls = Array.isArray(payrollData) ? payrollData : payrollData?.results || [];
    const staffList = Array.isArray(staffData) ? staffData : staffData?.results || [];

    const totalGross = payrolls.reduce((s: number, p: any) => s + Number(p.total || 0), 0);
    const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.net_pay || 0), 0);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const thisMonthCount = payrolls.filter((p: any) => p.month === currentMonth && p.year === currentYear).length;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            staff: formData.get("staff"),
            month: Number(formData.get("month")),
            year: Number(formData.get("year")),
            bonus: Number(formData.get("bonus") || 0),
        };

        try {
            if (editing) {
                await api.patch(`/hr/payroll/${editing.id}/`, payload);
                toast.success("Payroll updated!");
            } else {
                await api.post("/hr/payroll/", payload);
                toast.success("Payroll processed & emailed!");
            }
            mutatePayroll();
            setOpen(false);
            setEditing(null);
        } catch (err: any) {
            toast.error(err.response?.data?.non_field_errors?.[0] || "Failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this payroll record permanently?")) return;
        await api.delete(`/hr/payroll/${id}/`);
        toast.success("Deleted");
        mutatePayroll();
    };

    const handleApprove = async () => {
        if (!sigRef.current?.isEmpty()) {
            const signature = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
            await api.post(`/hr/payroll/${selectedPayroll.id}/approve/`, { signature, status: "approved" });
            toast.success("Approved & signed!");
            mutatePayroll();
            setSignatureOpen(false);
        } else {
            toast.error("Please sign first");
        }
    };

    const handleBulkExport = async () => {
        toast.loading("Generating ZIP...", { duration: 0 });
        const { default: JSZip } = await import("jszip");
        const { saveAs } = await import("file-saver");
        const zip = new JSZip();

        for (const p of payrolls) {
            const staff = staffList.find(s => s.id === p.staff);
            const blob = await pdf(<PayslipPDF payroll={p} staff={staff || {}} />).toBlob();
            const { username = "employee" } = getUserInfo(staff);
            zip.file(`Payslip_${username}_${MONTHS[p.month - 1]}_${p.year}.pdf`, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `HPS_Payslips_${format(new Date(), "yyyy-MM-dd")}.zip`);
        toast.dismiss();
        toast.success(`Exported ${payrolls.length} payslips!`);
    };

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                        Payroll Management
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        IRPP • CNPS • Advance Repayment • Digital Signature • Auto-Email
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button size="lg" onClick={handleBulkExport} className="bg-gradient-to-r from-purple-600 to-pink-600">
                        <Download className="mr-2 h-5 w-5" /> Export All (ZIP)
                    </Button>
                    <Button size="lg" onClick={() => { setEditing(null); setOpen(true); }}>
                        <Plus className="mr-2 h-5 w-5" /> Process Payroll
                    </Button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Total Gross</CardTitle><DollarSign className="h-5 w-5 text-emerald-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{totalGross.toLocaleString()} CFA</div></CardContent></Card>
                <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Total Net Paid</CardTitle><CheckCircle2 className="h-5 w-5 text-green-600" /></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{totalNet.toLocaleString()} CFA</div></CardContent></Card>
                <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">This Month</CardTitle><Calendar className="h-5 w-5 text-orange-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{thisMonthCount} paid</div></CardContent></Card>
                <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Avg Net Salary</CardTitle><TrendingUp className="h-5 w-5 text-purple-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{payrolls.length > 0 ? Math.round(totalNet / payrolls.length).toLocaleString() : 0} CFA</div></CardContent></Card>
            </div>

            {/* PROCESS DIALOG */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editing ? "Edit Payroll" : "Process New Payroll"}</DialogTitle>
                        <DialogDescription>Taxes & deductions calculated automatically</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label>Employee</Label>
                            <Select name="staff" defaultValue={editing?.staff?.toString()} required>
                                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                                <SelectContent>
                                    {staffList.map((s: any) => {
                                        const { fullName, initials, photo } = getUserInfo(s);
                                        return (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={photo} />
                                                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{fullName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {s.department || "Unassigned"} • Base: {Number(s.salary || 0).toLocaleString()} CFA
                                                        </p>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Month</Label><Select name="month" defaultValue={editing?.month?.toString() || currentMonth.toString()}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Year</Label><Input type="number" name="year" defaultValue={editing?.year || currentYear} required /></div>
                        </div>

                        <div><Label>Bonus (CFA)</Label><Input type="number" name="bonus" placeholder="0" defaultValue={editing?.bonus || 0} /></div>

                        <div className="flex gap-4">
                            <Button type="submit" size="lg" className="flex-1">{editing ? "Update" : "Process & Send"}</Button>
                            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* SIGNATURE MODAL */}
            <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Digital Signature Approval</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                        <div className="border-2 border-dashed rounded-xl"><SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-64 bg-white rounded-lg" }} /></div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => sigRef.current?.clear()}>Clear</Button>
                            <Button onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                <Signature className="mr-2 h-4 w-4" /> Approve & Sign
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* PAYROLL TABLE */}
            <Card>
                <CardHeader><CardTitle className="text-2xl">Payroll History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Base</TableHead>
                                <TableHead>Bonus</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Advance</TableHead>
                                <TableHead className="text-right">Net Pay</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payrolls.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No payroll records yet. Click "Process Payroll" to begin.</p>
                                </TableCell></TableRow>
                            ) : (
                                payrolls.map((p: any) => {
                                    const staff = staffList.find((s: any) => s.id === p.staff);
                                    const { fullName, initials, photo } = getUserInfo(staff);
                                    const isApproved = p.approval?.status === "approved";

                                    return (
                                        <TableRow key={p.id} className={isApproved ? "bg-green-50/50" : ""}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={photo} />
                                                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{fullName}</p>
                                                        <p className="text-sm text-muted-foreground">{staff?.department || "—"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant={isApproved ? "default" : "secondary"}>{MONTHS[p.month - 1]} {p.year}</Badge></TableCell>
                                            <TableCell>{Number(staff?.salary || 0).toLocaleString()} CFA</TableCell>
                                            <TableCell className="text-green-600 font-medium">+{Number(p.bonus || 0).toLocaleString()} CFA</TableCell>
                                            <TableCell className="text-right font-bold">{Number(p.total || 0).toLocaleString()} CFA</TableCell>
                                            <TableCell className="text-right">{Number(p.advance_deduction || 0) > 0 ? <span className="text-red-600 font-medium">-{Number(p.advance_deduction).toLocaleString()} CFA</span> : "—"}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 text-lg">{Number(p.net_pay || 0).toLocaleString()} CFA</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <BlobProvider document={<PayslipPDF payroll={p} staff={staff || {}} />}>
                                                    {({ url, loading }) => (
                                                        <Button size="sm" variant="ghost" disabled={loading} onClick={() => !loading && url && window.open(url!, "_blank")}>
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </BlobProvider>
                                                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                                {!isApproved && <Button size="sm" variant="ghost" onClick={() => { setSelectedPayroll(p); setSignatureOpen(true); }}><Signature className="h-4 w-4 text-blue-600" /></Button>}
                                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}