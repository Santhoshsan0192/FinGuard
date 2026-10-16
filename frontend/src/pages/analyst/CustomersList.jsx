import React, { useState, useEffect } from 'react';
import { Search, User, CreditCard, Calendar, ArrowRight, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import finguardApi from '../../api/finguardApi';

export default function CustomersList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [customers, setCustomers] = useState([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await finguardApi.getAllCustomers(page, pageSize, searchQuery, 'customerId', 'asc');
        setCustomers(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } catch (err) {
        console.error('Failed to load customers:', err);
        setError('Unable to load customer directory. Please check the backend connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [page, pageSize, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(0); // Reset to first page on new search
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Customer Discovery</h1>
        <p className="text-sm text-zinc-400 max-w-3xl">
          Search the customer directory to investigate behavioural baselines, risk scoring profiles, and transaction histories.
        </p>
      </div>

      {/* Compact Search Section */}
      <div className="bg-[#0d121f] border border-zinc-800/80 rounded-xl p-6 shadow-sm max-w-3xl">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <label htmlFor="customer-search" className="text-sm font-medium text-zinc-300">
            Search Directory
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-zinc-500 absolute left-3.5 top-3" />
              <input
                id="customer-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Customer ID or Name..."
                className="w-full bg-zinc-900/50 border border-zinc-700 focus:border-indigo-500 rounded-lg pl-11 pr-4 py-2.5 text-zinc-100 focus:outline-none transition-colors shadow-inner"
              />
            </div>
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-indigo-900/20"
            >
              Search
            </button>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(0);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Directory Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-zinc-200">Customer Directory</h2>
          {!loading && !error && (
            <span className="text-sm text-zinc-400">Total: {totalElements} customers</span>
          )}
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 h-32" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-6 text-center max-w-3xl">
            <p className="text-rose-400">{error}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-12 text-center max-w-3xl">
            <User className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-zinc-300 font-medium mb-1">No customers found</h3>
            <p className="text-zinc-500 text-sm">
              {searchQuery ? `No matches for "${searchQuery}" in the directory.` : 'The customer directory is empty.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customers.map((customer) => {
                const custId = customer.customerId || customer.id;
                // Use the new realistic name generated by script or fallback
                const displayName = customer.name || customer.fullName || `Customer ${custId}`;
                
                return (
                  <div 
                    key={custId}
                    onClick={() => navigate(`/analyst/customers/${custId}`)}
                    className="bg-[#0d121f] border border-zinc-800/80 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-900/10 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-950/50 group-hover:text-indigo-400 transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-zinc-100 font-medium truncate max-w-[150px]" title={displayName}>
                              {displayName}
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{custId}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        {customer.email && (
                          <div className="text-xs text-zinc-400 truncate">
                            {customer.email}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          {customer.primaryDevice && (
                            <div className="flex items-center gap-1.5" title="Primary Device">
                              <Smartphone className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[80px]">{customer.primaryDevice}</span>
                            </div>
                          )}
                          {(customer.card4 || customer.card6) && (
                            <div className="flex items-center gap-1.5" title="Primary Card">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{customer.card4 || customer.card6 || 'Card'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      <span>
                        {customer.status === 'ACTIVE' ? (
                          <span className="text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">Active</span>
                        ) : customer.status ? (
                          <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{customer.status}</span>
                        ) : (
                          <span className="text-zinc-600">Profile Available</span>
                        )}
                      </span>
                      {customer.createdAt && (
                        <span className="flex items-center gap-1 opacity-70">
                          <Calendar className="w-3 h-3" />
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 border-t border-zinc-800/80 pt-6">
                <div className="text-sm text-zinc-400">
                  Showing <span className="font-medium text-zinc-200">{page * pageSize + 1}</span> to <span className="font-medium text-zinc-200">{Math.min((page + 1) * pageSize, totalElements)}</span> of <span className="font-medium text-zinc-200">{totalElements}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-300 font-medium px-4">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
