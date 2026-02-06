export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },

  postmark: {
    apiToken: process.env.POSTMARK_API_TOKEN || '',
  },

  email: {
    from: process.env.EMAIL_FROM || 'cs@wedealize.com',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY || '' },

  adminKey: process.env.ADMIN_KEY || 'wedealize-admin-2024',
});
