import React, { useState, useEffect } from 'react';
import { orderService, productService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const woodTypes = ['Oak', 'Maple', 'Pine', 'Cherry', 'Walnut', 'Birch', 'Ash', 'Cedar'];

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('orders');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [newProduct, setNewProduct] = useState({
    woodType: '', quantity: '', unit: 'cord', pricePerUnit: '', description: '',
    pickupAvailable: false, pickupAddress: ''
  });

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
        woodType: newProduct.woodType,
        quantity: parseFloat(newProduct.quantity),
        unit: newProduct.unit,
        pricePerUnit: parseFloat(newProduct.pricePerUnit),
        location,
        description: newProduct.description,
        pickupAvailable: newProduct.pickupAvailable,
        pickupAddress: newProduct.pickupAvailable && newProduct.pickupAddress
          ? { address: newProduct.pickupAddress }
          : null
      });
      setNewProduct({ woodType: '', quantity: '', unit: 'cord', pricePerUnit: '', description: '', pickupAvailable: false, pickupAddress: '' });
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

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const monthRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

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
          {['orders', 'inventory'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
              {t === 'orders' ? `Orders${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` : 'Inventory'}
            </button>
          ))}
        </div>

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
                <div key={o.id} className="p-5 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{o.wood_type} × {o.quantity} cords</p>
                      {o.delivery_type === 'pickup' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pickup</span>}
                      {o.delivery_type === 'express' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Express</span>}
                    </div>
                    <p className="text-sm text-gray-500">Buyer: {o.buyer_name}</p>
                    <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-gray-900">${parseFloat(o.total_price).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    {o.status === 'pending' && (
                      <button onClick={() => confirmOrder(o.id)}
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
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wood type *</label>
                      <select required value={newProduct.woodType} onChange={e => setNewProduct({ ...newProduct, woodType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">Select type</option>
                        {woodTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="cord">Cord (full)</option>
                        <option value="half_cord">Half cord</option>
                        <option value="face_cord">Face cord</option>
                        <option value="board_foot">Board foot</option>
                        <option value="ton">Ton</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input required type="number" step="0.5" min="0.5" value={newProduct.quantity}
                        onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="12" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price per unit ($) *</label>
                      <input required type="number" step="0.01" min="1" value={newProduct.pricePerUnit}
                        onChange={e => setNewProduct({ ...newProduct, pricePerUnit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="285.00" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2}
                        placeholder="Seasoned split oak, ready to burn..." />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input type="checkbox" id="pickupAvailable" checked={newProduct.pickupAvailable}
                        onChange={e => setNewProduct({ ...newProduct, pickupAvailable: e.target.checked })}
                        className="w-4 h-4 text-green-600" />
                      <label htmlFor="pickupAvailable" className="text-sm font-medium text-gray-700">
                        Offer pickup at my location
                      </label>
                    </div>
                    {newProduct.pickupAvailable && (
                      <input value={newProduct.pickupAddress} onChange={e => setNewProduct({ ...newProduct, pickupAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Pickup address (e.g. 12 Woodyard Ln, Springfield, MA)" />
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
              {products.map(p => (
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
                  {p.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex justify-between items-center">
                    <button onClick={() => togglePickup(p)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium ${p.pickup_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {p.pickup_available ? '📍 Pickup On' : '📍 Enable Pickup'}
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-3 text-center py-10 text-gray-400">
                  <p>No listings yet. Add your first product above.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
