const API_URL = '/api/search/';

const globalSearch = async (query, token) => {
    if (!query) return null;
    
    const config = { headers: { 'Authorization': `Bearer ${token}` } };
    const response = await fetch(`${API_URL}?q=${query}`, config);

    if (!response.ok) {
        throw new Error('Search failed');
    }
    return response.json();
};

const searchService = {
    globalSearch,
};

export default searchService;
