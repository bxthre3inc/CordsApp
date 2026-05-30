import React, { useState, useEffect } from 'react';
import { orderService, productService, subscriptionService, paymentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WOOD_TYPE_GROUPS, UNITS } from '../utils/woodTypes';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const SEASONING_LABELS = {
  kiln_dried: { label: 'Kiln Dried',  color: 'bg-orange-100 text-orange-700' },
  seasoned:   { label: 'Seasoned',    color: 'bg-green-100 text-green-700' },
  seasoning:  { label: 'Seasoning',   color: 'bg-yellow-100 text-yellow-700' },
  green:      { label: 'Green Wood',  color: 'bg-gray-100 text-gray-600' },
};

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0/mo',
    commission: '20% commission',
    features: ['Up to 5 listings', 'Basic analytics'],
    color: 'border-gray-200',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$29.99/mo',
    commission: '10% commission',
    features: ['Unlimited listings', 'Pickup option', 'Priority support'],
    color: 'border-blue-300',
  },
  {
    key: 'professional',
    name: 'Professional',
    price: '$99.99/mo',
    commission: '5% commission',
    features: ['Featured in search', 'Custom branding', 'API access'],
    color: 'border-purple-400',
    badge: 'Best Value',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    commission: '0% commission',
    features: ['Flat rate per cord or month', 'Negotiated delivery cut', 'Account manager', 'SLA'],
    color: 'border-orange-400',
  },
];

const EMPTY_PRODUCT = {
  woodType: '', quantity: '', unit: 'cord', pricePerUnit: '', description: '',
  pickupAvailable: false, pickupAddress: '',
  seasoningStatus: 'seasoned', moisturePct: '', certification: '',
  isWholesale: false, minOrderQty: 1, countryCode: '', regionName: '',
};

function OrderDetailModal({ order, onClose }) {
  if (!order) return null;
  const hasStacking = parseFloat(order.stacking_fee || 0) > 0;
  const isPickup = order.delivery_type === 'pickup';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Order #{order.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-900 text-lg">{order.wood_type} × {order.quantity} {order.unit || 'cords'}</p>
              <p className="text-sm text-gray-500">Buyer: {order.buyer_name}</p>
              {order.buyer_phone && <p className="text-sm text-gray-500">{order.buyer_phone}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>{order.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Order date</p>
              <p className="font-medium text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Delivery</p>
              <p className="font-medium text-gray-900 capitalize">{isPickup ? 'Pickup' : order.delivery_type || 'Standard'}</p>
            </div>
          </div>

          {!isPickup && order.delivery_location && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Delivery address</p>
              <p className="text-sm text-blue-900">
                {typeof order.delivery_location === 'object'
                  ? `${order.delivery_location.lat?.toFixed(5)}, ${order.delivery_location.lng?.toFixed(5)}`
                  : order.delivery_location}
              </p>
            </div>
          )}

          {order.gate_code && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span className="text-xl">🔑</span>
              <div>
                <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Gate / Door Code</p>
                <p className="text-base font-mono font-bold text-yellow-900">{order.gate_code}</p>
              </div>
            </div>
          )}

          {order.delivery_notes && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Buyer Notes</p>
              <p className="text-sm text-blue-900">{order.delivery_notes}</p>
            </div>
          )}

          {hasStacking && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800">
              <span>🪵</span>
              <span><strong>Hand stacking requested</strong> — buyer paid ${parseFloat(order.stacking_fee).toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Wood cost</span>
              <span className="font-medium">${(parseFloat(order.total_price) - parseFloat(order.stacking_fee || 0)).toFixed(2)}</span>
            </div>
            {hasStacking && (
              <div className="flex justify-between">
                <span className="text-gray-500">Stacking fee</span>
                <span className="font-medium">${parseFloat(order.stacking_fee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Your revenue (before commission)</span>
              <span className="text-green-700">${parseFloat(order.total_price).toFixed(2)}</span>
            </div>
            {order.seller_processing_fee > 0 && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Processing fee (2%)</span>
                <span>−${parseFloat(order.seller_processing_fee).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('orders');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);

  useEffect(() => { loadData(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        productService.getBySupplier(user?.id),
        orderService.getSupplierOrders()
      ]);
      setProducts(pRes.data);
      setOrders(oRes.data);
    } catch { showToast('Failed to load data', 'error'); }
  };

  const loadPlan = async () => {
    if (planData) return;
    setPlanLoading(true);
    try {
      const res = await subscriptionService.getMyPlan();
      setPlanData(res.data);
    } catch { showToast('Failed to load plan info', 'error'); }
    finally { setPlanLoading(false); }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'plan') loadPlan();
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const getLocation = () => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve({ latitude: 0, longitude: 0 })
        );
      });
      const location = await getLocation();
      await productService.create({
        woodType:       newProduct.woodType,
        quantity:       parseFloat(newProduct.quantity),
        unit:           newProduct.unit,
        pricePerUnit:   parseFloat(newProduct.pricePerUnit),
        location,
        description:    newProduct.description,
        pickupAvailable: newProduct.pickupAvailable,
        pickupAddress:  newProduct.pickupAvailable && newProduct.pickupAddress
                          ? { address: newProduct.pickupAddress }
                          : null,
        seasoningStatus: newProduct.seasoningStatus,
        moisturePct:    newProduct.moisturePct ? parseFloat(newProduct.moisturePct) : null,
        certification:  newProduct.certification || null,
        isWholesale:    newProduct.isWholesale,
        minOrderQty:    parseFloat(newProduct.minOrderQty) || 1,
        countryCode:    newProduct.countryCode || null,
        regionName:     newProduct.regionName  || null,
      });
      setNewProduct(EMPTY_PRODUCT);
      setShowAddProduct(false);
      showToast('Product added');
      loadData();
    } catch { showToast('Failed to add product', 'error'); }
    finally { setLoading(false); }
  };

  const togglePickup = async (product) => {
    try {
      await productService.update(product.id, { pickupAvailable: !product.pickup_available });
      showToast(product.pickup_available ? 'Pickup disabled' : 'Pickup enabled');
      loadData();
    } catch { showToast('Failed to update', 'error'); }
  };

  const confirmOrder = async (orderId) => {
    try {
      await orderService.updateStatus(orderId, 'confirmed');
      showToast('Order confirmed');
      loadData();
    } catch { showToast('Failed to confirm order', 'error'); }
  };

  const handleUpgrade = async (planKey) => {
    if (planKey === 'enterprise') {
      window.location.href = '/enterprise';
      return;
    }
    try {
      const res = await paymentService.createSubscription(planKey);
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch { showToast('Failed to start checkout', 'error'); }
  };

  const handleCancelPlan = async () => {
    if (!window.confirm('Cancel your subscription? You will be downgraded to the free plan.')) return;
    try {
      await subscriptionService.cancel();
      setPlanData(null);
      showToast('Subscription cancelled');
      loadPlan();
    } catch { showToast('Failed to cancel', 'error'); }
  };

  const np = newProduct;
  const set = (field, val) => setNewProduct(p => ({ ...p, [field]: val }));

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const monthRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-900">🪵 Cords Supplier</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.first_name}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending Orders', value: pendingCount, color: pendingCount > 0 ? 'text-yellow-600' : 'text-gray-900' },
            { label: 'Total Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'text-green-600' },
            { label: 'Revenue (delivered)', value: `$${monthRevenue.toFixed(0)}`, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow p-5 text-center">
              <p className="text-xs text-gray-400 uppercase font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'orders',    label: `Orders${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` },
            { key: 'inventory', label: 'Inventory' },
            { key: 'plan',      label: 'My Plan' },
          ].map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <div className="p-10 text-center text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>No orders yet. Make sure you have active inventory listed.</p>
                </div>
              )}
              {orders.map(o => (
                <div key={o.id} className="p-5 flex justify-between items-start hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{o.wood_type} × {o.quantity} {o.unit || 'cords'}</p>
                      {o.delivery_type === 'pickup'  && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pickup</span>}
                      {o.delivery_type === 'express' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Express</span>}
                      {parseFloat(o.stacking_fee || 0) > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🪵 Stack</span>}
                    </div>
                    <p className="text-sm text-gray-500">Buyer: {o.buyer_name}</p>
                    <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-gray-900">${parseFloat(o.total_price).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    {o.status === 'pending' && (
                      <button onClick={e => { e.stopPropagation(); confirmOrder(o.id); }}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory tab */}
        {tab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Your Listings</h2>
              <button onClick={() => setShowAddProduct(!showAddProduct)}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                {showAddProduct ? 'Cancel' : '+ Add Listing'}
              </button>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-xl shadow p-6 mb-5">
                <h3 className="font-semibold text-gray-900 mb-4">New Listing</h3>
                <form onSubmit={handleAddProduct} className="space-y-5">
                  {/* Basic info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wood species *</label>
                      <select required value={np.woodType} onChange={e => set('woodType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">Select species</option>
                        {WOOD_TYPE_GROUPS.map(g => (
                          <optgroup key={g.region} label={g.region}>
                            {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select value={np.unit} onChange={e => set('unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity available *</label>
                      <input required type="number" step="0.5" min="0.5" value={np.quantity}
                        onChange={e => set('quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="12" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price per {np.unit || 'unit'} ($) *</label>
                      <input required type="number" step="0.01" min="1" value={np.pricePerUnit}
                        onChange={e => set('pricePerUnit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="285.00" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={np.description} onChange={e => set('description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2}
                        placeholder="Seasoned split oak, ready to burn..." />
                    </div>
                  </div>

                  {/* Quality details */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Quality &amp; Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seasoning status</label>
                        <select value={np.seasoningStatus} onChange={e => set('seasoningStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <option value="kiln_dried">Kiln Dried (&lt;15% moisture)</option>
                          <option value="seasoned">Seasoned (&lt;20% moisture)</option>
                          <option value="seasoning">Seasoning (drying, 20–30%)</option>
                          <option value="green">Green (freshly cut, &gt;30%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Moisture % <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input type="number" step="0.1" min="5" max="60" value={np.moisturePct}
                          onChange={e => set('moisturePct', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. 18.5" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Certification <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <select value={np.certification} onChange={e => set('certification', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <option value="">None / not certified</option>
                          <option value="FSC">FSC (Forest Stewardship Council)</option>
                          <option value="PEFC">PEFC</option>
                          <option value="SFI">SFI (Sustainable Forestry Initiative)</option>
                          <option value="Rainforest Alliance">Rainforest Alliance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min order quantity
                        </label>
                        <input type="number" step="0.5" min="0.5" value={np.minOrderQty}
                          onChange={e => set('minOrderQty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="1" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <input type="checkbox" id="isWholesale" checked={np.isWholesale}
                        onChange={e => set('isWholesale', e.target.checked)}
                        className="w-4 h-4 text-blue-600" />
                      <label htmlFor="isWholesale" className="text-sm font-medium text-gray-700">
                        Wholesale / bulk listing (B2B pricing)
                      </label>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Location (for global price index)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country code <span className="text-gray-400 font-normal">(ISO 2-letter, e.g. US, GB, AU)</span>
                        </label>
                        <input type="text" maxLength={2} value={np.countryCode}
                          onChange={e => set('countryCode', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" placeholder="US" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Region / State <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input type="text" value={np.regionName}
                          onChange={e => set('regionName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Colorado" />
                      </div>
                    </div>
                  </div>

                  {/* Pickup */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input type="checkbox" id="pickupAvailable" checked={np.pickupAvailable}
                        onChange={e => set('pickupAvailable', e.target.checked)}
                        className="w-4 h-4 text-green-600" />
                      <label htmlFor="pickupAvailable" className="text-sm font-medium text-gray-700">
                        Offer pickup at my location
                      </label>
                    </div>
                    {np.pickupAvailable && (
                      <input value={np.pickupAddress} onChange={e => set('pickupAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Pickup address (e.g. 12 Woodyard Ln, Springfield, CO)" />
                    )}
                  </div>

                  <button type="submit" disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Adding...' : 'Add Listing'}
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => {
                const seasoning = SEASONING_LABELS[p.seasoning_status];
                return (
                  <div key={p.id} className="bg-white rounded-xl shadow p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.wood_type}</h3>
                        <p className="text-sm text-gray-500">{p.quantity} {p.unit} · ${parseFloat(p.price_per_unit).toFixed(2)}/{p.unit}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {p.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{p.description}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {seasoning && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${seasoning.color}`}>{seasoning.label}</span>
                      )}
                      {p.certification && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{p.certification}</span>
                      )}
                      {p.is_wholesale && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Wholesale</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <button onClick={() => togglePickup(p)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium ${p.pickup_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {p.pickup_available ? '📍 Pickup On' : '📍 Enable Pickup'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {products.length === 0 && (
                <div className="col-span-3 text-center py-10 text-gray-400">
                  <p>No listings yet. Add your first product above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plan tab */}
        {tab === 'plan' && (
          <div>
            {planLoading && <p className="text-gray-400 text-center py-8">Loading plan info...</p>}
            {planData && (
              <div>
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Current Plan</p>
                      <h2 className="text-2xl font-bold text-gray-900">{planData.plan.name}</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        {planData.accountType === 'free'
                          ? '20% commission on every order'
                          : planData.accountType === 'enterprise'
                          ? '0% commission — flat rate billing'
                          : `${Math.round(planData.plan.commission * 100)}% commission per order`}
                      </p>
                    </div>
                    {planData.activeSubscription && planData.accountType !== 'free' && planData.accountType !== 'enterprise' && (
                      <button onClick={handleCancelPlan}
                        className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5">
                        Cancel plan
                      </button>
                    )}
                  </div>
                  {planData.activeSubscription && (
                    <p className="text-xs text-gray-400 mt-3">
                      Renews {new Date(planData.activeSubscription.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4">Upgrade your plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {PLANS.map(plan => {
                    const isCurrent = planData.accountType === plan.key;
                    return (
                      <div key={plan.key} className={`bg-white rounded-xl border-2 ${plan.color} p-5 relative flex flex-col`}>
                        {plan.badge && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">{plan.badge}</span>
                        )}
                        <div className="mb-3">
                          <h4 className="font-bold text-gray-900">{plan.name}</h4>
                          <p className="text-lg font-semibold text-gray-900 mt-1">{plan.price}</p>
                          <p className="text-xs text-green-700 font-medium">{plan.commission}</p>
                        </div>
                        <ul className="text-xs text-gray-500 space-y-1 mb-4 flex-1">
                          {plan.features.map(f => <li key={f}>✓ {f}</li>)}
                        </ul>
                        {isCurrent ? (
                          <div className="w-full py-2 text-center text-sm font-medium bg-gray-100 text-gray-500 rounded-lg">Current plan</div>
                        ) : (
                          <button onClick={() => handleUpgrade(plan.key)}
                            className="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {plan.key === 'enterprise' ? 'Contact us' : 'Upgrade'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 mt-4 text-center">
                  All plans include the 2% buyer + 2% seller processing fee. Annual contracts available at 15% discount.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
