const API_URL = '/api/inventory/';

// Function to get all inventory items
const getAllItems = async (token) => {
  const config = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const response = await fetch(API_URL, config);
  if (!response.ok) {
    throw new Error('Failed to fetch inventory items');
  }
  return response.json();
};

// Function to get a single item by ID
const getItemById = async (itemId, token) => {
  const config = {
    headers: { 'Authorization': `Bearer ${token}` },
  };
  const response = await fetch(`${API_URL}${itemId}`, config);
  if (!response.ok) {
    throw new Error('Failed to fetch item');
  }
  return response.json();
};

// Function to create a new inventory item
const createItem = async (itemData, token) => {
  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  };
  const response = await fetch(API_URL, config);
  if (!response.ok) {
    throw new Error('Failed to create inventory item');
  }
  return response.json();
};

// Function to update an inventory item
const updateItem = async (itemId, itemData, token) => {
  const config = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  };
  const response = await fetch(`${API_URL}${itemId}`, config);
  if (!response.ok) {
    throw new Error('Failed to update item');
  }
  return response.json();
};

// Function to delete an inventory item
const deleteItem = async (itemId, token) => {
  const config = {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const response = await fetch(`${API_URL}${itemId}`, config);
  if (!response.ok) {
    throw new Error('Failed to delete item');
  }
  return response.ok;
};

const inventoryService = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};

export default inventoryService;