const express = require('express');
const axios = require('axios');
const https = require('https');
const app = express();

// Create axios instance with SSL verification disabled
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false  // Bypass SSL certificate verification
  })
});

app.use(express.json());

// CORS middleware - allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Proxy all /api requests to your backend
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `https://admin.bookvenue.app${req.originalUrl}`;
    console.log(`🔄 Proxying to: ${targetUrl}`);
    
    const config = {
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };
    
    // Add Authorization header if present
    if (req.headers.authorization) {
      config.headers.Authorization = req.headers.authorization;
    }
    
    const response = await axiosInstance(config);
    
    console.log(`✅ Success: ${response.status}`);
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    
    if (error.response) {
      // Server responded with error
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // No response received
      res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Could not reach backend server'
      });
    } else {
      // Other error
      res.status(500).json({ 
        error: 'Proxy error',
        message: error.message 
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Proxy server is running',
    target: 'https://admin.bookvenue.app/api/'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Proxy Server Started!');
  console.log('=====================================');
  console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🎯 Proxying to: https://admin.bookvenue.app/api/`);
  console.log('=====================================\n');
  console.log('💡 Update your authApi.ts with:');
  console.log(`   const API_URL = 'http://YOUR_LAPTOP_IP:${PORT}/api/';`);
  console.log('\n');
});