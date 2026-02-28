require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log(err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/consent', require('./routes/consent'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 GoTrust Backend running on http://localhost:${PORT}`));