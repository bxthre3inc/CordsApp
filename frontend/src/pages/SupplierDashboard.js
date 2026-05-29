import React, { useState, useEffect } from 'react';
import { orderService, productService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SupplierDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    woodType: '',
    quantity: '',
    unit: 'cord',
    pricePerUnit: '',
    location: {},
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsResponse = await productService.getBySupplier(user?.id);
      setProducts(productsResponse.data);

      const ordersResponse = await orderService.getSupplierOrders();
      setOrders(ordersResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const productData = {
            ...newProduct,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          };

          await productService.create(productData);
          setNewProduct({
            woodType: '',
            quantity: '',
            unit: 'cord',
            pricePerUnit: '',
            location: {},
            description: ''
          });
          setShowAddProduct(false);
          loadData();
        });
      }
    } catch (error) {
      console.error('Failed to add product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Supplier Dashboard</h1>

        {/* Add Product Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            {showAddProduct ? 'Cancel' : 'Add Product'}
          </button>

          {showAddProduct && (
            <div className="mt-4 bg-white rounded-lg shadow p-6">
              <form onSubmit={handleAddProduct}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={newProduct.woodType}
                    onChange={(e) => setNewProduct({ ...newProduct, woodType: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Wood Type</option>
                    {['Oak', 'Maple', 'Pine', 'Cherry', 'Walnut', 'Birch', 'Ash', 'Cedar'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />

                  <input
                    type="number"
                    placeholder="Price per Unit"
                    step="0.01"
                    value={newProduct.pricePerUnit}
                    onChange={(e) => setNewProduct({ ...newProduct, pricePerUnit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />

                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cord">Cord</option>
                    <option value="board_foot">Board Foot</option>
                    <option value="ton">Ton</option>
                  </select>

                  <textarea
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Adding...' : 'Add Product'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Products</h2>
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900">{product.wood_type}</h3>
                  <p className="text-gray-600 text-sm">${product.price_per_unit} per {product.unit}</p>
                  <p className="text-gray-500 text-sm">{product.quantity} {product.unit} available</p>
                </div>
              ))}
            </div>
          </div>

          {/* Orders Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Incoming Orders</h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900">{order.wood_type}</h3>
                  <p className="text-gray-600 text-sm">{order.quantity} units ordered by {order.buyer_name}</p>
                  <p className="text-blue-600 font-medium">${order.total_price}</p>
                  <p className="text-sm text-gray-500">Status: {order.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
