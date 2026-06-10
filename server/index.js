const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Parse JSON bodies with a higher limit to support base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS — allow requests from the deployed frontend (and localhost for dev)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  credentials: true
}));

// Connect to MongoDB Atlas
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

// Routes
const organizationRoutes = require('./routes/organizations');
app.use('/api/organizations', organizationRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
