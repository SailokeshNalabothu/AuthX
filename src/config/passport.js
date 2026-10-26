const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            password: "google_oauth",
            isVerified: true
          });
        }

        const accessToken = jwt.sign(
          { userId: user._id, role: user.role },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
          { userId: user._id },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '7d' }
        );

        const Session = require('../models/Session');
        const session = await Session.create({
          userId: user._id,
          refreshToken,
          deviceType: 'Desktop',
          browser: 'Google OAuth',
          os: 'Web',
          ipAddress: '127.0.0.1',
          location: 'SSO Login',
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return done(null, { accessToken, refreshToken, sessionId: session._id });

      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
