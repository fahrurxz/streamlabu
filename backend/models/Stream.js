const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Stream = sequelize.define('stream', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['youtube', 'tiktok', 'shopee']]
    }
  },
  stream_key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stream_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  source_type: {
    type: DataTypes.ENUM('live_capture', 'upload_video'),
    defaultValue: 'upload_video'
  },  source_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  video_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'videos', // Will be resolved when Video model is available
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'inactive'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },  loop_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true  // Make it nullable temporarily for backward compatibility
  }
}, {
  timestamps: false
});

// Define relationship
Stream.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Stream, { foreignKey: 'user_id', as: 'streams' });

module.exports = Stream; 