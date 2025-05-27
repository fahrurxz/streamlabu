const bcrypt = require('bcryptjs');
const sequelize = require('../backend/config/database');
const User = require('../backend/models/User');
const Stream = require('../backend/models/Stream');

async function initDevDatabase() {
  try {
    console.log('Initializing development database...');
    
    // Sync database models
    await sequelize.sync({ force: true });
    console.log('Database synced');
    
    // Create default development user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('devpassword', salt);
    
    const devUser = await User.create({
      id: 1,
      username: 'devuser',
      email: 'dev@example.com',
      password: hashedPassword
    });
    
    console.log('Development user created:', devUser.username);
    
    // Create sample stream
    const sampleStream = await Stream.create({
      user_id: devUser.id,
      platform: 'youtube',
      stream_key: 'sample-stream-key',
      stream_url: 'rtmp://a.rtmp.youtube.com/live2',
      source_type: 'upload_video',
      source_url: '',
      status: 'inactive'
    });
    
    console.log('Sample stream created:', sampleStream.id);
    console.log('Development database initialized successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing development database:', error);
    process.exit(1);
  }
}

// Run the function
initDevDatabase(); 