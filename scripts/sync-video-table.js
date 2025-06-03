const sequelize = require('../backend/config/database');
const Video = require('../backend/models/Video');
const Stream = require('../backend/models/Stream');
const User = require('../backend/models/User');

async function syncVideoTable() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Syncing Video table...');
    
    // Create Video table if it doesn't exist
    await Video.sync({ alter: true });
    console.log('Video table synced successfully.');

    // Update Stream table to include video_id
    await Stream.sync({ alter: true });
    console.log('Stream table updated successfully.');

    console.log('Database sync completed successfully!');
  } catch (error) {
    console.error('Error syncing database:', error);
  } finally {
    await sequelize.close();
  }
}

syncVideoTable();
