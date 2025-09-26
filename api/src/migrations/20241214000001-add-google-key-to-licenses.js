'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('licenses', 'google_key', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Encrypted Google API Key for AI services'
    });

    // Add index for google_key for better performance
    await queryInterface.addIndex('licenses', ['google_key'], {
      name: 'licenses_google_key_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('licenses', 'licenses_google_key_index');

    // Remove column
    await queryInterface.removeColumn('licenses', 'google_key');
  }
};