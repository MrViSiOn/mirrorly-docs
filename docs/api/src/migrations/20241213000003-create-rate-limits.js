'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rate_limits', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      license_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'licenses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      last_request: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      request_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      window_start: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      window_duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60000
      },
      max_requests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
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
    await queryInterface.addIndex('rate_limits', ['license_id'], {
      unique: true,
      name: 'rate_limits_license_id_unique'
    });

    await queryInterface.addIndex('rate_limits', ['last_request'], {
      name: 'rate_limits_last_request_index'
    });

    await queryInterface.addIndex('rate_limits', ['window_start'], {
      name: 'rate_limits_window_start_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rate_limits');
  }
};