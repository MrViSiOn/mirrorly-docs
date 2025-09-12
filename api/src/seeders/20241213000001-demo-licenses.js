'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

    await queryInterface.bulkInsert('licenses', [
      {
        license_key: 'FREE-DEMO-1234-5678-9ABC-DEF0',
        domain: 'demo-free.example.com',
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 3,
        last_reset: now,
        expires_at: null,
        created_at: now,
        updated_at: now
      },
      {
        license_key: 'PRO-BASIC-ABCD-EFGH-IJKL-MNOP',
        domain: 'demo-pro-basic.example.com',
        type: 'pro_basic',
        status: 'active',
        monthly_limit: 100,
        current_usage: 25,
        last_reset: now,
        expires_at: futureDate,
        created_at: now,
        updated_at: now
      },
      {
        license_key: 'PRO-PREMIUM-QRST-UVWX-YZ12-3456',
        domain: 'demo-pro-premium.example.com',
        type: 'pro_premium',
        status: 'active',
        monthly_limit: 500,
        current_usage: 150,
        last_reset: now,
        expires_at: futureDate,
        created_at: now,
        updated_at: now
      },
      {
        license_key: 'EXPIRED-TEST-7890-ABCD-EFGH-IJKL',
        domain: 'demo-expired.example.com',
        type: 'pro_basic',
        status: 'expired',
        monthly_limit: 100,
        current_usage: 0,
        last_reset: now,
        expires_at: new Date('2023-12-01'), // Past date
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('licenses', null, {});
  }
};