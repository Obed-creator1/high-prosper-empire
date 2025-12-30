// components/reports/PDFReportGenerator.tsx
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

interface PDFReportGeneratorProps {
    title: string;
    data: any[];
    columns: { header: string; accessor: string }[];
    filename?: string;
}

export function PDFReportGenerator({ title, data, columns, filename }: PDFReportGeneratorProps) {
    const generatePDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');

        // Header
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246); // blue-500
        doc.text(title, 148, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 148, 28, { align: 'center' });

        // Logo placeholder
        doc.setDrawColor(200);
        doc.roundedRect(10, 10, 40, 20, 3, 3, 'S');
        doc.setFontSize(12);
        doc.text('HPS', 30, 22, { align: 'center' });

        // Table
        const tableData = data.map(row =>
            columns.map(col => {
                const value = row[col.accessor];
                return typeof value === 'number' ? value.toLocaleString() : value || '-';
            })
        );

        const headers = columns.map(col => col.header);

        (doc as any).autoTable({
            head: [headers],
            body: tableData,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, 280, 200, { align: 'right' });
            doc.text('© 2025 High Prosper Services', 15, 200);
        }

        doc.save(`${filename || title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <Button onClick={generatePDF} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
        </Button>
    );
}