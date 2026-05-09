const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    }
  })
);

// Connect to MongoDB Atlas
connectDB();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Roles route
const rolesRoutes = require('./routes/roles');
app.use('/api/roles', rolesRoutes);
// User routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Organization / Fellow Center routes
const organizationRoutes = require('./routes/organizations');
app.use('/api/organizations', organizationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
