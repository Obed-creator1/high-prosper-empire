"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import Image from "next/image";
import {Pencil, Trash2, FileText, Download} from "lucide-react";
import * as XLSX from "xlsx";

type StaffProfile = {
    id: number;
    user: {
        username: string;
        email: string;
        phone_number?: string;
        profile_picture?: string | null;
    };
    department: string;
    salary: number;
    status: string;
};

type Task = { id: number; title: string; status: string; due_date: string };
type Attendance = { id: number; date: string; status: string };
type Leave = { id: number; start_date: string; end_date: string; status: string };
type Complaint = { id: number; subject: string; status: string; created_at: string };
type Loan = { id: number; amount: number; status: string };
type Mission = { id: number; title: string; status: string };
type ExtraWork = { id: number; date: string; hours: number; approved: boolean };
type Vacation = { id: string; start_date: string; end_date: string; status: string };

export default function StaffPage() {
    const params = useParams();
    const id = params?.id as string;

    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [extraWorks, setExtraWorks] = useState<ExtraWork[]>([]);
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaffData = async () => {
            try {
                setLoading(true);
                const [
                    profileRes,
                    tasksRes,
                    attendanceRes,
                    leaveRes,
                    complaintRes,
                    loanRes,
                    missionRes,
                    extraWorkRes,
                    vacationRes
                ] = await Promise.all([
                    api.get(`/hr/staff/${id}/`),
                    api.get(`/hr/tasks/?staff=${id}`),
                    api.get(`/hr/attendance/?staff=${id}`),
                    api.get(`/hr/leave/?staff=${id}`),
                    api.get(`/hr/complaints/?staff=${id}`),
                    api.get(`/hr/loans/?staff=${id}`),
                    api.get(`/hr/missions/?staff=${id}`),
                    api.get(`/hr/extra-works/?staff=${id}`),
                    api.get(`/hr/vacations/?staff=${id}`)
                ]);

                setProfile(profileRes.data);
                setTasks(tasksRes.data);
                setAttendance(attendanceRes.data);
                setLeaves(leaveRes.data);
                setComplaints(complaintRes.data);
                setLoans(loanRes.data);
                setMissions(missionRes.data);
                setExtraWorks(extraWorkRes.data);
                setVacations(vacationRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStaffData();
    }, [id]);

    const exportExcel = (data: any[], fileName: string) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    const exportPDF = async (data: any[], filename: string, columns: string[]) => {
        try {
            const jsPDFModule = await import("jspdf");
            await import("jspdf-autotable");

            const doc = new jsPDFModule.jsPDF() as any; // <-- cast to 'any'
            doc.autoTable({
                head: [columns],
                body: data.map((row) => columns.map((col) => row[col])),
            });
            doc.save(`${filename}.pdf`);
        } catch (err) {
            console.error("PDF export failed:", err);
        }
    };

    if (loading) return <div className="p-4">Loading staff profile...</div>;
    if (!profile) return <div className="p-4">Staff not found</div>;

    return (
        <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
                <Image
                    src={profile.user.profile_picture || "/default-avatar.png"}
                    alt={profile.user.username}
                    width={80}
                    height={80}
                    className="rounded-full"
                />
                <div>
                    <h1 className="text-2xl font-bold">{profile.user.username}</h1>
                    <p className="text-gray-600">{profile.department} | Salary: ${profile.salary}</p>
                    <p className={`text-sm ${profile.status === "Active" ? "text-green-600" : "text-red-600"}`}>{profile.status}</p>
                </div>
                <button className="ml-auto p-2 bg-blue-500 text-white rounded flex items-center gap-2"><Pencil size={16}/> Edit</button>
            </div>

            {/* Quick Export Actions */}
            <button onClick={() => exportPDF(tasks, "tasks", ["id","title","status","due_date"])} className="p-2 bg-red-500 text-white rounded flex items-center gap-1 mb-2">
                <Download size={16} /> Export PDF
            </button>

            {/* Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tasks, Attendance, Leaves, Complaints, Loans, Missions, Extra Work, Vacations */}
                {[
                    { title: "Tasks", data: tasks, columns: ["title", "status", "due_date"] },
                    { title: "Attendance", data: attendance, columns: ["date", "status"] },
                    { title: "Leaves", data: leaves, columns: ["start_date", "end_date", "status"] },
                    { title: "Complaints", data: complaints, columns: ["subject", "status", "created_at"] },
                    { title: "Loans", data: loans, columns: ["amount", "status"] },
                    { title: "Missions", data: missions, columns: ["title", "status"] },
                    { title: "Extra Work", data: extraWorks, columns: ["date", "hours", "approved"] },
                    { title: "Vacations", data: vacations, columns: ["start_date", "end_date", "status"] },
                ].map(section => (
                    <div key={section.title} className="bg-white dark:bg-gray-800 rounded shadow p-4">
                        <h2 className="font-semibold mb-2">{section.title}</h2>
                        <table className="w-full table-auto border-collapse border border-gray-200 dark:border-gray-700">
                            <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                {section.columns.map(col => <th key={col} className="p-2 border">{col.replace("_", " ").toUpperCase()}</th>)}
                            </tr>
                            </thead>
                            <tbody>
                            {section.data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    {section.columns.map(col => (
                                        <td key={col} className="p-2 border">
                                            {col.includes("date") ? new Date(item[col]).toLocaleDateString() : String(item[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
}
