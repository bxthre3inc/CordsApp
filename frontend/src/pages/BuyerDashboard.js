import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';

export const BuyerDashboard = () => {
  const [location, setLocation] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedWoodType, setSelectedWoodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState(null);

  const woodTypes = [
    'Oak',
    'Maple',
    'Pine',
    'Cherry',
    'Walnut',
    'Birch',
    'Ash',
    'Cedar'
  ];

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      });
    }
  }, []);

  const searchNearby = async () => {
    if (!location) {
      alert('Please enable location services');
      return;
    }

    setLoading(true);
    try {
      const response = await productService.getNearby(
        location.latitude,
        location.longitude,
        50,
        selectedWoodType || null
      );
      setProducts(response.data);

      // Get average price data
      if (selectedWoodType) {
        const priceResponse = await productService.getAveragePrice(
          selectedWoodType,
          location.latitude,
          location.longitude,
          50
        );
        setPriceData(priceResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Browse Wood</h1>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedWoodType}
              onChange={(e) => setSelectedWoodType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Wood Types</option>
              {woodTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              onClick={searchNearby}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Searching...' : 'Search Nearby'}
            </button>
          </div>

          {priceData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">{selectedWoodType} - Average Price</h3>
              <p className="text-blue-800">Average: ${priceData.avg_price?.toFixed(2)}</p>
              <p className="text-blue-800">Range: ${priceData.min_price?.toFixed(2)} - ${priceData.max_price?.toFixed(2)}</p>
              <p className="text-blue-800">Suppliers: {priceData.supplier_count}</p>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              {product.image && (
                <img src={product.image} alt={product.wood_type} className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">{product.wood_type}</h3>
                <p className="text-gray-600 text-sm mt-2">{product.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">${product.price_per_unit}</span>
                  <span className="text-gray-600">{product.quantity} {product.unit}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">{product.first_name} {product.last_name}</p>
                <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Request Quote
                </button>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">No products found. Try searching for a different wood type.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
