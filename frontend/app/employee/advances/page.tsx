// app/employee/advances/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { format } from "date-fns";
import {
    DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Calendar, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function SalaryAdvancePage() {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");

    const { data: advances, mutate } = useSWR("/hr/salary-advance/", () =>
        api.get("/hr/salary-advance/").then(r => r.data.results || r.data)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !reason) return;

        try {
            await api.post("/hr/salary-advance/", {
                amount: Number(amount),
                reason
            });
            toast.success("Salary advance request sent successfully!");
            setOpen(false);
            setAmount("");
            setReason("");
            mutate();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to submit request");
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "approved": return <CheckCircle className="h-5 w-5 text-green-600" />;
            case "rejected": return <XCircle className="h-5 w-5 text-red-600" />;
            case "pending": return <Clock className="h-5 w-5 text-yellow-600" />;
            default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case "approved": return "default";
            case "rejected": return "destructive";
            case "pending": return "secondary";
            default: return "outline";
        }
    };

    return (
        <div className="space-y-8 p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Salary Advance Requests
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        Request early access to your salary • 3-month repayment • Auto-deducted
                    </p>
                </div>
                <Button size="lg" onClick={() => setOpen(true)} className="shadow-lg">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Request Advance
                </Button>
            </div>

            {/* Request Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Request Salary Advance</DialogTitle>
                        <DialogDescription>
                            Your advance will be repaid automatically over 3 months from future salaries.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="amount">Amount (CFA)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="e.g. 150000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                min="10000"
                                max="500000"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Maximum: 500,000 CFA • Minimum: 10,000 CFA
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason for Advance</Label>
                            <Textarea
                                id="reason"
                                placeholder="Medical emergency, school fees, etc..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" className="flex-1">
                                Submit Request
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Advances List */}
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Your Advance History</h2>

                {!advances ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
                    </div>
                ) : advances.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-16">
                            <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-xl text-muted-foreground">No advance requests yet</p>
                            <p className="text-muted-foreground mt-2">Click "Request Advance" when you need early salary access</p>
                        </CardContent>
                    </Card>
                ) : (
                    advances.map((advance: any) => (
                        <Card key={advance.id} className="overflow-hidden">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <p className="text-3xl font-bold text-emerald-600">
                                                {Number(advance.amount).toLocaleString()} CFA
                                            </p>
                                            {getStatusIcon(advance.status)}
                                        </div>
                                        <Badge variant={getStatusVariant(advance.status)}>
                                            {advance.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>Requested</p>
                                        <p className="font-medium">{format(new Date(advance.requested_at), "dd MMM yyyy")}</p>
                                        {advance.approved_at && (
                                            <p className="text-green-600 text-xs mt-1">
                                                Approved {format(new Date(advance.approved_at), "dd MMM yyyy")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {advance.reason && (
                                <CardContent>
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">Reason:</p>
                                        <p className="text-sm">{advance.reason}</p>
                                    </div>
                                </CardContent>
                            )}

                            {advance.status === "approved" && advance.repayments && advance.repayments.length > 0 && (
                                <CardContent className="border-t">
                                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Repayment Schedule (3 months)
                                    </h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Month</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {advance.repayments.map((rep: any) => (
                                                <TableRow key={rep.id}>
                                                    <TableCell>
                                                        {MONTHS[new Date(rep.due_date).getMonth()]} {new Date(rep.due_date).getFullYear()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {Number(rep.amount).toLocaleString()} CFA
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={rep.paid ? "default" : "secondary"}>
                                                            {rep.paid ? "Paid" : "Pending"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}