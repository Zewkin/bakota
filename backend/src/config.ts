import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_NAME || 'crm'
  },
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  publicBookingBaseUrl: process.env.PUBLIC_BOOKING_BASE_URL || 'https://bakota.com.ua/booking'
};
