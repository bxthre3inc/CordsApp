import React, { useState, useEffect } from 'react';
import { productService, orderService, paymentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DeliveryLocationPicker from '../components/DeliveryLocationPicker';

const STACKING_FEE_PER_CORD  = 15.00;
const PROCESSING_FEE_RATE    = 0.02;
const EXPRESS_MULTIPLIER     = 1.50;
const MIN_DELIVERY_FEE       = 15.00;
const RATE_TIERS = [
  { maxQuantity: 1,        ratePerMile: 3.50 },
  { maxQuantity: 3,        ratePerMile: 3.00 },
  { maxQuantity: 6,        ratePerMile: 2.50 },
  { maxQuantity: 10,       ratePerMile: 2.00 },
  { maxQuantity: Infinity, ratePerMile: 1.75 },
];

function getRatePerMile(qty) {
  return (RATE_TIERS.find(t => qty <= t.maxQuantity) || RATE_TIERS[RATE_TIERS.length - 1]).ratePerMile;
}

function haversineMiles(a, b) {
  if (!a || !b) return 0;
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude  - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function calcDeliveryFee(supplierLocation, buyerLocation, quantity, isExpress) {
  if (!supplierLocation || !buyerLocation) return { miles: 0, ratePerMile: 0, deliveryFee: MIN_DELIVERY_FEE };
  const miles = haversineMiles(supplierLocation, buyerLocation);
  const ratePerMile = getRatePerMile(quantity);
  const multiplier = isExpress ? EXPRESS_MULTIPLIER : 1;
  const deliveryFee = parseFloat(Math.max(miles * ratePerMile * multiplier, MIN_DELIVERY_FEE).toFixed(2));
  return { miles: parseFloat(miles.toFixed(1)), ratePerMile, deliveryFee };
}

const woodTypes = ['Oak', 'Maple', 'Pine', 'Cherry', 'Walnut', 'Birch', 'Ash', 'Cedar'];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  pending: 'Awaiting supplier confirmation',
  confirmed: 'Confirmed — driver will be assigned',
  in_transit: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function BuyerOrderDetailModal({ order, onClose, onPay }) {
  const [paying, setPaying] = useState(false);
  if (!order) return null;

  const hasStacking = parseFloat(order.stacking_fee || 0) > 0;
  const isPickup = order.delivery_type === 'pickup';

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await onPay(order.id);
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } finally {
      setPaying(false);
    }
  };

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
              <p className="text-sm text-gray-500">from {order.supplier_name}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>{order.status}</span>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
            {STATUS_LABELS[order.status]}
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

          {order.gate_code && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span className="text-xl">🔑</span>
              <div>
                <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Your Gate / Door Code</p>
                <p className="text-base font-mono font-bold text-yellow-900">{order.gate_code}</p>
                <p className="text-xs text-yellow-600 mt-0.5">Shared with driver on delivery</p>
              </div>
            </div>
          )}

          {order.delivery_notes && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Delivery Notes</p>
              <p className="text-sm text-blue-900">{order.delivery_notes}</p>
            </div>
          )}

          {hasStacking && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800">
              <span>🪵</span>
              <span><strong>Hand stacking included</strong> — ${parseFloat(order.stacking_fee).toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Wood</span>
              <span>${(parseFloat(order.total_price) - parseFloat(order.stacking_fee || 0)).toFixed(2)}</span>
            </div>
            {hasStacking && (
              <div className="flex justify-between">
                <span className="text-gray-500">Hand stacking</span>
                <span>${parseFloat(order.stacking_fee).toFixed(2)}</span>
              </div>
            )}
            {!isPickup && parseFloat(order.delivery_fee || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{order.delivery_type === 'express' ? 'Express' : 'Standard'} delivery</span>
                <span>${parseFloat(order.delivery_fee).toFixed(2)}</span>
              </div>
            )}
            {order.buyer_processing_fee > 0 && (
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Processing fee (2%)</span>
                <span>${parseFloat(order.buyer_processing_fee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total charged</span>
              <span>${parseFloat(order.total_price).toFixed(2)}</span>
            </div>
          </div>

          {order.payment_status !== 'completed' && order.status !== 'cancelled' && (
            <button onClick={handlePay} disabled={paying}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
              {paying ? 'Redirecting...' : 'Pay Now'}
            </button>
          )}

          {order.payment_status === 'completed' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
              <span>✓</span><span className="font-medium">Payment complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedWoodType, setSelectedWoodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('browse');
  const [orderModal, setOrderModal] = useState(null);
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    fulfillmentType: 'delivery',
    deliveryType: 'standard',
    wantStacking: false,
    deliveryLocation: null,
    gateCode: '',
    deliveryNotes: '',
  });
  const [ordering, setOrdering] = useState(false);
  const [toast, setToast] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos =>
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      );
    }
    loadOrders();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadOrders = async () => {
    try {
      const res = await orderService.getBuyerOrders();
      setOrders(res.data);
    } catch {}
  };

  const searchNearby = async () => {
    if (!location) { showToast('Please enable location services', 'error'); return; }
    setLoading(true);
    try {
      const [productsRes, priceRes] = await Promise.all([
        productService.getNearby(location.latitude, location.longitude, 50, selectedWoodType || null),
        selectedWoodType ? productService.getAveragePrice(selectedWoodType, location.latitude, location.longitude, 50) : null
      ]);
      setProducts(productsRes.data);
      setPriceData(priceRes?.data || null);
    } catch { showToast('Failed to fetch products', 'error'); }
    finally { setLoading(false); }
  };

  const openOrderModal = (product) => {
    setOrderModal(product);
    // Pre-fill delivery location from user's saved address
    const savedLocation = user?.location?.latitude ? user.location : (location || null);
    setOrderForm({
      quantity: 1,
      fulfillmentType: 'delivery',
      deliveryType: 'standard',
      wantStacking: false,
      deliveryLocation: savedLocation,
      gateCode: '',
      deliveryNotes: '',
    });
  };

  const submitOrder = async () => {
    const isPickup = orderForm.fulfillmentType === 'pickup';
    if (!isPickup && !orderForm.deliveryLocation) {
      showToast('Please set your delivery location on the map', 'error');
      return;
    }
    setOrdering(true);
    try {
      await orderService.create({
        productId: orderModal.id,
        quantity: orderForm.quantity,
        deliveryLocation: isPickup ? null : orderForm.deliveryLocation,
        deliveryDate: null,
        paymentMethod: 'card',
        deliveryType: isPickup ? 'pickup' : orderForm.deliveryType,
        wantStacking: !isPickup && orderForm.wantStacking,
        gateCode: orderForm.gateCode || null,
        deliveryNotes: orderForm.deliveryNotes || null,
      });
      setOrderModal(null);
      showToast('Order placed! Proceed to payment.');
      loadOrders();
      setTab('orders');
    } catch { showToast('Failed to place order', 'error'); }
    finally { setOrdering(false); }
  };

  const isPickup = orderForm.fulfillmentType === 'pickup';
  const woodCost  = orderModal ? parseFloat(orderModal.price_per_unit) * orderForm.quantity : 0;
  const stackingFee = (!isPickup && orderForm.wantStacking) ? orderForm.quantity * STACKING_FEE_PER_CORD : 0;

  // Live delivery fee — calculated client-side using same formula as backend
  const supplierLoc = orderModal?.location;  // product.location from nearby search
  const deliveryCalc = (!isPickup && orderModal)
    ? calcDeliveryFee(supplierLoc, orderForm.deliveryLocation, orderForm.quantity, orderForm.deliveryType === 'express')
    : { miles: 0, ratePerMile: 0, deliveryFee: 0 };
  const deliveryFee = isPickup ? 0 : deliveryCalc.deliveryFee;

  const subtotal      = woodCost + stackingFee + deliveryFee;
  const processingFee = parseFloat((subtotal * PROCESSING_FEE_RATE).toFixed(2));
  const totalCost     = subtotal + processingFee;

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-900">🪵 Cords</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Hey, {user?.first_name}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {['browse', 'orders'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
              {t === 'orders' ? `My Orders (${orders.length})` : 'Browse Wood'}
            </button>
          ))}
        </div>

        {tab === 'browse' && (
          <>
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <select value={selectedWoodType} onChange={e => setSelectedWoodType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">All Wood Types</option>
                  {woodTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={searchNearby} disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Searching...' : 'Search Within 50 Miles'}
                </button>
                {!location && (
                  <span className="text-xs text-amber-600">⚠ Enable location for nearby results</span>
                )}
              </div>

              {priceData && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex flex-wrap gap-6 text-sm">
                  <div><span className="text-blue-500">Market avg</span> <strong className="text-blue-900">${parseFloat(priceData.avg_price).toFixed(2)}/cord</strong></div>
                  <div><span className="text-blue-500">Low</span> <strong className="text-blue-900">${parseFloat(priceData.min_price).toFixed(2)}</strong></div>
                  <div><span className="text-blue-500">High</span> <strong className="text-blue-900">${parseFloat(priceData.max_price).toFixed(2)}</strong></div>
                  <div><span className="text-blue-500">Suppliers nearby</span> <strong className="text-blue-900">{priceData.supplier_count}</strong></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="h-40 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <span className="text-5xl">🪵</span>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 text-lg">{p.wood_type}</h3>
                      <span className="text-xs text-gray-400">{p.distance?.toFixed(1)} mi</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{p.description}</p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">${parseFloat(p.price_per_unit).toFixed(0)}<span className="text-sm font-normal text-gray-400">/cord</span></span>
                      <span className="text-sm text-gray-500">{p.quantity} left</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{p.first_name} {p.last_name}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {p.pickup_available && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">📍 Pickup available</span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">🚚 Delivery</span>
                    </div>
                    <button onClick={() => openOrderModal(p)}
                      className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700">
                      Order Now
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">No wood found nearby.</p>
                <p className="text-sm">Try a different wood type or expand your search.</p>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <div className="p-10 text-center text-gray-400">
                  <p className="text-3xl mb-2">📦</p>
                  <p>No orders yet. Browse wood to get started.</p>
                </div>
              )}
              {orders.map(o => (
                <div key={o.id} className="p-5 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setDetailOrder(o)}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{o.wood_type} × {o.quantity} cords</p>
                      {parseFloat(o.stacking_fee || 0) > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🪵 Stack</span>}
                    </div>
                    <p className="text-sm text-gray-500">from {o.supplier_name} · {o.delivery_type === 'pickup' ? 'Pickup' : o.delivery_type || 'Standard'}</p>
                    <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${parseFloat(o.total_price).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    {o.payment_status !== 'completed' && o.status !== 'cancelled' && (
                      <p className="text-xs text-blue-600 mt-1">Payment due →</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailOrder && (
        <BuyerOrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onPay={async (orderId) => {
            const res = await paymentService.createOrderPayment(orderId);
            return res.data;
          }}
        />
      )}

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{orderModal.wood_type}</h2>
              <p className="text-sm text-gray-500">{orderModal.first_name} {orderModal.last_name} · ${parseFloat(orderModal.price_per_unit).toFixed(2)}/cord</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setOrderForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                    className="w-9 h-9 rounded-full border border-gray-200 text-lg font-medium hover:bg-gray-50 flex items-center justify-center">−</button>
                  <span className="text-xl font-bold text-gray-900 w-8 text-center">{orderForm.quantity}</span>
                  <button onClick={() => setOrderForm(f => ({ ...f, quantity: Math.min(orderModal.quantity, f.quantity + 1) }))}
                    className="w-9 h-9 rounded-full border border-gray-200 text-lg font-medium hover:bg-gray-50 flex items-center justify-center">+</button>
                  <span className="text-sm text-gray-400 ml-1">cord{orderForm.quantity !== 1 ? 's' : ''} ({orderModal.quantity} available)</span>
                </div>
              </div>

              {/* Fulfillment type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderForm(f => ({ ...f, fulfillmentType: 'delivery' }))}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${!isPickup ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    🚚 Deliver to me
                  </button>
                  <button onClick={() => setOrderForm(f => ({ ...f, fulfillmentType: 'pickup' }))}
                    disabled={!orderModal.pickup_available}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isPickup ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    📍 I'll pick up {!orderModal.pickup_available && <span className="block text-xs font-normal">(not offered)</span>}
                  </button>
                </div>
              </div>

              {/* Delivery flow */}
              {!isPickup && (
                <>
                  {/* Delivery speed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery speed</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'standard', label: 'Standard', sub: '2–3 days' },
                        { key: 'express', label: 'Express', sub: `Next day · 1.5× rate` },
                      ].map(d => (
                        <button key={d.key} onClick={() => setOrderForm(f => ({ ...f, deliveryType: d.key }))}
                          className={`py-2.5 px-3 rounded-xl text-sm text-left border-2 transition-all ${orderForm.deliveryType === d.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <p className="font-medium text-gray-900">{d.label}</p>
                          <p className="text-xs text-gray-500">{d.sub}</p>
                        </button>
                      ))}
                    </div>
                    {deliveryCalc.miles > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        ~{deliveryCalc.miles} mi · ${deliveryCalc.ratePerMile.toFixed(2)}/mi
                        {orderForm.deliveryType === 'express' ? ` × 1.5 (express)` : ''}
                      </p>
                    )}
                  </div>

                  {/* Stacking — optional add-on */}
                  <div
                    onClick={() => setOrderForm(f => ({ ...f, wantStacking: !f.wantStacking }))}
                    className={`flex items-start gap-3 rounded-xl p-3 border-2 cursor-pointer transition-all ${
                      orderForm.wantStacking
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 bg-white hover:border-amber-200'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${orderForm.wantStacking ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                      {orderForm.wantStacking && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Add hand stacking — ${STACKING_FEE_PER_CORD}/cord
                        {orderForm.wantStacking && <span className="ml-2 text-amber-600">+${stackingFee.toFixed(2)}</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Driver stacks your wood exactly where you want it. All Cords drivers are trained for this. Great for locations trucks can't reach.
                      </p>
                    </div>
                  </div>

                  {/* Map */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery location
                      <span className="ml-1 text-xs text-gray-400 font-normal">— drag pin to exact spot · fee updates live</span>
                    </label>
                    <DeliveryLocationPicker
                      initialLocation={user?.location || location}
                      onChange={pos => setOrderForm(f => ({ ...f, deliveryLocation: pos }))}
                    />
                  </div>

                  {/* Gate code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gate / door code
                      <span className="ml-1 text-xs text-gray-400 font-normal">optional</span>
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. #1234 or ring bell"
                      value={orderForm.gateCode}
                      onChange={e => setOrderForm(f => ({ ...f, gateCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"
                    />
                  </div>

                  {/* Delivery notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery notes
                      <span className="ml-1 text-xs text-gray-400 font-normal">optional</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Stack next to garage · Beware of dog · Driveway is gravel · Call on arrival · Gate code above lets you in through back yard"
                      value={orderForm.deliveryNotes}
                      onChange={e => setOrderForm(f => ({ ...f, deliveryNotes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
                    />
                  </div>
                </>
              )}

              {isPickup && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                  <p className="font-semibold mb-1">📍 Pickup at supplier location</p>
                  <p className="text-xs text-green-700">No delivery or stacking fee. The supplier will confirm pickup details after you place the order.</p>
                </div>
              )}

              {/* Price breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{orderModal.wood_type} × {orderForm.quantity} cord{orderForm.quantity !== 1 ? 's' : ''}</span>
                  <span className="font-medium">${woodCost.toFixed(2)}</span>
                </div>
                {!isPickup && stackingFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Hand stacking × {orderForm.quantity} cord{orderForm.quantity !== 1 ? 's' : ''}</span>
                    <span className="font-medium">${stackingFee.toFixed(2)}</span>
                  </div>
                )}
                {!isPickup && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {orderForm.deliveryType === 'express' ? 'Express' : 'Standard'} delivery
                      {deliveryCalc.miles > 0 && (
                        <span className="ml-1 text-gray-400 text-xs">
                          ({deliveryCalc.miles} mi × ${deliveryCalc.ratePerMile.toFixed(2)}/mi{orderForm.deliveryType === 'express' ? ' × 1.5' : ''})
                        </span>
                      )}
                    </span>
                    <span className="font-medium">${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500 pt-1 border-t border-gray-200">
                  <span>Payment processing fee (2%)</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setOrderModal(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitOrder} disabled={ordering}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {ordering ? 'Placing order...' : `Place Order · $${totalCost.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
