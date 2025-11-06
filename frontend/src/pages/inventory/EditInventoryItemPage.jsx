import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';

const EditInventoryItemPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    quantity: 0,
    low_stock_threshold: 10,
    expiry_date: '',
    department: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define options for consistency
  const departmentOptions = ['PHLEBOTOMY', 'CHEMISTRY', 'HEMATOLOGY', 'MICROBIOLOGY', 'GENERAL'];
  const categoryOptions = ['Consumables', 'Reagents', 'Glassware', 'Equipment'];

  useEffect(() => {
    const fetchItemData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo ? userInfo.token : null;
        const data = await inventoryService.getItemById(id, token);

        const formattedDate = data.expiry_date ? new Date(data.expiry_date).toISOString().split('T')[0] : '';
        
        setFormData({
          name: data.name || '',
          category: data.category || '',
          supplier: data.supplier || '',
          quantity: data.quantity || 0,
          low_stock_threshold: data.low_stock_threshold || 10,
          expiry_date: formattedDate,
          department: data.department || '',
        });
      } catch (err) {
        setError("Failed to load item data. The item may not exist.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItemData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo ? userInfo.token : null;
      await inventoryService.updateItem(id, formData, token);
      alert('Item updated successfully!');
      navigate('/inventory');
    } catch (error) {
      alert('Failed to update item.');
    }
  };

  if (loading) return <div>Loading item data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Edit Item: {formData.name}</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        <select name="category" value={formData.category} onChange={handleChange} required>
          <option value="">Select Category</option>
          {categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input type="text" name="supplier" placeholder="Supplier" value={formData.supplier} onChange={handleChange} />
        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required />
        <select name="department" value={formData.department} onChange={handleChange} required>
          <option value="">Select Department</option>
          {departmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input type="number" name="low_stock_threshold" placeholder="Low Stock Threshold" value={formData.low_stock_threshold} onChange={handleChange} />
        <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} />
        <button type="submit">Update Item</button>
      </form>
    </div>
  );
};

export default EditInventoryItemPage;