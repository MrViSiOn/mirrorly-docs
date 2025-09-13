import { Sequelize } from 'sequelize';

declare const sequelize: Sequelize;
export default sequelize;
export function closeConnection(): Promise<void>;