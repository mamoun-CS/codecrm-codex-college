import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'crm_db',
  entities: [join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '**', '*{.ts,.js}')],
  synchronize: false,
  logging: ['error', 'warn'],
});
