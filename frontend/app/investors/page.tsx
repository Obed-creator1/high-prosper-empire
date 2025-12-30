// frontend/app/investors/page.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function InvestorsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Hero Section with Demo Video */}
            <section className="relative overflow-hidden py-20 px-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        The Future of Procurement is Autonomous
                    </h1>
                    <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-4xl mx-auto">
                        High Prosper ERP combines AI, Blockchain, and Predictive Analytics to deliver the world's first fully autonomous procurement platform — powering Africa's renewable energy revolution.
                    </p>

                    {/* Demo Video Embed */}
                    <div className="max-w-5xl mx-auto mb-12">
                        <div className="aspect-video bg-black/50 rounded-2xl overflow-hidden shadow-2xl">
                            <iframe
                                src="https://www.youtube.com/embed/xI0x0C3I4cw?autoplay=0&rel=0&modestbranding=1"
                                title="High Prosper ERP Demo — ProsperBot in Action"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                        <p className="mt-4 text-lg text-gray-400">Watch ProsperBot autonomously handle procurement — from voice request to PO issuance</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-xl px-10 py-6">
                            Download Investor Deck
                        </Button>
                        <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-xl px-10 py-6">
                            Schedule Call
                        </Button>
                    </div>
                    <p className="mt-12 text-5xl font-bold text-yellow-400">$100M Pre-Money Valuation Target</p>
                </div>
            </section>

            {/* Rest of your sections remain unchanged */}
            {/* AI Dashboard Showcase */}
            <section className="py-20 px-6 bg-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16">Powered by ProsperBot — Your AI Procurement Director</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="bg-slate-900 border-slate-700 p-0 overflow-hidden">
                            <Image
                                src="https://sievo.com/hubfs/Sievo-2024/Images/Sievo%20AI%20Procurement%20Dashboard%20Screenshot.png"
                                alt="AI Procurement Dashboard"
                                width={600}
                                height={400}
                                className="w-full"
                            />
                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3">Autonomous PR Creation</h3>
                                <p className="text-gray-400">Voice, email, or WhatsApp → AI instantly creates approved requisitions</p>
                            </div>
                        </Card>
                        <Card className="bg-slate-900 border-slate-700 p-0 overflow-hidden">
                            <Image
                                src="https://www.gep.com/hs-fs/hubfs/GEP%20SMART%20AI%20Procurement%20Dashboard.jpg"
                                alt="AI Procurement Dashboard"
                                width={600}
                                height={400}
                                className="w-full"
                            />
                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3">Predictive Analytics</h3>
                                <p className="text-gray-400">Forecast demand and optimize supplier selection with machine learning</p>
                            </div>
                        </Card>
                        <Card className="bg-slate-900 border-slate-700 p-0 overflow-hidden">
                            <Image
                                src="https://www.getfocalpoint.com/hubfs/Focal%20Point%20AI%20Procurement%20Dashboard.png"
                                alt="AI Procurement Dashboard"
                                width={600}
                                height={400}
                                className="w-full"
                            />
                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3">Real-Time Insights</h3>
                                <p className="text-gray-400">Unified dashboards for spend analysis and risk management</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Solar Impact */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-12">Powering Africa's Renewable Revolution</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                            <Image
                                src="https://yaleclimateconnections.org/wp-content/uploads/2025/04/solar-mini-grids-africa.jpg"
                                alt="Solar Installation Africa"
                                width={400}
                                height={300}
                            />
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                            <Image
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Solar_power_in_Africa.jpg/800px-Solar_power_in_Africa.jpg"
                                alt="Solar Installation Africa"
                                width={400}
                                height={300}
                            />
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                            <Image
                                src="https://ember-energy.org/wp-content/uploads/2025/08/africa-solar-panels-imports.jpg"
                                alt="Solar Installation Africa"
                                width={400}
                                height={300}
                            />
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                            <Image
                                src="https://www.globalsolarcouncil.org/wp-content/uploads/2025/01/africa-solar-installation.jpg"
                                alt="Solar Installation Africa"
                                width={400}
                                height={300}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Icons */}
            <section className="py-20 px-6 bg-black/30">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-16">Built on Tomorrow's Technology</h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div>
                            <Image
                                src="https://www.invoicemate.net/wp-content/uploads/2023/10/blockchain-invoice-icon.png"
                                alt="Blockchain Verified"
                                width={200}
                                height={200}
                                className="mx-auto mb-6"
                            />
                            <h3 className="text-2xl font-bold">Blockchain Invoice Verification</h3>
                        </div>
                        <div>
                            <Image
                                src="https://iconscout.com/icons/cryptocurrency-invoice-icon"
                                alt="AI Robot"
                                width={200}
                                height={200}
                                className="mx-auto mb-6"
                            />
                            <h3 className="text-2xl font-bold">ProsperBot AI Agent</h3>
                        </div>
                        <div>
                            <Image
                                src="https://www.bitwave.io/wp-content/uploads/2025/07/blockchain-invoice-reconciliation-icon.svg"
                                alt="Predictive Analytics"
                                width={200}
                                height={200}
                                className="mx-auto mb-6"
                            />
                            <h3 className="text-2xl font-bold">Predictive Analytics</h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* Valuation & Opportunity */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-5xl font-bold mb-12">The $100M+ Opportunity</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <Card className="bg-white/10 backdrop-blur border-white/20 p-8">
                            <h3 className="text-3xl font-bold text-green-400">$15M ARR by 2027</h3>
                            <p className="mt-4 text-gray-300">Africa dominance + White-label partnerships</p>
                        </Card>
                        <Card className="bg-white/10 backdrop-blur border-white/20 p-8">
                            <h3 className="text-3xl font-bold text-blue-400">10-15x Multiple</h3>
                            <p className="mt-4 text-gray-300">AI + Blockchain premium in procurement SaaS</p>
                        </Card>
                        <Card className="bg-white/10 backdrop-blur border-white/20 p-8">
                            <h3 className="text-3xl font-bold text-yellow-400">$150-300M Exit Potential</h3>
                            <p className="mt-4 text-gray-300">Global rollout + Enterprise deals</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-20 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-8">Join the Future of Procurement</h2>
                    <p className="text-xl mb-12 text-gray-300">
                        We're raising our Series A to accelerate global expansion and white-label partnerships.
                    </p>
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-xl px-12 py-8">
                        Invest in High Prosper
                    </Button>
                </div>
            </section>
        </div>
    );
}