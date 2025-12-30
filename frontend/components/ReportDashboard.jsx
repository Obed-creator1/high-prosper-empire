import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

const ReportsDashboard = () => {
    const [categories, setCategories] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = useSelector(state => state.auth.token);

    useEffect(() => {
        fetchCategories();
        fetchTemplates();
        fetchReports();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/reports/categories/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get('/reports/templates/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchReports = async () => {
        try {
            const response = await axios.get('/reports/my_reports/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reports:', error);
            setLoading(false);
        }
    };

    const generateReport = async (templateId, parameters = {}) => {
        try {
            const response = await axios.post('/reports/reports/', {
                title: `Report - ${new Date().toISOString().split('T')[0]}`,
                template_id: templateId,
                parameters,
                format: 'excel',
                priority: 'normal'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Report generation started! ID: ${response.data.report_id}`);
            fetchReports(); // Refresh reports list
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report');
        }
    };

    if (loading) return <div className="loading">Loading reports...</div>;

    return (
        <div className="reports-dashboard">
            <div className="dashboard-header">
                <h1>📊 Enterprise Reports Dashboard</h1>
                <button className="btn-primary" onClick={() => fetchReports()}>
                    🔄 Refresh
                </button>
            </div>

            <div className="reports-grid">
                {/* Templates Section */}
                <div className="templates-section">
                    <h2>📋 Available Reports</h2>
                    <div className="templates-grid">
                        {templates.map(template => (
                            <div key={template.id} className="template-card"
                                 onClick={() => generateReport(template.id)}>
                                <div className="template-icon">{template.category_icon}</div>
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>
                                <span className="template-type">{template.report_type}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Reports */}
                <div className="recent-reports">
                    <h2>📈 Recent Reports</h2>
                    <div className="reports-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Format</th>
                                <th>Completed</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {reports.map(report => (
                                <tr key={report.id}>
                                    <td>{report.title}</td>
                                    <td>
                      <span className={`status status-${report.status}`}>
                        {report.status}
                      </span>
                                    </td>
                                    <td>{report.format.toUpperCase()}</td>
                                    <td>
                                        {report.completed_at ?
                                            new Date(report.completed_at).toLocaleDateString() :
                                            'Generating...'}
                                    </td>
                                    <td>
                                        {report.status === 'completed' && report.file_url && (
                                            <a href={report.file_url} download className="btn-download">
                                                📥 Download
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsDashboard;