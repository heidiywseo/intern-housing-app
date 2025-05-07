const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
const listingsRoutes = require('./routes/listings');
app.use('/listings', listingsRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);


// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

const PORT = config.server_port || 3000;
const HOST = config.server_host || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
