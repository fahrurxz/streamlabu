const { QueryInterface, DataTypes } = require('sequelize');
const sequelize = require('../backend/config/database');

async function addLoopField() {
  try {
    console.log('Adding loop_enabled field to streams table...');
    
    await sequelize.getQueryInterface().addColumn('streams', 'loop_enabled', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    console.log('✅ Successfully added loop_enabled field to streams table');
    
    // Update existing records to have loop_enabled = false
    await sequelize.query(`UPDATE streams SET loop_enabled = false WHERE loop_enabled IS NULL`);
    
    console.log('✅ Updated existing records with default loop_enabled value');
  } catch (error) {
    console.error('❌ Error adding loop_enabled field:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if called directly
if (require.main === module) {
  addLoopField();
}

module.exports = addLoopField;
