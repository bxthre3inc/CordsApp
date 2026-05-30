import React, { useState, useEffect } from 'react';
import { deliveryService } from '../services/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DeliveryDashboard() {
  const [online, setOnline] = useState(false);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [earnings, setEarnings] = useState({ earnings_today: 0, earnings_week: 0, earnings_total: 0, jobs_completed: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [assigned, available, earningsData] = await Promise.all([
        deliveryService.getAssignedOrders(),
        deliveryService.getAvailableOrders(),
        deliveryService.getEarnings(),
      ]);
      setAssignedOrders(assigned.data);
      setAvailableOrders(available.data);
      setEarnings(earningsData.data.profile);
      setHistory(earningsData.data.history);
      setOnline(earningsData.data.profile?.available || false);
    } catch (err) {
      console.error('Failed to load delivery data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async () => {
    try {
      const res = await deliveryService.toggleAvailability();
      setOnline(res.data.available);
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await deliveryService.acceptOrder(orderId);
      await loadAll();
    } catch (err) {
      console.error('Failed to accept order:', err);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await deliveryService.updateOrderStatus(orderId, status);
      await loadAll();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const activeOrder = assignedOrders.find(o => ['confirmed', 'in_transit'].includes(o.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className={`${online ? 'bg-green-600' : 'bg-gray-700'} text-white px-4 py-5`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold">🚚 Cords Driver</h1>
              <p className="text-sm opacity-80">{online ? 'Online — accepting deliveries' : 'Offline'}</p>
            </div>
            <button
              onClick={toggleOnline}
              className={`relative w-16 h-8 rounded-full transition-colors duration-200 ${online ? 'bg-white/30' : 'bg-gray-500'}`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${online ? 'left-9' : 'left-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-xl font-bold">${(earnings?.earnings_today || 0).toFixed(2)}</p>
              <p className="text-xs opacity-70">Today</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{earnings?.jobs_completed || 0}</p>
              <p className="text-xs opacity-70">All-time Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">${(earnings?.earnings_week || 0).toFixed(2)}</p>
              <p className="text-xs opacity-70">This Week</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {activeOrder && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Active Delivery</p>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{activeOrder.wood_type} × {activeOrder.quantity} cords</h2>
                <p className="text-sm text-gray-500">for {activeOrder.buyer_name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[activeOrder.status]}`}>
                {activeOrder.status === 'confirmed' ? 'Ready for Pickup' : 'En Route'}
              </span>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Pick up from {activeOrder.supplier_name}</p>
                  <p className="text-gray-500">{activeOrder.supplier_phone || 'See order details for contact'}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-gray-200 h-4" />
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Deliver to {activeOrder.buyer_name}</p>
                  <p className="text-gray-500">{activeOrder.buyer_phone || 'Contact available on pickup'}</p>
                </div>
              </div>
            </div>

            {/* Gate code — shown prominently if set */}
            {activeOrder.gate_code && (
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-3">
                <span className="text-xl">🔑</span>
                <div>
                  <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Gate / Door Code</p>
                  <p className="text-base font-mono font-bold text-yellow-900">{activeOrder.gate_code}</p>
                </div>
              </div>
            )}

            {/* Delivery notes */}
            {activeOrder.delivery_notes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Buyer Notes</p>
                <p className="text-sm text-blue-900">{activeOrder.delivery_notes}</p>
              </div>
            )}

            {/* Stacking — show only when buyer paid for it */}
            {parseFloat(activeOrder.stacking_fee || 0) > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-3 text-xs text-amber-800">
                <span>🪵</span>
                <span><strong>Hand stacking requested</strong> — buyer paid for stacking. Stack at the location they specified.</span>
              </div>
            )}

            <div className="flex gap-2">
              {activeOrder.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(activeOrder.id, 'in_transit')}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm"
                >
                  Picked Up — Start Delivery
                </button>
              )}
              {activeOrder.status === 'in_transit' && (
                <button
                  onClick={() => updateStatus(activeOrder.id, 'delivered')}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-sm"
                >
                  Confirm Delivery
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex border-b border-gray-200 bg-white rounded-t-xl">
          {[
            { key: 'active', label: 'Available Jobs' },
            { key: 'history', label: 'History' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium ${tab === t.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-xl shadow">
          {tab === 'active' && (
            <div className="divide-y divide-gray-100">
              {!online && (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-2">😴</p>
                  <p className="font-medium">You are offline</p>
                  <p className="text-sm">Go online to see available deliveries</p>
                </div>
              )}
              {online && availableOrders.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="font-medium">No deliveries available right now</p>
                  <p className="text-sm">Check back soon</p>
                </div>
              )}
              {online && availableOrders.map(order => {
                const driverEarnings = parseFloat(order.delivery_fee || 0) * 0.80;
                return (
                  <div key={order.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{order.wood_type} × {order.quantity}</p>
                      <p className="text-sm text-gray-500">from {order.supplier_name}</p>
                      {parseFloat(order.stacking_fee || 0) > 0 && (
                        <p className="text-xs text-amber-600">🪵 Stacking required</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-lg">${driverEarnings.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mb-2">your earnings</p>
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'history' && (
            <div className="divide-y divide-gray-100">
              {history.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-2">📦</p>
                  <p>No completed deliveries yet</p>
                </div>
              )}
              {history.map(order => (
                <div key={order.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{order.wood_type}</p>
                    <p className="text-sm text-gray-500">to {order.buyer_name}</p>
                    <p className="text-xs text-gray-400">{new Date(order.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+${(parseFloat(order.delivery_fee || 0) * 0.80).toFixed(2)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">delivered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
