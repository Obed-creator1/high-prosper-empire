// components/PayslipPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

// Register elite font
Font.register({
    family: "Roboto",
    fonts: [
        { src: "/fonts/Roboto-Regular.ttf" },
        { src: "/fonts/Roboto-Bold.ttf", fontWeight: "bold" },
    ],
});

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Roboto", backgroundColor: "#f9fafb" },
    header: { marginBottom: 30, textAlign: "center" },
    logo: { width: 90, height: 90, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: "bold", color: "#1e293b" },
    subtitle: { fontSize: 16, color: "#64748b", marginTop: 6, fontWeight: "bold" },
    section: { marginBottom: 24 },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: "#f1f5f9",
        borderRadius: 8,
        marginBottom: 8,
    },
    label: { fontSize: 13, color: "#475569", fontWeight: "bold" },
    value: { fontSize: 13, color: "#0f172a", textAlign: "right", flex: 1, fontWeight: "bold" },
    totalRow: {
        backgroundColor: "#ecfdf5",
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 2,
        borderColor: "#10b981",
    },
    totalLabel: { fontSize: 18, fontWeight: "bold", color: "#065f46" },
    totalValue: { fontSize: 26, fontWeight: "bold", color: "#065f46", textAlign: "right" },
    footer: { marginTop: 60, textAlign: "center", fontSize: 11, color: "#94a3b8" },
    qr: { width: 100, height: 100, alignSelf: "center", marginTop: 30 },
});

interface StaffProfile {
    user?: {
        username?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
    } | null;
    department?: string;
    position?: string;
    salary?: string | number;
    profile_photo?: string;
}

interface Payroll {
    id: string | number;
    year: number;
    month?: string;
    bonus?: string | number;
    total?: string | number;
}

interface PayslipPDFProps {
    payroll: Payroll;
    staff: StaffProfile;
}

export const PayslipPDF = ({ payroll, staff }: PayslipPDFProps) => {
    // ULTRA-SAFE NAME EXTRACTION — WILL NEVER CRASH
    const getEmployeeName = () => {
        if (!staff) return "Employee";
        if (staff.user) {
            const { first_name = "", last_name = "", username = "Employee" } = staff.user;
            const full = `${first_name} ${last_name}`.trim();
            return full || username || "Employee";
        }
        return "Employee";
    };

    const employeeName = getEmployeeName();
    const department = staff?.department || "Unassigned";
    const position = staff?.position || "Employee";
    const baseSalary = Number(staff?.salary || 0);
    const bonus = Number(payroll.bonus || 0);
    const netPay = Number(payroll.total || baseSalary + bonus);

    const payPeriod = payroll.month
        ? `${new Date(payroll.year, new Date(Date.parse(payroll.month + " 1")).getMonth()).toLocaleString("default", { month: "long" })} ${payroll.year}`
        : `${new Date().toLocaleString("default", { month: "long" })} ${payroll.year}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* HEADER — EMPIRE AESTHETIC */}
                <View style={styles.header}>
                    <Image style={styles.logo} src="/logo.png" />
                    <Text style={styles.title}>HIGH PROSPER SERVICES</Text>
                    <Text style={styles.subtitle}>Official Payslip • {payPeriod}</Text>
                </View>

                {/* EMPLOYEE DETAILS */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Employee Name</Text>
                        <Text style={styles.value}>{employeeName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Position</Text>
                        <Text style={styles.value}>{position}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Department</Text>
                        <Text style={styles.value}>{department}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Pay Period</Text>
                        <Text style={styles.value}>{payPeriod}</Text>
                    </View>
                </View>

                {/* EARNINGS BREAKDOWN */}
                <View style={styles.section}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 14, color: "#1e293b" }}>
                        Earnings Summary
                    </Text>

                    <View style={styles.row}>
                        <Text style={styles.label}>Base Salary</Text>
                        <Text style={styles.value}>{baseSalary.toLocaleString()} CFA</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Performance Bonus</Text>
                        <Text style={styles.value}>+{bonus.toLocaleString()} CFA</Text>
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>NET PAY</Text>
                        <Text style={styles.totalValue}>{netPay.toLocaleString()} CFA</Text>
                    </View>
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                    <Text>Generated on {format(new Date(), "dd MMMM yyyy 'at' HH:mm")}</Text>
                    <Text>HIGH PROSPER SERVICES • Empire of Excellence & Precision</Text>
                    <Text>www.highprosper.com • payroll@highprosper.com</Text>
                </View>

                {/* SECURE QR CODE */}
                <Image
                    style={styles.qr}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=HPS-PAYSLIP-${payroll.id}-${Date.now()}`}
                />
            </Page>
        </Document>
    );
};