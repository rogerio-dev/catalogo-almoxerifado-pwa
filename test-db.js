#!/usr/bin/env node

const { testConnection, initializeTables, closeConnection } = require('./db');

async function testDatabase() {
    console.log('🧪 Testing new simplified database connection...\n');
    
    try {
        // Test connection
        console.log('1. Testing connection...');
        const connectionOk = await testConnection();
        
        if (connectionOk) {
            console.log('✅ Connection test passed!\n');
            
            // Test table initialization
            console.log('2. Testing table initialization...');
            await initializeTables();
            console.log('✅ Table initialization completed!\n');
            
            console.log('🎉 All tests passed! Database is ready for Railway deployment.');
        } else {
            console.log('❌ Connection test failed!');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await closeConnection();
        console.log('\n🔒 Database connection closed.');
        process.exit(0);
    }
}

testDatabase();
