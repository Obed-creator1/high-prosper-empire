// app/payslip/[id]/page.tsx
import { PayslipPDF } from "@/components/PayslipPDF";
import useSWR from "swr";
import {PDFViewer} from "@react-pdf/renderer";

export default function MobilePayslip({ params }: { params: { id: string } }) {
    const { data: payroll } = useSWR(`/hr/payroll/${params.id}/`);
    const { data: staff } = useSWR(payroll ? `/hr/staff/${payroll.staff}/` : null);

    if (!payroll || !staff) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <PDFViewer width="100%" height="100vh">
                <PayslipPDF payroll={payroll} staff={staff} />
            </PDFViewer>
        </div>
    );
}