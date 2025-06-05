const googleDriveService = require('./backend/services/googleDriveService');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test with a small public file first (< 25MB)
  SMALL_FILE_ID: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Example Google Sheets file (publicly accessible)
  
  // You can replace this with your own large file ID (>200MB) for testing
  LARGE_FILE_ID: null, // Replace with actual large file ID for testing
  
  // Test output directory
  OUTPUT_DIR: path.join(__dirname, 'test-downloads')
};

async function createTestDir() {
  if (!fs.existsSync(TEST_CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(TEST_CONFIG.OUTPUT_DIR, { recursive: true });
    console.log(`Created test directory: ${TEST_CONFIG.OUTPUT_DIR}`);
  }
}

async function testFileIdExtraction() {
  console.log('\n=== Testing File ID Extraction ===');
  
  const testUrls = [
    'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    'https://docs.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  ];
  
  for (const url of testUrls) {
    const fileId = googleDriveService.extractFileId(url);
    console.log(`URL: ${url}`);
    console.log(`Extracted ID: ${fileId}`);
    console.log(`Valid: ${fileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'}`);
    console.log('---');
  }
}

async function testFileAccessibility() {
  console.log('\n=== Testing File Accessibility ===');
  
  try {
    const accessCheck = await googleDriveService.checkFileAccessibility(TEST_CONFIG.SMALL_FILE_ID);
    console.log('Access check result:', accessCheck);
  } catch (error) {
    console.error('Access check failed:', error.message);
  }
}

async function testFileInfoExtraction() {
  console.log('\n=== Testing File Info Extraction ===');
  
  try {
    const fileInfo = await googleDriveService.getFileInfo(TEST_CONFIG.SMALL_FILE_ID);
    console.log('File info:', fileInfo);
  } catch (error) {
    console.error('File info extraction failed:', error.message);
  }
}

async function testSmallFileDownload() {
  console.log('\n=== Testing Small File Download ===');
  
  const downloadPath = path.join(TEST_CONFIG.OUTPUT_DIR, 'small-test-file.csv');
  
  try {
    console.log('Starting small file download...');
    
    let lastProgress = 0;
    const progressCallback = (progress) => {
      if (progress !== lastProgress) {
        console.log(`Progress: ${progress}%`);
        lastProgress = progress;
      }
    };
    
    const result = await googleDriveService.downloadFile(TEST_CONFIG.SMALL_FILE_ID, downloadPath, progressCallback);
    
    if (fs.existsSync(downloadPath)) {
      const stats = fs.statSync(downloadPath);
      console.log(`Download successful! File size: ${stats.size} bytes`);
      console.log(`File location: ${downloadPath}`);
    } else {
      console.error('Download failed - file not found');
    }
    
  } catch (error) {
    console.error('Small file download failed:', error.message);
  }
}

async function testLargeFileDownload() {
  if (!TEST_CONFIG.LARGE_FILE_ID) {
    console.log('\n=== Skipping Large File Download Test ===');
    console.log('No large file ID configured. To test large file downloads:');
    console.log('1. Upload a file >200MB to Google Drive');
    console.log('2. Set sharing to "Anyone with the link"');
    console.log('3. Replace LARGE_FILE_ID in this test script with your file ID');
    return;
  }
  
  console.log('\n=== Testing Large File Download ===');
  
  const downloadPath = path.join(TEST_CONFIG.OUTPUT_DIR, 'large-test-file.mp4');
  
  try {
    console.log('Starting large file download...');
    
    let lastProgress = 0;
    const progressCallback = (progress) => {
      if (progress !== lastProgress) {
        console.log(`Progress: ${progress}%`);
        lastProgress = progress;
      }
    };
    
    const result = await googleDriveService.downloadFile(TEST_CONFIG.LARGE_FILE_ID, downloadPath, progressCallback);
    
    if (fs.existsSync(downloadPath)) {
      const stats = fs.statSync(downloadPath);
      console.log(`Download successful! File size: ${Math.round(stats.size / (1024 * 1024))}MB`);
      console.log(`File location: ${downloadPath}`);
    } else {
      console.error('Download failed - file not found');
    }
    
  } catch (error) {
    console.error('Large file download failed:', error.message);
    console.log('This is expected for files that require virus scan handling');
  }
}

async function testVirusScanHandling() {
  if (!TEST_CONFIG.LARGE_FILE_ID) {
    console.log('\n=== Skipping Virus Scan Handling Test ===');
    console.log('No large file ID configured for virus scan testing');
    return;
  }
  
  console.log('\n=== Testing Virus Scan Page Handling ===');
  
  const downloadPath = path.join(TEST_CONFIG.OUTPUT_DIR, 'virus-scan-test-file.mp4');
  
  try {
    console.log('Testing virus scan page handling directly...');
    
    let lastProgress = 0;
    const progressCallback = (progress) => {
      if (progress !== lastProgress) {
        console.log(`Progress: ${progress}%`);
        lastProgress = progress;
      }
    };
    
    const result = await googleDriveService.handleVirusScanPage(TEST_CONFIG.LARGE_FILE_ID, downloadPath, progressCallback);
    
    if (fs.existsSync(downloadPath)) {
      const stats = fs.statSync(downloadPath);
      console.log(`Virus scan handling successful! File size: ${Math.round(stats.size / (1024 * 1024))}MB`);
      console.log(`File location: ${downloadPath}`);
    } else {
      console.error('Virus scan handling failed - file not found');
    }
    
  } catch (error) {
    console.error('Virus scan handling failed:', error.message);
  }
}

async function testEnhancedFallback() {
  console.log('\n=== Testing Enhanced Fallback Methods ===');
  
  try {
    console.log('Testing enhanced final fallback...');
    const fallbackUrl = await googleDriveService.tryEnhancedFinalFallback(TEST_CONFIG.SMALL_FILE_ID);
    
    if (fallbackUrl) {
      console.log(`Enhanced fallback successful: ${fallbackUrl.substring(0, 100)}...`);
    } else {
      console.log('Enhanced fallback returned no URL');
    }
    
  } catch (error) {
    console.error('Enhanced fallback failed:', error.message);
  }
}

async function cleanupTestFiles() {
  console.log('\n=== Cleaning Up Test Files ===');
  
  try {
    if (fs.existsSync(TEST_CONFIG.OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_CONFIG.OUTPUT_DIR);
      for (const file of files) {
        const filePath = path.join(TEST_CONFIG.OUTPUT_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
      }
      fs.rmdirSync(TEST_CONFIG.OUTPUT_DIR);
      console.log(`Removed test directory: ${TEST_CONFIG.OUTPUT_DIR}`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Google Drive Service Tests...\n');
  
  try {
    await createTestDir();
    
    // Basic functionality tests
    await testFileIdExtraction();
    await testFileAccessibility();
    await testFileInfoExtraction();
    
    // Download tests
    await testSmallFileDownload();
    await testLargeFileDownload();
    
    // Advanced handling tests
    await testVirusScanHandling();
    await testEnhancedFallback();
    
    console.log('\n✅ All tests completed!');
    
    // Ask user if they want to clean up
    console.log('\nTest files created in:', TEST_CONFIG.OUTPUT_DIR);
    console.log('Run with --cleanup flag to automatically remove test files');
    
    if (process.argv.includes('--cleanup')) {
      await cleanupTestFiles();
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Google Drive Service Test Suite

Usage: node test-google-drive.js [options]

Options:
  --help        Show this help message
  --cleanup     Automatically clean up test files after tests
  --large-file  Set large file ID for testing (format: --large-file=FILE_ID)

Examples:
  node test-google-drive.js
  node test-google-drive.js --cleanup
  node test-google-drive.js --large-file=1ABC123DEF456 --cleanup

To test large file handling:
1. Upload a video file >200MB to Google Drive
2. Set sharing permissions to "Anyone with the link can view"
3. Copy the file ID from the sharing URL
4. Run: node test-google-drive.js --large-file=YOUR_FILE_ID
  `);
  process.exit(0);
}

// Extract large file ID from command line if provided
const largeFileArg = process.argv.find(arg => arg.startsWith('--large-file='));
if (largeFileArg) {
  TEST_CONFIG.LARGE_FILE_ID = largeFileArg.split('=')[1];
  console.log(`Using large file ID: ${TEST_CONFIG.LARGE_FILE_ID}`);
}

// Run the tests
runAllTests().catch(console.error);
