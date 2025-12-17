import dotenv from 'dotenv';
import path from 'path';

// Load root .env (../../.env)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    API_URL: process.env.API_URL,
    eas: {
      projectId: "1c534054-24c7-4654-804c-cab182f2c883"
    }
  },
});


