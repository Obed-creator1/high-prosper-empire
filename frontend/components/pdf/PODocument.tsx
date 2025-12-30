// frontend/components/pdf/PODocument.tsx
import { Document, Page, Text, View, StyleSheet, PDFViewer, Image, Font } from "@react-pdf/renderer";

Font.register({
    family: "Roboto",
    src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium.ttf",
});

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Roboto", fontSize: 11, color: "#1f2937", backgroundColor: "#fff" },
    header: { marginBottom: 30, borderBottom: 3, borderBottomColor: "#1e40af", paddingBottom: 20 },
    logo: { width: 90, height: 90, marginBottom: 15 },
    title: { fontSize: 32, fontWeight: "bold", color: "#1e40af", marginBottom: 8 },
    poNumber: { fontSize: 18, color: "#1e40af", fontWeight: "bold" },
    section: { marginBottom: 25 },
    row: { flexDirection: "row", marginBottom: 10 },
    label: { width: 140, fontWeight: "bold", color: "#374151" },
    value: { flex: 1, color: "#111827" },
    addressBox: { border: 1, borderColor: "#e5e7eb", padding: 12, borderRadius: 6, minHeight: 100 },
    table: { marginTop: 20 },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#172554",
        color: "white",
        padding: 12,
        fontWeight: "bold",
        fontSize: 12,
    },
    tableRow: { flexDirection: "row", padding: 10, borderBottom: 1, borderBottomColor: "#e5e7eb" },
    colNo: { width: "8%", textAlign: "center" },
    colDesc: { width: "48%" },
    colQty: { width: "12%", textAlign: "center" },
    colPrice: { width: "15%", textAlign: "right" },
    colTotal: { width: "17%", textAlign: "right", fontWeight: "bold" },
    summaryBox: { marginTop: 30, alignSelf: "flex-end", width: "50%" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: "#1e40af",
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 10,
        borderRadius: 6,
    },
    footer: { marginTop: 50, fontSize: 10, color: "#6b7280", textAlign: "center" },
    terms: { marginTop: 30, fontSize: 10, lineHeight: 1.6 },
});

interface PODocumentProps {
    po: any;
    company: { name: string; address: string; phone: string; email: string };
    logoUrl?: string;
}

export default function PODocument({ po, company, logoUrl }: PODocumentProps) {
    const subtotal = po.items.reduce((sum: number, item: any) => sum + item.quantity_ordered * item.unit_price, 0);
    const tax = po.tax_amount || 0;
    const grandTotal = po.grand_total || subtotal + tax;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    {logoUrl && <Image style={styles.logo} src={logoUrl} />}
                    <Text style={styles.title}>PURCHASE ORDER</Text>
                    <Text style={styles.poNumber}>{po.po_number}</Text>
                </View>

                {/* Addresses */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 30 }}>
                    <View style={{ width: "48%" }}>
                        <Text style={{ fontWeight: "bold", marginBottom: 8, fontSize: 13 }}>FROM:</Text>
                        <View style={styles.addressBox}>
                            <Text style={{ fontWeight: "bold", fontSize: 14 }}>{company.name}</Text>
                            <Text>{company.address}</Text>
                            <Text>Phone: {company.phone}</Text>
                            <Text>Email: {company.email}</Text>
                        </View>
                    </View>

                    <View style={{ width: "48%" }}>
                        <Text style={{ fontWeight: "bold", marginBottom: 8, fontSize: 13 }}>TO (Supplier):</Text>
                        <View style={styles.addressBox}>
                            <Text style={{ fontWeight: "bold", fontSize: 14 }}>{po.supplier_name}</Text>
                            <Text>{po.supplier?.address || "Address not provided"}</Text>
                            <Text>Contact: {po.supplier?.contact_person || "—"}</Text>
                            <Text>Email: {po.supplier?.email}</Text>
                        </View>
                    </View>
                </View>

                {/* PO Details */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Order Date:</Text>
                        <Text style={styles.value}>{new Date(po.order_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Expected Delivery:</Text>
                        <Text style={styles.value}>{new Date(po.expected_delivery_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Terms:</Text>
                        <Text style={styles.value}>{po.payment_terms || "Net 30 Days"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Delivery Address:</Text>
                        <Text style={styles.value}>{po.delivery_address}</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colNo}>#</Text>
                        <Text style={styles.colDesc}>Item Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Unit Price</Text>
                        <Text style={styles.colTotal}>Line Total</Text>
                    </View>

                    {po.items.map((item: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colNo}>{i + 1}</Text>
                            <Text style={styles.colDesc}>
                                {item.item ? `[${item.item.sku}] ${item.item.name}` : item.description}
                            </Text>
                            <Text style={styles.colQty}>{item.quantity_ordered} {item.item?.unit_of_measure || ""}</Text>
                            <Text style={styles.colPrice}>${parseFloat(item.unit_price).toFixed(2)}</Text>
                            <Text style={styles.colTotal}>
                                ${(item.quantity_ordered * item.unit_price).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                        <Text>Subtotal:</Text>
                        <Text>${subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text>Tax ({po.tax_rate || 0}%):</Text>
                        <Text>${tax.toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text>TOTAL AMOUNT:</Text>
                        <Text>${grandTotal.toFixed(2)} {po.currency}</Text>
                    </View>
                </View>

                {/* Terms & Notes */}
                {(po.notes || po.payment_terms) && (
                    <View style={styles.terms}>
                        <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Terms & Conditions:</Text>
                        <Text>• Payment: {po.payment_terms || "Net 30 days from invoice date"}</Text>
                        <Text>• Delivery: As specified above</Text>
                        {po.notes && <Text>• Notes: {po.notes}</Text>}
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text>Generated on {new Date().toLocaleString()} • High Prosper ERP System © 2025</Text>
                </View>
            </Page>
        </Document>
    );
}