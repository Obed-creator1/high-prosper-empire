'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BalanceSheet() {
    return (
        <div className="p-8 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
            <h1 className="text-6xl font-black bg-gradient-to-r from-gray-700 to-black bg-clip-text text-transparent mb-10">
                Balance Sheet
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <Card className="shadow-2xl">
                    <CardHeader><CardTitle className="text-3xl">Assets</CardTitle></CardHeader>
                    <CardContent className="space-y-6 text-lg">
                        <div className="flex justify-between"><span>Cash & Banks</span><span className="font-bold">$248,500</span></div>
                        <div className="flex justify-between"><span>Accounts Receivable</span><span className="font-bold">$68,400</span></div>
                        <div className="flex justify-between border-t-4 border-gray-300 pt-6 text-2xl font-black">
                            <span>Total Assets</span><span>$412,800</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-2xl">
                    <CardHeader><CardTitle className="text-3xl">Liabilities & Equity</CardTitle></CardHeader>
                    <CardContent className="space-y-6 text-lg">
                        <div className="flex justify-between"><span>Accounts Payable</span><span className="font-bold text-red-600">$15,200</span></div>
                        <div className="flex justify-between"><span>Owner's Equity</span><span className="font-bold">$397,600</span></div>
                        <div className="flex justify-between border-t-4 border-gray-300 pt-6 text-2xl font-black">
                            <span>Total Liabilities & Equity</span><span>$412,800</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}