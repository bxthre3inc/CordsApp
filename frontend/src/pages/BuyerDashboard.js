import React, { useState, useEffect } from 'react';
import { productService, orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const woodTypes = ['Oak', 'Maple', 'Pine', 'Cherry', 'Walnut', 'Birch', 'Ash', 'Cedar'];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedWoodType, setSelectedWoodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('browse');
  const [orderModal, setOrderModal] = useState(null); // product to order
  const [orderForm, setOrderForm] = useState({ quantity: 1, fulfillmentType: 'delivery', deliveryType: 'standard' });
  const [ordering, setOrdering] = useState(false);
  const [toast, setToast] = useState(null);

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
    setOrderForm({ quantity: 1, fulfillmentType: product.pickup_available ? 'delivery' : 'delivery', deliveryType: 'standard' });
  };

  const submitOrder = async () => {
    if (!location) { showToast('Location required for delivery', 'error'); return; }
    setOrdering(true);
    try {
      const isPickup = orderForm.fulfillmentType === 'pickup';
      await orderService.create({
        productId: orderModal.id,
        quantity: orderForm.quantity,
        deliveryLocation: isPickup ? orderModal.pickup_address : location,
        deliveryDate: null,
        paymentMethod: 'card',
        deliveryType: isPickup ? 'pickup' : orderForm.deliveryType,
      });
      setOrderModal(null);
      showToast('Order placed! Proceed to payment.');
      loadOrders();
      setTab('orders');
    } catch { showToast('Failed to place order', 'error'); }
    finally { setOrdering(false); }
  };

  const totalCost = orderModal
    ? (parseFloat(orderModal.price_per_unit) * orderForm.quantity +
      (orderForm.fulfillmentType === 'pickup' ? 0 : orderForm.deliveryType === 'express' ? 45 : 25))
    : 0;

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
                <div key={o.id} className="p-5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{o.wood_type} × {o.quantity} cords</p>
                    <p className="text-sm text-gray-500">from {o.supplier_name} · {o.delivery_type}</p>
                    <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${parseFloat(o.total_price).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{orderModal.wood_type}</h2>
            <p className="text-sm text-gray-500 mb-5">{orderModal.first_name} {orderModal.last_name} · ${parseFloat(orderModal.price_per_unit).toFixed(2)}/cord</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (cords)</label>
                <input type="number" min="1" max={orderModal.quantity} value={orderForm.quantity}
                  onChange={e => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderForm({ ...orderForm, fulfillmentType: 'delivery' })}
                    className={`py-2.5 rounded-lg text-sm font-medium border-2 ${orderForm.fulfillmentType === 'delivery' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    🚚 Delivery
                  </button>
                  <button onClick={() => setOrderForm({ ...orderForm, fulfillmentType: 'pickup' })}
                    disabled={!orderModal.pickup_available}
                    className={`py-2.5 rounded-lg text-sm font-medium border-2 disabled:opacity-40 disabled:cursor-not-allowed ${orderForm.fulfillmentType === 'pickup' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                    📍 Pickup {!orderModal.pickup_available && '(unavailable)'}
                  </button>
                </div>
              </div>

              {orderForm.fulfillmentType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery speed</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'standard', label: 'Standard', sub: '+$25 · 2–3 days' },
                      { key: 'express', label: 'Express', sub: '+$45 · next day' },
                    ].map(d => (
                      <button key={d.key} onClick={() => setOrderForm({ ...orderForm, deliveryType: d.key })}
                        className={`py-2.5 px-3 rounded-lg text-sm text-left border-2 ${orderForm.deliveryType === d.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <p className="font-medium text-gray-900">{d.label}</p>
                        <p className="text-xs text-gray-500">{d.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {orderForm.fulfillmentType === 'pickup' && (
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  📍 You'll pick up at the supplier's location. No delivery fee.
                </div>
              )}

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Wood ({orderForm.quantity} cords)</span>
                  <span>${(parseFloat(orderModal.price_per_unit) * orderForm.quantity).toFixed(2)}</span>
                </div>
                {orderForm.fulfillmentType === 'delivery' && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Delivery fee</span>
                    <span>${orderForm.deliveryType === 'express' ? '45.00' : '25.00'}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>Total</span>
                  <span className="text-blue-600">${totalCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setOrderModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={submitOrder} disabled={ordering}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {ordering ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
