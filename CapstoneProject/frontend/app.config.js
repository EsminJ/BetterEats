import dotenv from 'dotenv';
import path from 'path';

// Load root .env (../../.env)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default ({ config }) => ({
  ...config,
  extra: {
    API_URL: process.env.API_URL,
  },
});


