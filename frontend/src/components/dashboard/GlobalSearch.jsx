import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flatResults, setFlatResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef();
  const navigate = useNavigate();

  // --- Debounce search input ---
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim().length >= 2) handleSearch(query.trim());
      else {
        setResults(null);
        setFlatResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  // --- Fetch search results ---
  const handleSearch = async (searchTerm) => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data);
      const all = [
        ...(data.patients || []).map((i) => ({ ...i, type: 'PATIENTS' })),
        ...(data.test_requests || []).map((i) => ({ ...i, type: 'TEST_REQUESTS' })),
        ...(data.staff || []).map((i) => ({ ...i, type: 'STAFF' })),
      ];
      setFlatResults(all);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle keyboard shortcuts ---
  const handleKeyDown = (e) => {
    if (!showDropdown || !flatResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleResultClick(flatResults[selectedIndex].type, flatResults[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // --- Close dropdown when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!inputRef.current?.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Handle click on a result item ---
  const handleResultClick = (type, id) => {
    setShowDropdown(false);
    setQuery('');
    switch (type) {
      case 'PATIENTS':
        navigate(`/patients/${id}`);
        break;
      case 'TEST_REQUESTS':
        navigate(`/tests/requests/${id}`);
        break;
      case 'STAFF':
        navigate(`/admin/staff`);
        break;
      default:
        break;
    }
  };

  // --- Render each section (grouped results) ---
  const renderSection = (title, items) => {
    if (!Array.isArray(items) || items.length === 0)
      return <div className="p-2 text-gray-400 text-sm">No results</div>;

    return (
      <ul>
        {items.map((item, idx) => {
          const flatIndex = flatResults.findIndex((r) => r.id === item.id && r.type === title);
          const isSelected = flatIndex === selectedIndex;

          return (
            <li
              key={`${title}-${item.id}`}
              onClick={() => handleResultClick(title, item.id)}
              className={`p-2 border-b last:border-none cursor-pointer transition-all ${
                isSelected ? 'bg-blue-100' : 'hover:bg-blue-50 hover:pl-3'
              }`}
            >
              <div className="font-medium text-gray-800">
                {item.first_name
                  ? `${item.first_name} ${item.last_name}`
                  : item.full_name || item.name || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500">
                {title === 'PATIENTS' && item.lab_id && `Lab ID: ${item.lab_id}`}
                {title === 'STAFF' && item.email && `Email: ${item.email}`}
                {title === 'TEST_REQUESTS' && `Request ID: ${item.id}`}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // --- UI ---
  return (
    <div className="relative w-full max-w-md mx-auto" ref={inputRef}>
      <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
        <HiOutlineSearch className="text-gray-500 mr-2" />
        <input
          type="text"
          placeholder="🔍 Search patients, requests, staff..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent flex-grow focus:outline-none text-sm text-gray-700"
        />
      </div>

      {showDropdown && (
        <div className="absolute mt-2 w-full bg-white shadow-lg rounded-md z-50 max-h-80 overflow-y-auto border">
          {loading && <div className="p-3 text-gray-500 text-sm">Searching...</div>}

          {!loading && results && (
            <>
              <div className="p-2 bg-gray-50 text-xs font-semibold text-gray-600">PATIENTS</div>
              {renderSection('PATIENTS', results.patients)}

              <div className="p-2 bg-gray-50 text-xs font-semibold text-gray-600">TEST REQUESTS</div>
              {renderSection('TEST_REQUESTS', results.test_requests)}

              <div className="p-2 bg-gray-50 text-xs font-semibold text-gray-600">STAFF</div>
              {renderSection('STAFF', results.staff)}
            </>
          )}

          {!loading && !results && (
            <div className="p-3 text-gray-400 text-sm">Type to search...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
