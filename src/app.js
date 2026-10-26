const express = require('express');
const cors = require('cors');

const app = express();

const passport = require('./config/passport');
const session = require('express-session');

// Middleware
app.use(express.json());
app.use(cors());

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Health check route
app.get('/', (req, res) => {
  res.send('AuthX API Running...');
});

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const sessionRoutes = require('./routes/sessionRoutes');
app.use('/api/sessions', sessionRoutes);

const twoFactorRoutes = require('./routes/twoFactorRoutes');
app.use('/api/2fa', twoFactorRoutes);

const auditRoutes = require('./routes/auditRoutes');
app.use('/api/audit', auditRoutes);

const User = require('./models/User');

app.get('/create-user', async (req, res) => {
  try {
    const user = await User.create({
      email: "test@example.com",
      password: "123456"
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const authMiddleware = require('./middleware/authMiddleware');

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    msg: "You accessed protected route",
    user: req.user
  });
});

const roleMiddleware = require('./middleware/roleMiddleware');

app.get(
  '/api/admin',
  authMiddleware,
  roleMiddleware('admin'),
  (req, res) => {
    res.json({ msg: "Welcome Admin!" });
  }
);

module.exports = app;
