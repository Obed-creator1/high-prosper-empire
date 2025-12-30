// frontend/app/dashboard/billing/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BillingPage() {
    const plans = [
        { slug: 'starter', name: 'Starter', price: '$99/mo', features: ['50 PRs', 'Basic AI'] },
        { slug: 'pro', name: 'Pro', price: '$299/mo', features: ['Unlimited', 'Full AI', 'Blockchain'] },
        { slug: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['White-label', 'Dedicated'] },
    ];

    const currentPlan = 'pro';

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-12">Billing & Plans</h1>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {plans.map(plan => (
                        <Card key={plan.slug} className={`p-8 relative ${currentPlan === plan.slug ? 'border-blue-600 shadow-2xl' : ''}`}>
                            {currentPlan === plan.slug && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                                    Current Plan
                                </div>
                            )}
                            <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                            <p className="text-4xl font-bold mb-6">{plan.price}</p>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map(f => <li key={f}>✓ {f}</li>)}
                            </ul>
                            <Button className="w-full" disabled={currentPlan === plan.slug}>
                                {currentPlan === plan.slug ? 'Active' : 'Upgrade'}
                            </Button>
                        </Card>
                    ))}
                </div>

                <Card className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Usage This Month</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>PRs Created: <strong>147</strong></div>
                        <div>POs Issued: <strong>89</strong></div>
                        <div>AI Actions: <strong>2,341</strong></div>
                    </div>
                </Card>
            </div>
        </div>
    );
}