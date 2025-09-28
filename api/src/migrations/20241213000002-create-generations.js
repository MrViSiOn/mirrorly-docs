'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('generations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      license_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'licenses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      user_image_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      product_image_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      result_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      processing_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      google_ai_request_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      used_prompt: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
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
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('generations', ['license_id'], {
      name: 'generations_license_id_index'
    });

    await queryInterface.addIndex('generations', ['status'], {
      name: 'generations_status_index'
    });

    await queryInterface.addIndex('generations', ['created_at'], {
      name: 'generations_created_at_index'
    });

    await queryInterface.addIndex('generations', ['product_id'], {
      name: 'generations_product_id_index'
    });

    await queryInterface.addIndex('generations', ['user_image_hash', 'product_image_hash'], {
      name: 'generations_image_hashes_index'
    });

    await queryInterface.addIndex('generations', ['google_ai_request_id'], {
      name: 'generations_google_ai_request_id_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('generations');
  }
};