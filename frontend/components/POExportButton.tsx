// frontend/components/POExportButton.tsx
import { PDFDownloadLink } from "@react-pdf/renderer";
import PODocument from "./pdf/PODocument";

interface POExportButtonProps {
    po: any;
}

export default function POExportButton({ po }: POExportButtonProps) {
    const company = {
        name: "High Prosper Ltd",
        address: "123 Business Avenue, Nairobi, Kenya",
        phone: "+254 700 000 000",
        email: "procurement@highprosper.com",
    };

    return (
        <PDFDownloadLink
            document={<PODocument po={po} company={company} logoUrl="/logo.png" />}
            fileName={`PO-${po.po_number}.pdf`}
        >
            {({ loading }) => (
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md">
                    {loading ? "Preparing PO..." : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PO PDF
                        </>
                    )}
                </button>
            )}
        </PDFDownloadLink>
    );
}