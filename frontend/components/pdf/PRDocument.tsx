// frontend/components/pdf/PRDocument.tsx
import { Document, Page, Text, View, StyleSheet, PDFViewer, Font, Image } from "@react-pdf/renderer";

// Optional: Add nice font
Font.register({
    family: "Roboto",
    src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium.ttf",
});

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Roboto", fontSize: 11, color: "#1f2937" },
    header: { marginBottom: 30, borderBottom: 2, borderBottomColor: "#3b82f6", paddingBottom: 15 },
    title: { fontSize: 28, fontWeight: "bold", color: "#1e40af", marginBottom: 8 },
    subtitle: { fontSize: 14, color: "#6b7280" },
    section: { marginBottom: 25 },
    row: { flexDirection: "row", marginBottom: 8 },
    label: { width: 140, fontWeight: "bold", color: "#374151" },
    value: { flex: 1, color: "#111827" },
    table: { marginTop: 20 },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#eff6ff",
        padding: 10,
        fontWeight: "bold",
        borderBottom: 1,
        borderBottomColor: "#1e40af",
    },
    tableRow: { flexDirection: "row", padding: 10, borderBottom: 1, borderBottomColor: "#e5e7eb" },
    colNo: { width: "8%", textAlign: "center" },
    colDesc: { width: "45%" },
    colQty: { width: "12%", textAlign: "center" },
    colPrice: { width: "15%", textAlign: "right" },
    colTotal: { width: "20%", textAlign: "right", fontWeight: "bold" },
    footer: { marginTop: 40, borderTop: 2, borderTopColor: "#3b82f6", paddingTop: 15 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20 },
    totalLabel: { fontSize: 16, fontWeight: "bold", marginRight: 20 },
    totalValue: { fontSize: 18, fontWeight: "bold", color: "#1e40af" },
    logo: { width: 80, height: 80, marginBottom: 15 },
});

interface PRDocumentProps {
    pr: any;
    companyName?: string;
    logoUrl?: string;
}

export default function PRDocument({ pr, companyName = "High Prosper Ltd", logoUrl }: PRDocumentProps) {
    const total = pr.items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price_estimated, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    {logoUrl && <Image style={styles.logo} src={logoUrl} />}
                    <Text style={styles.title}>PURCHASE REQUISITION</Text>
                    <Text style={styles.subtitle}>{pr.pr_number}</Text>
                </View>

                {/* Info Grid */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Company:</Text>
                        <Text style={styles.value}>{companyName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Title:</Text>
                        <Text style={styles.value}>{pr.title}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Requester:</Text>
                        <Text style={styles.value}>{pr.requester_name || pr.requester?.get_full_name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Department:</Text>
                        <Text style={styles.value}>{pr.department || "—"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Required By:</Text>
                        <Text style={styles.value}>{new Date(pr.required_by_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status:</Text>
                        <Text style={{ ...styles.value, textTransform: "uppercase", fontWeight: "bold" }}>
                            {pr.status}
                        </Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colNo}>No</Text>
                        <Text style={styles.colDesc}>Item Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Unit Price</Text>
                        <Text style={styles.colTotal}>Line Total</Text>
                    </View>

                    {pr.items.map((item: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colNo}>{i + 1}</Text>
                            <Text style={styles.colDesc}>
                                {item.item ? `[${item.item.sku}] ${item.item.name}` : item.description}
                            </Text>
                            <Text style={styles.colQty}>{item.quantity} {item.item?.unit_of_measure}</Text>
                            <Text style={styles.colPrice}>${parseFloat(item.unit_price_estimated).toFixed(2)}</Text>
                            <Text style={styles.colTotal}>
                                ${(item.quantity * item.unit_price_estimated).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL ESTIMATED AMOUNT:</Text>
                    <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                </View>

                {/* Notes */}
                {pr.notes && (
                    <View style={styles.footer}>
                        <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Notes / Special Instructions:</Text>
                        <Text>{pr.notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={{ marginTop: 50, fontSize: 9, color: "#6b7280", textAlign: "center" }}>
                    <Text>Generated on {new Date().toLocaleString()}</Text>
                    <Text>High Prosper ERP System © 2025</Text>
                </View>
            </Page>
        </Document>
    );
}