import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';

const InventoryPage = () => {
  // Define the options for dropdowns
  const departmentOptions = ['PHLEBOTOMY', 'CHEMISTRY', 'HEMATOLOGY', 'MICROBIOLOGY', 'GENERAL'];
  const categoryOptions = ['Consumables', 'Reagents', 'Glassware', 'Equipment'];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialFormState = {
    name: '',
    category: '',
    supplier: '',
    quantity: 0,
    department: '',
    low_stock_threshold: 10,
    expiry_date: '',
  };

  const [newItem, setNewItem] = useState(initialFormState);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        const data = await inventoryService.getAllItems(token);
        setItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleInputChange = (e) => {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo ? userInfo.token : null;
      const createdItem = await inventoryService.createItem(newItem, token);
      
      setItems([...items, createdItem]);
      setNewItem(initialFormState); // Reset form
      alert('Item added successfully!');
    } catch (err) {
      alert('Failed to add item.');
    }
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        await inventoryService.deleteItem(itemId, token);
        setItems(items.filter(item => item.id !== itemId));
        alert('Item deleted.');
      } catch (err) {
        alert('Failed to delete item.');
      }
    }
  };

  if (loading) return <div className="p-6">Loading inventory...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4">Add New Item</h2>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" name="name" placeholder="Item Name" value={newItem.name} onChange={handleInputChange} required className="p-2 border border-gray-300 rounded-md" />
          <select name="category" value={newItem.category} onChange={handleInputChange} required className="p-2 border border-gray-300 rounded-md">
            <option value="">Select Category</option>
            {categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <input type="number" name="quantity" placeholder="Quantity" value={newItem.quantity} onChange={handleInputChange} className="p-2 border border-gray-300 rounded-md" />
          <select name="department" value={newItem.department} onChange={handleInputChange} required className="p-2 border border-gray-300 rounded-md">
            <option value="">Select Department</option>
            {departmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <div className="md:col-span-4">
            <button type="submit" className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition">Add Item</button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h2 className="text-2xl font-semibold p-6">Current Stock</h2>
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Supplier</th>
              <th className="p-4 font-semibold">Quantity</th>
              <th className="p-4 font-semibold">Expiry Date</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLowStock = item.quantity <= item.low_stock_threshold;
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-4">{item.name}</td>
                  <td className="p-4">{item.supplier || 'N/A'}</td>
                  <td className="p-4">{item.quantity}</td>
                  <td className="p-4">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isLowStock ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                      {isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <Link to={`/inventory/${item.id}/edit`}><button className="bg-yellow-500 text-white py-1 px-3 rounded text-sm hover:bg-yellow-600">Edit</button></Link>
                    <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryPage;