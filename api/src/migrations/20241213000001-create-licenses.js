'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('licenses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      license_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      domain: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('free', 'pro_basic', 'pro_premium'),
        allowNull: false,
        defaultValue: 'free'
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
      },
      monthly_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      current_usage: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_reset: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('licenses', ['license_key'], {
      unique: true,
      name: 'licenses_license_key_unique'
    });

    await queryInterface.addIndex('licenses', ['domain'], {
      name: 'licenses_domain_index'
    });

    await queryInterface.addIndex('licenses', ['type'], {
      name: 'licenses_type_index'
    });

    await queryInterface.addIndex('licenses', ['status'], {
      name: 'licenses_status_index'
    });

    await queryInterface.addIndex('licenses', ['expires_at'], {
      name: 'licenses_expires_at_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('licenses');
  }
};