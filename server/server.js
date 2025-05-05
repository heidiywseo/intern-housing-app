const express = require('express');
const cors = require('cors');
const config = require('./config.json');

const app = express();
app.use(cors({
  origin: '*',
}));
app.use(express.json());

const listingsRoutes = require('./routes/listings');
app.use('/listings', listingsRoutes);

// added below is for the tests, will not be used for final app, just for testing
const listingsTestRoutes = require('./routes/listings-test');
app.use('/listingsTest', listingsTestRoutes);

app.listen(config.server_port, () => {
  console.log(`Server running at http://${config.server_host}:${config.server_port}/`);
});

module.exports = app;
