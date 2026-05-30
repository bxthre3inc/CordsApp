import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterpriseService } from '../services/api';

/*
  Unit economics reference (avg $285/cord):
  ──────────────────────────────────────────────────────────────────
  Tier           Monthly fee   Commission   Cords/mo   Cords cost
  Free           $0            20%          10          $570
  Starter        $29.99        10%          10          $314.99
  Professional   $99.99        5%           50          $812.49
  Enterprise*    $299–$999     0%           50–500+     $449–$1,999
  ──────────────────────────────────────────────────────────────────
  * Enterprise: only pay Stripe card processing (2.9% + $0.30/txn)
    Delivery: negotiate per-mile rate directly with Cords
*/

const TIERS = [
  {
    name: 'Small',
    range: '50–150 cords/mo',
    monthly: '$299',
    perCord: '$3.00/cord',
    example: '100 cords → $599/mo to Cords',
    stripe: '2% processing fee each way (buyer + seller)',
    color: 'border-gray-200',
    badge: '',
  },
  {
    name: 'Medium',
    range: '150–500 cords/mo',
    monthly: '$699',
    perCord: '$2.50/cord',
    example: '300 cords → $1,449/mo to Cords',
    stripe: '2% processing fee each way (buyer + seller)',
    color: 'border-blue-500',
    badge: 'Most Popular',
  },
  {
    name: 'Large',
    range: '500+ cords/mo',
    monthly: 'From $999',
    perCord: 'From $2.00/cord',
    example: '700 cords → $2,399+/mo to Cords',
    stripe: '2% processing fee each way (buyer + seller)',
    color: 'border-gray-200',
    badge: '',
  },
];

const COMPARISON = [
  { feature: 'Platform commission', free: '20%', starter: '10%', pro: '5%', enterprise: '0%' },
  { feature: 'Monthly fee', free: '$0', starter: '$29.99', pro: '$99.99', enterprise: 'Custom flat rate' },
  { feature: 'Processing fee (buyer)', free: '2%', starter: '2%', pro: '2%', enterprise: '2%' },
  { feature: 'Processing fee (seller)', free: '2%', starter: '2%', pro: '2%', enterprise: '2%' },
  { feature: 'Per-mile delivery cut', free: 'N/A', starter: 'N/A', pro: 'N/A', enterprise: 'Negotiated' },
  { feature: 'Pickup option', free: 'No', starter: 'Yes', pro: 'Yes', enterprise: 'Yes' },
  { feature: 'Active listings', free: 'Up to 5', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Featured in search', free: 'No', starter: 'No', pro: 'Yes', enterprise: 'Priority' },
  { feature: 'Dedicated support', free: 'No', starter: 'Email', pro: 'Priority', enterprise: 'Account manager' },
  { feature: 'Contract / SLA', free: 'No', starter: 'No', pro: 'No', enterprise: 'Yes' },
];

export default function EnterprisePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '', contactName: '', contactEmail: '', contactPhone: '',
    estimatedMonthlyCords: '', delivers: false, notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await enterpriseService.submitInquiry({
        companyName: form.companyName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        estimatedMonthlyCords: parseInt(form.estimatedMonthlyCords) || null,
        delivers: form.delivers,
        notes: form.notes,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit. Please email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/')} className="text-xl font-bold text-gray-900">🪵 Cords</button>
        <div className="flex gap-3">
          <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:text-gray-900">Sign In</button>
          <button onClick={() => navigate('/register')} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Get Started</button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-4">Enterprise</span>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Custom pricing for high-volume wood suppliers</h1>
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
          No commission. Flat rate per cord or per month. Negotiated delivery rates. Only pay card processing.
        </p>
        <a href="#contact" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 text-lg">
          Talk to us
        </a>
      </section>

      {/* How enterprise pricing works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">How enterprise pricing works</h2>
          <p className="text-center text-gray-500 mb-10">You pay a flat rate — no percentage cut on your orders.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map(t => (
              <div key={t.name} className={`bg-white rounded-2xl border-2 ${t.color} p-6 relative`}>
                {t.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">{t.badge}</span>
                )}
                <h3 className="text-lg font-bold text-gray-900">{t.name} Enterprise</h3>
                <p className="text-sm text-gray-400 mb-4">{t.range}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly access</span>
                    <span className="font-semibold text-gray-900">{t.monthly}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Per cord</span>
                    <span className="font-semibold text-gray-900">{t.perCord}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Commission</span>
                    <span className="font-semibold text-green-600">$0</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{t.example}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.stripe}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">All pricing is negotiable. Annual contracts available at 15% discount.</p>
        </div>
      </section>

      {/* Delivery section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Delivery — your choice</h2>
        <p className="text-gray-500 mb-8">Suppliers don't have to deliver. But if you do, we work with you on the split.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">🚚</div>
            <h3 className="font-bold text-gray-900 mb-2">You deliver</h3>
            <p className="text-sm text-gray-600 mb-3">We negotiate a per-mile rate directly with your team. You set what you charge buyers, and we take a small cut of the delivery fee.</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Suggested buyer rate</span>
                <span className="font-medium">$1.25–$2.50/mile</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cords cut (negotiated + 2% processing)</span>
                <span className="font-medium">$0.25–$0.50/mile</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">You keep</span>
                <span className="font-medium text-green-600">The rest</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">📍</div>
            <h3 className="font-bold text-gray-900 mb-2">Buyer picks up</h3>
            <p className="text-sm text-gray-600 mb-3">Enable pickup on any product listing. Buyers see your address and come to you — no delivery logistics required.</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ No delivery cost for buyer</li>
              <li>✓ No driver coordination</li>
              <li>✓ You set your pickup hours</li>
              <li>✓ Works alongside delivery offerings</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Compare all tiers</h2>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-5 py-4 text-left font-medium">Feature</th>
                    <th className="px-4 py-4 text-center font-medium">Free</th>
                    <th className="px-4 py-4 text-center font-medium">Starter</th>
                    <th className="px-4 py-4 text-center font-medium">Professional</th>
                    <th className="px-4 py-4 text-center font-medium text-blue-300">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMPARISON.map(row => (
                    <tr key={row.feature} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700 font-medium">{row.feature}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{row.free}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{row.starter}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{row.pro}</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-700">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" className="max-w-2xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Get a custom quote</h2>
        <p className="text-gray-500 text-center mb-8">We'll respond within 1 business day with pricing tailored to your volume.</p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">You're on the list</h3>
            <p className="text-green-700">We'll reach out to {form.contactEmail} within 1 business day.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
                <input required value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Acme Wood Co." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name *</label>
                <input required value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input required type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="jane@woodco.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="(555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. cords per month</label>
                <input type="number" min="1" value={form.estimatedMonthlyCords} onChange={e => setForm({ ...form, estimatedMonthlyCords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="200" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="delivers" checked={form.delivers} onChange={e => setForm({ ...form, delivers: e.target.checked })}
                  className="w-4 h-4 text-blue-600" />
                <label htmlFor="delivers" className="text-sm text-gray-700">We offer delivery to buyers</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anything else?</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Tell us about your operation, regions you serve, special requirements..." />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Sending...' : 'Request Enterprise Pricing'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
