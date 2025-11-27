import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'crm_db',
  entities: ['src/entities/**/*.entity.{ts,js}'],
  migrations: ['src/migrations/**/*.{ts,js}'],
  synchronize: false,
  migrationsRun: false,
  logging: ['error', 'warn'],
});