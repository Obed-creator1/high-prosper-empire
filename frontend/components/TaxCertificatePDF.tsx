// components/TaxCertificatePDF.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from "@react-pdf/renderer";
import { format } from "date-fns";

// Optional: Use a professional font (download and place in public/fonts/)
Font.register({
    family: "Roboto",
    fonts: [
        { src: "/fonts/Roboto-Regular.ttf" },
        { src: "/fonts/Roboto-Bold.ttf", fontWeight: "bold" },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 50,
        fontFamily: "Roboto",
        backgroundColor: "#ffffff",
    },
    header: {
        marginBottom: 40,
        textAlign: "center",
        borderBottom: 3,
        borderBottomColor: "#10b981",
        paddingBottom: 20,
    },
    logo: {
        width: 90,
        height: 90,
        marginBottom: 15,
    },
    companyName: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 8,
    },
    companyInfo: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#065f46",
        marginTop: 20,
        marginBottom: 30,
        textTransform: "uppercase",
    },
    section: {
        marginBottom: 30,
        backgroundColor: "#f8fafc",
        padding: 20,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        fontSize: 14,
    },
    label: {
        fontWeight: "bold",
        color: "#374151",
    },
    value: {
        color: "#111827",
        fontWeight: "bold",
    },
    bigValue: {
        fontSize: 18,
        color: "#065f46",
    },
    footer: {
        marginTop: 60,
        borderTop: 2,
        borderTopColor: "#10b981",
        paddingTop: 20,
    },
    signatureBox: {
        marginTop: 40,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    signatureLine: {
        width: 200,
        borderBottom: 1,
        borderBottomColor: "#374151",
        paddingTop: 50,
        textAlign: "center",
        fontSize: 12,
        color: "#6b7280",
    },
    watermark: {
        position: "absolute",
        top: 300,
        left: 150,
        opacity: 0.1,
        fontSize: 80,
        fontWeight: "bold",
        color: "#10b981",
        transform: "rotate(-30deg)",
    },
});

interface TaxCertificatePDFProps {
    staff: any;
    year: number;
    gross: number;
    taxPaid: number;
    company?: {
        name: string;
        address: string;
        taxId: string;
        phone: string;
    };
}

export const TaxCertificatePDF = ({
                                      staff,
                                      year,
                                      gross,
                                      taxPaid,
                                      company = {
                                          name: "HIGH PROSPER SERVICES SARL",
                                          address: "Douala, Cameroun - Akwa, Rue des Finances",
                                          taxId: "M092312345678P",
                                          phone: "+237 6XX XXX XXX",
                                      },
                                  }: TaxCertificatePDFProps) => {
    const issueDate = new Date();

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Watermark */}
                <Text style={styles.watermark}>OFFICIAL</Text>

                {/* Header */}
                <View style={styles.header}>
                    <Image style={styles.logo} src="/logo.png" />
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyInfo}>{company.address}</Text>
                    <Text style={styles.companyInfo}>N° Contribuable: {company.taxId}</Text>
                    <Text style={styles.companyInfo}>Tél: {company.phone}</Text>
                    <Text style={styles.title}>
                        Attestation de Revenu Imposable (IRPP) - Année {year}
                    </Text>
                </View>

                {/* Employee Info */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nom et Prénoms:</Text>
                        <Text style={styles.value}>
                            {staff.user.get_full_name || staff.user.username || "N/A"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Matricule:</Text>
                        <Text style={styles.value}>{staff.id || "N/A"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Département:</Text>
                        <Text style={styles.value}>{staff.department || "N/A"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Année fiscale:</Text>
                        <Text style={styles.value}>{year}</Text>
                    </View>
                </View>

                {/* Tax Summary */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Revenu Brut Imposable:</Text>
                        <Text style={[styles.value, styles.bigValue]}>
                            {gross.toLocaleString()} FCFA
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Impôt sur le Revenu des Personnes Physiques (IRPP) retenu:</Text>
                        <Text style={[styles.value, styles.bigValue, { color: "#dc2626" }]}>
                            {taxPaid.toLocaleString()} FCFA
                        </Text>
                    </View>
                </View>

                {/* Declaration */}
                <View style={{ marginTop: 30, fontSize: 13, lineHeight: 1.6 }}>
                    <Text style={{ marginBottom: 15, textAlign: "justify" }}>
                        Je soussigné, Directeur Général de <Text style={{ fontWeight: "bold" }}>{company.name}</Text>,
                        atteste que les informations ci-dessus sont exactes et conformes aux registres de paie de l'entreprise
                        pour l'année fiscale {year}.
                    </Text>
                    <Text style={{ textAlign: "justify" }}>
                        La présente attestation est délivrée au salarié pour servir et valoir ce que de droit,
                        notamment auprès de l'Administration Fiscale Camerounaise.
                    </Text>
                </View>

                {/* Footer & Signatures */}
                <View style={styles.footer}>
                    <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 20 }}>
                        Fait à Douala, le {format(issueDate, "dd MMMM yyyy")}
                    </Text>

                    <View style={styles.signatureBox}>
                        <View>
                            <Text style={styles.signatureLine}>
                                Cachet de l'entreprise
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.signatureLine}>
                                Signature du Directeur Général
                            </Text>
                        </View>
                    </View>

                    <Text style={{ fontSize: 9, color: "#9ca3af", textAlign: "center", marginTop: 30 }}>
                        Document généré automatiquement par HIGH PROSPER SERVICES • {format(issueDate, "yyyy-MM-dd HH:mm")}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};