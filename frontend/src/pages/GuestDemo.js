import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK = {
  buyer: {
    products: [
      { id: 1, wood_type: 'Oak', price_per_unit: 285, quantity: 12, unit: 'cord', distance: 4.2, first_name: 'Mike', last_name: 'Thompson', description: 'Seasoned split oak, ready to burn. Delivered within 48 hrs.' },
      { id: 2, wood_type: 'Oak', price_per_unit: 265, quantity: 8, unit: 'cord', distance: 7.8, first_name: 'Sarah', last_name: 'Jennings', description: 'Mixed hardwood, mostly oak. Great for outdoor fire pits.' },
      { id: 3, wood_type: 'Oak', price_per_unit: 310, quantity: 20, unit: 'cord', distance: 12.1, first_name: 'Dave', last_name: 'Kowalski', description: 'Premium kiln-dried oak. Low moisture, high BTU output.' },
      { id: 4, wood_type: 'Pine', price_per_unit: 180, quantity: 6, unit: 'cord', distance: 5.4, first_name: 'Karen', last_name: 'Wells', description: 'Split pine, great for kindling and starter fires.' },
    ],
    priceData: { avg_price: 287.50, min_price: 265, max_price: 310, supplier_count: 4 },
    orders: [
      { id: 101, wood_type: 'Oak', quantity: 2, total_price: 570, status: 'delivered', supplier_name: 'Mike T.' },
      { id: 102, wood_type: 'Pine', quantity: 1, total_price: 180, status: 'in_transit', supplier_name: 'Karen W.' },
    ]
  },
  supplier: {
    products: [
      { id: 1, wood_type: 'Oak', price_per_unit: 285, quantity: 12, unit: 'cord' },
      { id: 2, wood_type: 'Pine', price_per_unit: 180, quantity: 5, unit: 'cord' },
      { id: 3, wood_type: 'Maple', price_per_unit: 320, quantity: 3, unit: 'cord' },
    ],
    orders: [
      { id: 201, wood_type: 'Oak', quantity: 2, buyer_name: 'Alex R.', total_price: 570, status: 'pending', delivery_type: 'standard' },
      { id: 202, wood_type: 'Pine', quantity: 1, buyer_name: 'Jordan K.', total_price: 180, status: 'confirmed', delivery_type: 'express' },
      { id: 203, wood_type: 'Oak', quantity: 3, buyer_name: 'Sam T.', total_price: 855, status: 'delivered', delivery_type: 'standard' },
    ],
    earnings: { today: 180, week: 1425, month: 5870 }
  },
  delivery: {
    available: true,
    activeOrder: {
      id: 301, wood_type: 'Oak', quantity: 2,
      buyer_name: 'Alex Rivera', delivery_address: '742 Evergreen Terrace, Springfield',
      distance: 6.4, total_price: 570, status: 'confirmed',
      supplier_name: 'Mike Thompson', pickup_address: '12 Woodyard Ln, Springfield',
      delivery_fee: 35
    },
    availableOrders: [
      { id: 302, wood_type: 'Pine', quantity: 1, delivery_address: '1600 Penn Ave', distance: 3.2, delivery_fee: 22, supplier_name: 'Karen Wells' },
      { id: 303, wood_type: 'Maple', quantity: 4, delivery_address: '221B Baker St', distance: 8.7, delivery_fee: 48, supplier_name: 'Dave Kowalski' },
    ],
    earnings: { today: 57, week: 284, month: 1120, jobs_today: 2, jobs_week: 11 }
  },
  admin: {
    stats: { total_users: 847, active_suppliers: 124, total_orders: 2341, revenue_month: 48920, new_signups_week: 43, pending_orders: 17 },
    users: [
      { id: 1, first_name: 'Mike', last_name: 'Thompson', email: 'mike@woodco.com', role: 'supplier', created_at: '2024-01-15' },
      { id: 2, first_name: 'Alex', last_name: 'Rivera', email: 'alex@email.com', role: 'buyer', created_at: '2024-02-20' },
      { id: 3, first_name: 'Jordan', last_name: 'Kim', email: 'jordan@deliver.com', role: 'delivery', created_at: '2024-03-01' },
      { id: 4, first_name: 'Sarah', last_name: 'Jennings', email: 'sarah@logs.com', role: 'supplier', created_at: '2024-01-28' },
    ],
    recentOrders: [
      { id: 201, buyer_name: 'Alex R.', supplier_name: 'Mike T.', wood_type: 'Oak', total_price: 570, status: 'pending' },
      { id: 202, buyer_name: 'Jordan K.', supplier_name: 'Sarah J.', wood_type: 'Pine', total_price: 180, status: 'in_transit' },
      { id: 203, buyer_name: 'Sam T.', supplier_name: 'Dave K.', wood_type: 'Maple', total_price: 1280, status: 'delivered' },
    ]
  }
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ROLE_COLORS = {
  buyer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-green-100 text-green-800',
  delivery: 'bg-orange-100 text-orange-800',
  admin: 'bg-red-100 text-red-800',
};

function BuyerView() {
  const [selectedWoodType, setSelectedWoodType] = useState('Oak');
  const [searched, setSearched] = useState(true);
  const { products, priceData } = MOCK.buyer;

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 flex-wrap items-center">
          <select
            value={selectedWoodType}
            onChange={e => setSelectedWoodType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {['Oak', 'Maple', 'Pine', 'Cherry', 'Walnut', 'Birch'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => setSearched(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Search Nearby (50 mi)
          </button>
        </div>
        {searched && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900">{selectedWoodType} — Market Avg in Your Area</p>
            <div className="flex gap-6 mt-1 text-sm text-blue-800">
              <span>Avg: <strong>${priceData.avg_price.toFixed(2)}/cord</strong></span>
              <span>Low: ${priceData.min_price}</span>
              <span>High: ${priceData.max_price}</span>
              <span>{priceData.supplier_count} suppliers nearby</span>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <span className="text-5xl">🪵</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900">{p.wood_type}</h3>
                <span className="text-xs text-gray-500">{p.distance} mi away</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{p.description}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">${p.price_per_unit}<span className="text-sm font-normal text-gray-500">/cord</span></span>
                <span className="text-sm text-gray-600">{p.quantity} cords left</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{p.first_name} {p.last_name}</p>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Request Quote
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupplierView() {
  const { products, orders, earnings } = MOCK.supplier;
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today', value: `$${earnings.today}` },
          { label: 'This Week', value: `$${earnings.week}` },
          { label: 'This Month', value: `$${earnings.month}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-5 text-center">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Inventory</h2>
            <button className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">+ Add</button>
          </div>
          <div className="space-y-3">
            {products.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{p.wood_type}</p>
                  <p className="text-sm text-gray-500">{p.quantity} {p.unit} available</p>
                </div>
                <p className="text-blue-600 font-semibold">${p.price_per_unit}/{p.unit}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Incoming Orders</h2>
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{o.wood_type} × {o.quantity}</p>
                    <p className="text-sm text-gray-500">{o.buyer_name} · {o.delivery_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${o.total_price}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryView() {
  const [online, setOnline] = useState(true);
  const [activeStatus, setActiveStatus] = useState('confirmed');
  const { activeOrder, availableOrders, earnings } = MOCK.delivery;

  return (
    <div>
      <div className={`rounded-2xl p-6 mb-6 text-white ${online ? 'bg-green-600' : 'bg-gray-500'}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-semibold">{online ? 'You are Online' : 'You are Offline'}</p>
            <p className="text-sm opacity-80">{online ? 'Accepting new deliveries' : 'Go online to receive orders'}</p>
          </div>
          <button
            onClick={() => setOnline(!online)}
            className={`w-16 h-8 rounded-full transition-colors ${online ? 'bg-white' : 'bg-gray-400'} relative`}
          >
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-green-600 transition-all ${online ? 'left-9' : 'left-1 bg-gray-500'}`} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/30">
          <div className="text-center">
            <p className="text-xl font-bold">${earnings.today}</p>
            <p className="text-xs opacity-80">Today</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{earnings.jobs_today}</p>
            <p className="text-xs opacity-80">Deliveries</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">${earnings.week}</p>
            <p className="text-xs opacity-80">This Week</p>
          </div>
        </div>
      </div>

      {online && (
        <>
          <div className="bg-white rounded-xl shadow-md p-5 mb-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Active Delivery</p>
                <h3 className="text-lg font-bold text-gray-900">{activeOrder.wood_type} × {activeOrder.quantity} cords</h3>
                <p className="text-sm text-gray-500">for {activeOrder.buyer_name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[activeStatus]}`}>
                {activeStatus === 'confirmed' ? 'Ready for Pickup' : 'En Route'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">●</span>
                <div>
                  <p className="font-medium text-gray-800">Pick Up</p>
                  <p>{activeOrder.pickup_address}</p>
                  <p className="text-xs text-gray-400">From {activeOrder.supplier_name}</p>
                </div>
              </div>
              <div className="border-l-2 border-gray-200 ml-2 h-4" />
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">●</span>
                <div>
                  <p className="font-medium text-gray-800">Drop Off</p>
                  <p>{activeOrder.delivery_address}</p>
                  <p className="text-xs text-gray-400">{activeOrder.distance} mi · Est. ${ activeOrder.delivery_fee}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {activeStatus === 'confirmed' && (
                <button
                  onClick={() => setActiveStatus('in_transit')}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                >
                  Picked Up — Start Delivery
                </button>
              )}
              {activeStatus === 'in_transit' && (
                <button
                  onClick={() => setActiveStatus('delivered')}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
                >
                  Mark as Delivered
                </button>
              )}
              {activeStatus === 'delivered' && (
                <div className="flex-1 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm text-center">
                  Delivered! +${activeOrder.delivery_fee} earned
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-gray-900 mb-3">Available Nearby</h3>
            <div className="space-y-3">
              {availableOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{o.wood_type} × {o.quantity}</p>
                    <p className="text-sm text-gray-500">{o.delivery_address}</p>
                    <p className="text-xs text-gray-400">{o.distance} mi · from {o.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${o.delivery_fee}</p>
                    <button className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AdminView() {
  const [tab, setTab] = useState('users');
  const { stats, users, recentOrders } = MOCK.admin;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total_users.toLocaleString() },
          { label: 'Suppliers', value: stats.active_suppliers },
          { label: 'Total Orders', value: stats.total_orders.toLocaleString() },
          { label: 'Monthly Revenue', value: `$${stats.revenue_month.toLocaleString()}` },
          { label: 'New This Week', value: stats.new_signups_week },
          { label: 'Pending Orders', value: stats.pending_orders },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          {['users', 'orders'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'users' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="py-3 text-gray-500">{u.created_at}</td>
                    <td className="py-3">
                      <button className="text-xs text-red-500 hover:text-red-700">Suspend</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'orders' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Buyer</th>
                  <th className="pb-2">Supplier</th>
                  <th className="pb-2">Wood</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="py-3 text-gray-400">#{o.id}</td>
                    <td className="py-3">{o.buyer_name}</td>
                    <td className="py-3">{o.supplier_name}</td>
                    <td className="py-3">{o.wood_type}</td>
                    <td className="py-3 font-medium">${o.total_price}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const ROLES = [
  { key: 'buyer', label: 'Buyer', emoji: '🛒', desc: 'Browse and order wood' },
  { key: 'supplier', label: 'Supplier', emoji: '🪵', desc: 'List inventory, manage orders' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚', desc: 'Driver dashboard' },
  { key: 'admin', label: 'Admin', emoji: '⚙️', desc: 'Platform management' },
];

export default function GuestDemo() {
  const [role, setRole] = useState('buyer');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
        Demo Mode — You are exploring CordsApp without an account. No data is saved.
        <button
          onClick={() => navigate('/register')}
          className="ml-4 underline hover:no-underline font-semibold"
        >
          Create free account →
        </button>
      </div>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-gray-900">🪵 Cords</span>
          <div className="flex gap-2">
            <button onClick={() => navigate('/login')} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Sign In</button>
            <button onClick={() => navigate('/register')} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Get Started</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-gray-600 mb-3 text-sm">Explore each dashboard type:</p>
          <div className="flex gap-3 flex-wrap">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  role === r.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{ROLES.find(r => r.key === role)?.desc}</p>
        </div>

        {role === 'buyer' && <BuyerView />}
        {role === 'supplier' && <SupplierView />}
        {role === 'delivery' && <DeliveryView />}
        {role === 'admin' && <AdminView />}
      </div>
    </div>
  );
}
