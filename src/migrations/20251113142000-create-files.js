'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      bucket: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING(512),
        allowNull: false,
        unique: true,
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('files', ['user_id']);
    await queryInterface.addIndex('files', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('files', ['status']);
    await queryInterface.removeIndex('files', ['user_id']);
    await queryInterface.dropTable('files');

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_files_status";');
    }
  },
};

