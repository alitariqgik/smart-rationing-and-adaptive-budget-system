import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export const fetchProducts = (query) => API.get(`/products?search=${query}`);
export const getTest = () => API.get('/test');