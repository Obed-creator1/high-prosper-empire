'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
    { month: 'Jan', revenue: 120000, expenses: 85000 },
    { month: 'Feb', revenue: 135000, expenses: 92000 },
    { month: 'Mar', revenue: 148000, expenses: 88000 },
    { month: 'Apr', revenue: 162000, expenses: 95000 },
    { month: 'May', revenue: 178000, expenses: 101000 },
    { month: 'Jun', revenue: 195000, expenses: 98000 },
]

export default function ProfitLossReport() {
    return (
        <div className="p-8 bg-gradient-to-br from-violet-50 to-indigo-100 min-h-screen">
            <h1 className="text-6xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-10">
                Profit & Loss Statement
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="col-span-2">
                    <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} />
                                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={4} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <CardContent className="pt-16 text-center">
                        <p className="text-6xl font-black">$412,000</p>
                        <p className="text-2xl opacity-90">Net Profit YTD</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}