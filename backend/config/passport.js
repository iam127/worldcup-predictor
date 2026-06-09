import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { pool } from './database.js'

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.FRONTEND_URL || 'http://localhost'}/api/auth/google/callback`,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email  = profile.emails[0].value
      const avatar = profile.photos?.[0]?.value || null

      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, name, avatar)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) DO UPDATE
           SET name = EXCLUDED.name, avatar = EXCLUDED.avatar
         RETURNING *`,
        [profile.id, email, profile.displayName, avatar]
      )

      // Auto-promote first admin
      const adminEmail = process.env.FIRST_ADMIN_EMAIL
      if (adminEmail && email === adminEmail && !rows[0].is_admin) {
        await pool.query('UPDATE users SET is_admin = TRUE WHERE id = $1', [rows[0].id])
        rows[0].is_admin = true
      }

      done(null, rows[0])
    } catch (err) {
      done(err)
    }
  }
))
