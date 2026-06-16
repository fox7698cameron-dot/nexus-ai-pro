// File: PricingPlans.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState } from 'react';
import { Check, Zap, Building2, User, Bitcoin, Gift, Star } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: User,
    monthlyPrice: 0,
    annualPrice: 0,
    color: 'gray',
    description: 'Get started with core AI features',
    features: [
      '5 AI projects',
      '1,000 API calls/month',
      'Basic analytics dashboard',
      '1 social platform connection',
      'Community support',
      '1 GB storage',
    ],
    notIncluded: [
      'Advanced analytics',
      'MFA / Security dashboard',
      'Priority support',
      'Custom integrations',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    monthlyPrice: 19,
    annualPrice: 15,
    color: 'indigo',
    description: 'For creators and professionals',
    features: [
      'Unlimited AI projects',
      '100,000 API calls/month',
      'Full analytics suite (all 8 platforms)',
      '10 social platform connections',
      'Security dashboard & MFA',
      'Real-time WebSocket updates',
      'Gaming & project dashboards',
      '50 GB storage',
      'Priority email support',
      'Custom integrations (GitHub, Discord)',
    ],
    notIncluded: [
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    monthlyPrice: 99,
    annualPrice: 79,
    color: 'purple',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'Unlimited platform connections',
      'Admin & moderator dashboards',
      'Team management (up to 50 seats)',
      'Advanced compliance (GDPR, SOC2, HIPAA)',
      'Dedicated account manager',
      '1 TB storage',
      '99.9% SLA uptime guarantee',
      'Custom branding & white-label',
      'SSO / SAML integration',
      'Priority phone & chat support',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const COMPARISON_FEATURES = [
  { label: 'AI Projects', free: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'API Calls / Month', free: '1,000', pro: '100,000', enterprise: 'Unlimited' },
  { label: 'Social Platforms', free: '1', pro: '10', enterprise: 'Unlimited' },
  { label: 'Analytics Dashboard', free: 'Basic', pro: 'Full', enterprise: 'Full + Custom' },
  { label: 'Security Dashboard', free: false, pro: true, enterprise: true },
  { label: 'MFA / 2FA', free: false, pro: true, enterprise: true },
  { label: 'Gaming Dashboard', free: false, pro: true, enterprise: true },
  { label: 'Admin Dashboard', free: false, pro: false, enterprise: true },
  { label: 'Team Management', free: false, pro: false, enterprise: 'Up to 50 seats' },
  { label: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { label: 'Storage', free: '1 GB', pro: '50 GB', enterprise: '1 TB' },
  { label: 'Support', free: 'Community', pro: 'Priority Email', enterprise: 'Dedicated + SLA' },
];

function CellValue({ value }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <span className="text-gray-300 dark:text-gray-600 text-lg leading-none mx-auto block text-center">—</span>;
  return <span className="text-xs text-gray-700 dark:text-gray-300 text-center block">{value}</span>;
}

export default function PricingPlans({ onSelectPlan }) {
  const [annual, setAnnual] = useState(false);

  const getPrice = (plan) => {
    if (plan.monthlyPrice === 0) return 'Free';
    const price = annual ? plan.annualPrice : plan.monthlyPrice;
    return `$${price}`;
  };

  const handleSelectPlan = (planId) => {
    if (onSelectPlan) {
      onSelectPlan(planId, annual ? 'annual' : 'monthly');
    } else {
      window.location.href = `/checkout?plan=${planId}&billing=${annual ? 'annual' : 'monthly'}`;
    }
  };

  return (
    <div className="py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Simple, Transparent Pricing
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-6">
          Choose the plan that fits your needs. Upgrade or downgrade at any time.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              !annual
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              annual
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Annual
            <span className="px-1.5 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Payment badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-medium">
          <Bitcoin className="w-3.5 h-3.5" />
          Crypto accepted
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 text-xs font-medium">
          <Gift className="w-3.5 h-3.5" />
          <a href="/gift-card" className="hover:underline">Gift cards accepted</a>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition ${
                plan.popular
                  ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-6 flex-1">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${
                  plan.color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                  plan.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                  'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    plan.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                    plan.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{getPrice(plan)}</span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm ml-1">/mo{annual && <span className="ml-1 text-xs text-emerald-500">billed annually</span>}</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-500 line-through">
                      <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center text-gray-300 dark:text-gray-600">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500'
                      : plan.color === 'purple'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
                      : 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 focus:ring-gray-900 dark:focus:ring-gray-100'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Full Feature Comparison</h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-1/2">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((feat, i) => (
                <tr key={feat.label} className={i % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-700/20' : ''}>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{feat.label}</td>
                  <td className="py-3 px-4"><CellValue value={feat.free} /></td>
                  <td className="py-3 px-4"><CellValue value={feat.pro} /></td>
                  <td className="py-3 px-4"><CellValue value={feat.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
