import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { WOOD_TYPE_GROUPS, ALL_WOOD_TYPES } from '../utils/woodTypes';
import { CURRENCIES, formatPrice, formatRange } from '../utils/currency';
import apiClient from '../services/api';

const COUNTRY_NAMES = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
  NZ: 'New Zealand', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
  SE: 'Sweden', NO: 'Norway', FI: 'Finland', PL: 'Poland', AT: 'Austria',
  CH: 'Switzerland', NL: 'Netherlands', BE: 'Belgium', ZA: 'South Africa',
  BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', JP: 'Japan', IN: 'India',
  CN: 'China', KR: 'South Korea',
};

const SEASONING_LABELS = {
  kiln_dried: { label: 'Kiln Dried',  color: 'bg-orange-100 text-orange-700' },
  seasoned:   { label: 'Seasoned',    color: 'bg-green-100 text-green-700' },
  seasoning:  { label: 'Seasoning',   color: 'bg-yellow-100 text-yellow-700' },
  green:      { label: 'Green Wood',  color: 'bg-gray-100 text-gray-600' },
};

function countryName(code) {
  return code ? (COUNTRY_NAMES[code] || code) : '—';
}

function WoodTypeBadge({ woodType }) {
  const group = WOOD_TYPE_GROUPS.find(g => g.types.includes(woodType));
  return (
    <span className="text-xs text-gray-400">{group?.region || 'Other'}</span>
  );
}

export default function MarketIndex() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [currency, setCurrency]     = useState('USD');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterWoodType, setFilterWoodType] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient.get('/products/price-index')
      .then(res => { setRows(res.data); setLoading(false); })
      .catch(() => { setError('Failed to load price index'); setLoading(false); });
  }, []);

  const countries = useMemo(() => {
    const codes = [...new Set(rows.map(r => r.country_code).filter(Boolean))].sort();
    return codes;
  }, [rows]);

  const units = useMemo(() => {
    return [...new Set(rows.map(r => r.unit).filter(Boolean))].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterCountry  && r.country_code !== filterCountry) return false;
      if (filterWoodType && r.wood_type    !== filterWoodType) return false;
      if (filterUnit     && r.unit         !== filterUnit)     return false;
      return true;
    });
  }, [rows, filterCountry, filterWoodType, filterUnit]);

  const totalListings   = filtered.reduce((s, r) => s + parseInt(r.listing_count || 0), 0);
  const totalSuppliers  = filtered.reduce((s, r) => s + parseInt(r.supplier_count || 0), 0);
  const totalWoodTypes  = new Set(filtered.map(r => r.wood_type)).size;
  const totalCountries  = new Set(filtered.map(r => r.country_code).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-gray-900">🪵 Cords</Link>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="text-sm text-gray-500 hover:text-gray-700">Sign in</Link>
          <Link to="/register" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Sell wood
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-b border-orange-100 px-6 py-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Global Firewood Price Index
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Real prices from real suppliers worldwide — updated as new listings are added.
          Helping stabilize wood prices per species, per region, year-round.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm">
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-200">
            <span className="text-2xl font-bold text-blue-600">{totalListings}</span>
            <p className="text-gray-500 text-xs mt-0.5">Active listings</p>
          </div>
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-200">
            <span className="text-2xl font-bold text-green-600">{totalSuppliers}</span>
            <p className="text-gray-500 text-xs mt-0.5">Suppliers</p>
          </div>
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-200">
            <span className="text-2xl font-bold text-amber-600">{totalWoodTypes}</span>
            <p className="text-gray-500 text-xs mt-0.5">Wood species</p>
          </div>
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-200">
            <span className="text-2xl font-bold text-purple-600">{totalCountries}</span>
            <p className="text-gray-500 text-xs mt-0.5">Countries</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Country</label>
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[160px]"
              >
                <option value="">All Countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{countryName(c)} ({c})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Wood Species</label>
              <select
                value={filterWoodType}
                onChange={e => setFilterWoodType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[180px]"
              >
                <option value="">All Species</option>
                {WOOD_TYPE_GROUPS.map(g => (
                  <optgroup key={g.region} label={g.region}>
                    {g.types.filter(t => !filterCountry || rows.some(r => r.wood_type === t && r.country_code === filterCountry)).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Unit</label>
              <select
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All Units</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {Object.values(CURRENCIES).map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            {(filterCountry || filterWoodType || filterUnit) && (
              <button
                onClick={() => { setFilterCountry(''); setFilterWoodType(''); setFilterUnit(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 self-end pb-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🌲</div>
            <p>Loading price data...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No price data yet.</p>
            <p className="text-sm mt-1">
              Be the first supplier in your area —{' '}
              <Link to="/register" className="text-blue-600 hover:underline">create a free listing</Link>.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Species</th>
                      <th className="px-5 py-3 text-left font-medium">Country / Region</th>
                      <th className="px-5 py-3 text-left font-medium">Unit</th>
                      <th className="px-4 py-3 text-right font-medium">Avg Price</th>
                      <th className="px-4 py-3 text-right font-medium">Range</th>
                      <th className="px-4 py-3 text-right font-medium">Listings</th>
                      <th className="px-4 py-3 text-right font-medium">Suppliers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row, i) => (
                      <tr key={i} className="hover:bg-amber-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900">{row.wood_type}</p>
                          <WoodTypeBadge woodType={row.wood_type} />
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-gray-700">{countryName(row.country_code)}</p>
                          {row.region_name && <p className="text-xs text-gray-400">{row.region_name}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{row.unit}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold text-gray-900">
                            {formatPrice(row.avg_price, currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500">
                          {formatRange(row.min_price, row.max_price, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700">{row.listing_count}</td>
                        <td className="px-4 py-3.5 text-right text-gray-700">{row.supplier_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Prices are user-submitted in USD and converted at approximate exchange rates for display only.
              Last updated: {filtered.reduce((latest, r) => {
                const d = new Date(r.last_updated);
                return d > latest ? d : latest;
              }, new Date(0)).toLocaleDateString()}.
              {' '}<Link to="/register" className="text-blue-500 hover:underline">List your wood →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
