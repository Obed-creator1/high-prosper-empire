// Example: UsersExportButton.jsx or inside your UsersList component

import React, { useState } from 'react';
import { Button, Spin, message } from 'antd'; // ← using Ant Design (optional, you can replace with your own UI)

const UsersExportPDFButton = ({
                                  selectedRole = '',
                                  searchTerm = '',
                                  isActive = null,        // true / false / null
                                  dateFrom = '',          // 'YYYY-MM-DD'
                                  dateTo = '',            // 'YYYY-MM-DD'
                              }) => {
    const [loading, setLoading] = useState(false);

    const handleExportPDF = async () => {
        if (loading) return;

        setLoading(true);

        try {
            // Build query params safely
            const params = new URLSearchParams();

            if (selectedRole) params.append('role', selectedRole);
            if (searchTerm) params.append('search', searchTerm);
            if (isActive !== null && isActive !== undefined) {
                params.append('is_active', String(isActive)); // convert to string
            }
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const url = `/api/v1/users/admin/users/export_pdf/?${params.toString()}`;

            // Fetch with timeout (optional - prevents hanging forever)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Important for session/auth cookies
                signal: controller.signal,
                headers: {
                    // Add any custom headers if needed (e.g. Authorization)
                    // 'Authorization': `Bearer ${token}`,
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Export failed (${response.status}): ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/pdf')) {
                throw new Error('Response is not a PDF file');
            }

            const blob = await response.blob();

            // Create and trigger download
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `high_prosper_users_report_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            message.success('PDF report downloaded successfully!');
        } catch (error) {
            console.error('PDF Export Error:', error);

            let errorMessage = 'Failed to export PDF. Please try again.';

            if (error.name === 'AbortError') {
                errorMessage = 'Export timed out. The file may be too large.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('Export failed')) {
                errorMessage = error.message;
            }

            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="primary"
            onClick={handleExportPDF}
            disabled={loading}
            icon={loading ? <Spin size="small" /> : null}
        >
            {loading ? 'Exporting...' : 'Export PDF'}
        </Button>
    );
};

export default UsersExportPDFButton;