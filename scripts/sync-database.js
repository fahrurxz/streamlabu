const sequelize = require('../backend/config/database');
const Stream = require('../backend/models/Stream');
const User = require('../backend/models/User');

async function syncDatabase() {
  try {
    console.log('🔄 Synchronizing database models...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models (this will create missing columns)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
    
    // Verify the streams table structure
    const [results] = await sequelize.query("DESCRIBE streams");
    console.log('📋 Streams table structure:');
    results.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error synchronizing database:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  syncDatabase();
}

module.exports = syncDatabase;
