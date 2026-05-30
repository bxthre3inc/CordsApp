import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ROLE_COLORS = {
  buyer: 'bg-blue-100 text-blue-700',
  supplier: 'bg-green-100 text-green-700',
  delivery: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'orders') loadOrders();
    if (tab === 'products') loadProducts();
  }, [tab]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStats = async () => {
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await adminService.getUsers({ search: userSearch });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await adminService.getOrders({ status: orderStatusFilter || undefined });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await adminService.getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await adminService.updateUser(userId, { role });
      showToast('User role updated');
      loadUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminService.deleteUser(userId);
      showToast('User deleted');
      loadUsers();
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  const overrideOrderStatus = async (orderId, status) => {
    try {
      await adminService.overrideOrderStatus(orderId, status);
      showToast('Order status updated');
      loadOrders();
    } catch (err) {
      showToast('Failed to update order', 'error');
    }
  };

  const toggleProduct = async (productId) => {
    try {
      await adminService.toggleProduct(productId);
      showToast('Product toggled');
      loadProducts();
    } catch (err) {
      showToast('Failed to toggle product', 'error');
    }
  };

  const TABS = ['overview', 'users', 'orders', 'products'];

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">🪵 Cords Admin</h1>
          <p className="text-xs text-gray-400">Platform Management</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Sign Out</button>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Users', value: parseInt(stats.users.total).toLocaleString(), sub: `${stats.users.suppliers} suppliers` },
                { label: 'Buyers', value: parseInt(stats.users.buyers).toLocaleString(), sub: `${stats.users.drivers} drivers` },
                { label: 'Total Orders', value: parseInt(stats.orders.total).toLocaleString(), sub: `${stats.orders.pending} pending` },
                { label: 'Monthly Revenue', value: `$${parseFloat(stats.revenue_month).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'completed orders' },
                { label: 'New This Week', value: stats.new_signups_week, sub: 'signups' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pending', value: stats.orders.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'In Transit', value: stats.orders.in_transit, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Delivered', value: stats.orders.delivered, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Active Listings', value: stats.products.active, color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-5`}>
                  <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers()}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
              <button onClick={loadUsers} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={e => updateUserRole(u.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${ROLE_COLORS[u.role]}`}
                        >
                          {['buyer', 'supplier', 'delivery', 'admin'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <select
                value={orderStatusFilter}
                onChange={e => { setOrderStatusFilter(e.target.value); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">All Statuses</option>
                {['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button onClick={loadOrders} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Filter</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Wood</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">#{o.id}</td>
                      <td className="px-4 py-3 text-gray-900">{o.buyer_name}</td>
                      <td className="px-4 py-3 text-gray-500">{o.supplier_name}</td>
                      <td className="px-4 py-3">{o.wood_type}</td>
                      <td className="px-4 py-3 font-semibold">${parseFloat(o.total_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) overrideOrderStatus(o.id, e.target.value); }}
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value="">Set status</option>
                          {['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Wood Type</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.wood_type}</td>
                      <td className="px-4 py-3 text-gray-500">{p.supplier_name}</td>
                      <td className="px-4 py-3">${parseFloat(p.price_per_unit).toFixed(2)}/{p.unit}</td>
                      <td className="px-4 py-3">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleProduct(p.id)}
                          className={`text-xs font-medium ${p.active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
