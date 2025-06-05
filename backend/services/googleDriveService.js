const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

class GoogleDriveService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/videos');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Extract file ID from Google Drive URL
  extractFileId(url) {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  // Get file info from Google Drive
  async getFileInfo(fileId) {
    try {
      const response = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
        timeout: 10000
      });
      
      // Try to extract filename from the page title or meta tags
      const html = response.data;
      let filename = 'video.mp4'; // default filename
      
      // Try to extract filename from title tag
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        let title = titleMatch[1].trim();
        // Remove " - Google Drive" suffix
        title = title.replace(/ - Google Drive$/i, '');
        if (title && title !== 'Google Drive') {
          filename = this.sanitizeFilename(title);
          // Add .mp4 extension if no extension present
          if (!path.extname(filename)) {
            filename += '.mp4';
          }
        }
      }
      
      return { filename };
    } catch (error) {
      console.error('Error getting file info:', error);
      return { filename: `gdrive_${fileId}.mp4` };
    }
  }

  // Sanitize filename to remove invalid characters
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }
  // Download file from Google Drive
  async downloadFile(fileId, destinationPath, onProgress = null) {
    try {
      console.log(`Starting download from Google Drive: ${fileId}`);
      
      // Try multiple download approaches for better reliability
      const downloadAttempts = [
        // Method 1: Direct download with confirmation
        async () => {
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
          console.log('Trying direct download with confirmation...');
          
          const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000,
            maxRedirects: 10,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          return response;
        },
          // Method 2: Standard download URL
        async () => {
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          console.log('Trying standard download URL...');
          
          const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000,
            maxRedirects: 10,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          return response;
        },

        // Method 3: Alternative export format
        async () => {
          const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
          console.log('Trying docs.google.com download URL...');
          
          const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000,
            maxRedirects: 10,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          return response;
        }
      ];

      let response = null;
      let methodUsed = '';

      // Try each download method
      for (let i = 0; i < downloadAttempts.length; i++) {
        try {
          console.log(`Attempting download method ${i + 1}...`);
          response = await downloadAttempts[i]();
          methodUsed = `Method ${i + 1}`;
          
          // Check if we got a valid response
          const contentType = response.headers['content-type'] || '';
          
          // If we get HTML content, it might be a virus scan page
          if (contentType.includes('text/html')) {
            console.log(`${methodUsed} returned HTML content, checking for virus scan page...`);
            
            // Check if this is a virus scan warning page
            const responseUrl = response.request.res.responseUrl || response.config.url;
            if (responseUrl && (responseUrl.includes('virus') || responseUrl.includes('confirm'))) {
              console.log('Detected virus scan page, will handle separately...');
              // Don't process this response, let it fall through to virus scan handling
              response = null;
              break;
            } else {
              // Might be an error page or access denied
              console.log(`${methodUsed} returned unexpected HTML content`);
              response = null;
              continue;
            }
          } else {
            // We got a valid file response
            console.log(`${methodUsed} successful, content-type: ${contentType}`);
            break;
          }
        } catch (error) {
          console.log(`${methodUsed} failed: ${error.message}`);
          response = null;
          continue;
        }
      }

      // If all direct methods failed, try handling as virus scan page
      if (!response) {
        console.log('All direct download methods failed, trying virus scan page handling...');
        return await this.handleVirusScanPage(fileId, destinationPath, onProgress);
      }

      // Check for redirect to virus scan page
      const responseUrl = response.request.res.responseUrl;
      if (responseUrl && (responseUrl.includes('confirm=') || responseUrl.includes('virus'))) {
        console.log('Redirected to virus scan page, handling...');
        return await this.handleVirusScanPage(fileId, destinationPath, onProgress);
      }

      // Verify we have a valid file response
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        console.log('Response is HTML, attempting virus scan page handling...');
        return await this.handleVirusScanPage(fileId, destinationPath, onProgress);
      }

      console.log(`Successfully got file response using ${methodUsed}`);

      // Track download progress
      const totalLength = parseInt(response.headers['content-length'], 10);
      let downloadedLength = 0;

      console.log(`File size: ${totalLength ? `${Math.round(totalLength / (1024 * 1024))}MB` : 'unknown'}`);

      if (onProgress && totalLength) {
        response.data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const progress = Math.round((downloadedLength / totalLength) * 100);
          onProgress(progress);
        });
      }

      // Create write stream and download
      const writer = fs.createWriteStream(destinationPath);
      await pipelineAsync(response.data, writer);

      console.log(`Download completed: ${destinationPath}`);
      return destinationPath;

    } catch (error) {
      console.error('Download error:', error);
      
      // Clean up partial file if it exists
      if (fs.existsSync(destinationPath)) {
        try {
          fs.unlinkSync(destinationPath);
        } catch (cleanupError) {
          console.error('Error cleaning up partial file:', cleanupError);
        }
      }
      
      throw new Error(`Failed to download file from Google Drive: ${error.message}`);
    }
  }  // Handle virus scan warning page for large files with completely enhanced approach
  async handleVirusScanPage(fileId, destinationPath, onProgress = () => {}) {
    try {
      console.log(`Handling virus scan page for large file: ${fileId}`);
      
      // Install tough-cookie dependency if not available for session management
      let CookieJar = null;
      try {
        const tough = require('tough-cookie');
        CookieJar = tough.CookieJar;
      } catch (error) {
        console.log('tough-cookie not available, installing...');
        try {
          // Try to use npm to install tough-cookie
          const { execSync } = require('child_process');
          execSync('npm install tough-cookie', { cwd: path.join(__dirname, '../..') });
          const tough = require('tough-cookie');
          CookieJar = tough.CookieJar;
          console.log('tough-cookie installed successfully');
        } catch (installError) {
          console.log('Could not install tough-cookie, proceeding without cookie jar');
        }
      }

      // Create a cookie jar for session management
      const jar = CookieJar ? new CookieJar() : null;
      
      // Enhanced approaches for large file download with session management
      const approaches = [
        // Approach 1: Session-based virus scan page handling with form submission
        async () => {
          console.log('Approach 1: Session-based virus scan page handling...');
          
          const axiosInstance = axios.create({
            timeout: 180000, // 3 minutes for very large files
            withCredentials: true,
            jar: jar,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Upgrade-Insecure-Requests': '1'
            }
          });

          // Step 1: Get the initial virus scan page
          const virusScanUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          console.log(`Requesting virus scan page: ${virusScanUrl}`);
          
          const initialResponse = await axiosInstance.get(virusScanUrl);
          console.log('Initial response status:', initialResponse.status);
          
          const html = initialResponse.data;
          console.log('HTML preview (first 1000 chars):', html.substring(0, 1000));

          // Step 2: Look for form submission approach first
          const formMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*method="post"[^>]*>([\s\S]*?)<\/form>/i);
          if (formMatch) {
            const formAction = formMatch[1];
            const formContent = formMatch[2];
            
            console.log(`Found form with action: ${formAction}`);
            
            // Extract all input values
            const inputs = {};
            const inputMatches = formContent.matchAll(/<input[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*>/gi);
            
            for (const inputMatch of inputMatches) {
              inputs[inputMatch[1]] = inputMatch[2];
              console.log(`Found input: ${inputMatch[1]} = ${inputMatch[2]}`);
            }

            // Submit the form if we have inputs
            if (Object.keys(inputs).length > 0) {
              const formData = new URLSearchParams(inputs);
              
              try {
                const submitResponse = await axiosInstance.post(
                  formAction.startsWith('http') ? formAction : `https://drive.google.com${formAction}`, 
                  formData, 
                  {
                    timeout: 120000,
                    maxRedirects: 0,
                    validateStatus: () => true,
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Referer': virusScanUrl,
                      'Origin': 'https://drive.google.com'
                    }
                  }
                );

                // Check for redirect location (successful download URL)
                if (submitResponse.headers.location) {
                  console.log(`Form submission redirected to: ${submitResponse.headers.location}`);
                  return submitResponse.headers.location;
                }
                
                // Check response for download links
                if (submitResponse.data && typeof submitResponse.data === 'string') {
                  const downloadLinkMatch = submitResponse.data.match(/href="([^"]*uc\?export=download[^"]*)"/i);
                  if (downloadLinkMatch) {
                    let downloadUrl = downloadLinkMatch[1].replace(/&amp;/g, '&');
                    if (!downloadUrl.startsWith('http')) {
                      downloadUrl = 'https://drive.google.com' + downloadUrl;
                    }
                    console.log(`Found download URL from form response: ${downloadUrl}`);
                    return downloadUrl;
                  }
                }
              } catch (error) {
                if (error.response && error.response.headers.location) {
                  console.log(`Form submission redirected to: ${error.response.headers.location}`);
                  return error.response.headers.location;
                }
                console.log(`Form submission failed: ${error.message}`);
              }
            }
          }

          // Step 3: Extract all possible tokens and construct URLs
          const extractTokens = (htmlContent) => {
            const tokens = {};
            
            // Enhanced confirm token extraction
            const confirmPatterns = [
              /name="confirm"[^>]*value="([^"]+)"/i,
              /confirm=([^"&\s]+)/i,
              /"confirm":\s*"([^"]+)"/i,
              /confirm=([a-zA-Z0-9_-]+)/i,
              /name=['"]confirm['"][^>]*value=['"]([^'"]+)['"]/i,
              /'confirm'\s*:\s*'([^']+)'/i,
              /confirm_token['"]\s*:\s*['"]([^'"]+)['"]/i
            ];
            
            for (const pattern of confirmPatterns) {
              const match = htmlContent.match(pattern);
              if (match) {
                tokens.confirm = match[1];
                console.log(`Found confirm token: ${tokens.confirm}`);
                break;
              }
            }

            // Extract other tokens
            const otherTokenPatterns = [
              { name: 'uuid', patterns: [/name="uuid"[^>]*value="([^"]+)"/i, /uuid=([^"&\s]+)/i] },
              { name: 'at', patterns: [/name="at"[^>]*value="([^"]+)"/i, /at=([^"&\s]+)/i] },
              { name: 'authuser', patterns: [/authuser=([^"&\s]+)/i] },
              { name: 'resourcekey', patterns: [/resourcekey=([^"&\s]+)/i] }
            ];
            
            for (const tokenInfo of otherTokenPatterns) {
              for (const pattern of tokenInfo.patterns) {
                const match = htmlContent.match(pattern);
                if (match) {
                  tokens[tokenInfo.name] = match[1];
                  console.log(`Found ${tokenInfo.name} token: ${tokens[tokenInfo.name]}`);
                  break;
                }
              }
            }

            return tokens;
          };

          const tokens = extractTokens(html);

          // Step 4: Look for direct download links
          const directLinkPatterns = [
            /href="([^"]*uc\?export=download[^"]*confirm=[^"]+[^"]*)"/gi,
            /action="([^"]*uc\?[^"]*export=download[^"]*)"/gi,
            /window\.location\.href\s*=\s*['"]([^'"]*uc\?[^'"]*export=download[^'"]*)['"][^)]*\)/gi,
            /https:\/\/[^"'\s]*googleusercontent\.com\/download[^"'\s]*/gi,
            /"url":\s*"([^"]*uc\?[^"]*export=download[^"]*)"/gi
          ];

          for (const pattern of directLinkPatterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
              let url = match[1];
              if (url && url.includes('export=download')) {
                // Ensure the URL is properly formatted
                if (!url.startsWith('http')) {
                  url = 'https://drive.google.com' + url;
                }
                
                url = url.replace(/&amp;/g, '&');
                console.log(`Found potential direct download URL: ${url}`);
                
                // Test the URL
                try {
                  const testResponse = await axiosInstance.head(url, { timeout: 30000 });
                  const contentType = testResponse.headers['content-type'] || '';
                  const contentLength = testResponse.headers['content-length'];
                  
                  if (!contentType.includes('text/html') && contentLength) {
                    console.log(`Direct download URL validated: ${url}`);
                    return url;
                  }
                } catch (error) {
                  console.log(`Direct URL validation failed: ${error.message}`);
                }
              }
            }
          }

          // Step 5: Construct download URLs with extracted tokens
          if (tokens.confirm) {
            const downloadUrls = [
              `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${tokens.confirm}`,
              `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${tokens.confirm}&uuid=${tokens.uuid || Date.now()}`,
              `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${tokens.confirm}&at=${tokens.at || ''}`.replace('&at=', tokens.at ? '&at=' + tokens.at : ''),
              `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${tokens.confirm}`,
              `https://drive.google.com/u/0/uc?export=download&id=${fileId}&confirm=${tokens.confirm}`
            ];

            for (const url of downloadUrls) {
              try {
                console.log(`Testing constructed URL: ${url}`);
                const testResponse = await axiosInstance.head(url, { timeout: 45000 });
                const contentType = testResponse.headers['content-type'] || '';
                const contentLength = testResponse.headers['content-length'];
                
                if (!contentType.includes('text/html') && contentLength) {
                  console.log(`Constructed URL validated: ${url}`);
                  return url;
                }
              } catch (error) {
                console.log(`Constructed URL failed: ${error.message}`);
              }
            }
          }

          return null;
        },

        // Approach 2: Multi-step navigation with delays
        async () => {
          console.log('Approach 2: Multi-step navigation approach...');
          
          // Step 1: Visit file page first to establish session
          await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
            timeout: 60000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          // Step 2: Wait and then request download
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const virusScanUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          const response = await axios.get(virusScanUrl, {
            timeout: 120000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': `https://drive.google.com/file/d/${fileId}/view`
            }
          });

          const html = response.data;
          
          // Look for various download patterns with enhanced extraction
          const enhancedPatterns = [
            // Standard patterns
            /href="([^"]*uc\?export=download[^"]*confirm=([^"&]+)[^"]*)"/g,
            // JavaScript-based patterns
            /window\.open\(['"]([^'"]*uc\?[^'"]*export=download[^'"]*)['"][^)]*\)/g,
            /location\.href\s*=\s*['"]([^'"]*uc\?[^'"]*export=download[^'"]*)['"][^)]*\)/g,
            // Form action patterns
            /<form[^>]*action="([^"]*uc\?[^"]*export=download[^"]*)"[^>]*>/g,
            // Data attribute patterns
            /data-download-url="([^"]*uc\?[^"]*export=download[^"]*)"/g
          ];

          for (const pattern of enhancedPatterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
              let url = match[1];
              if (url && url.includes('export=download')) {
                url = url.replace(/&amp;/g, '&');
                if (!url.startsWith('http')) {
                  url = 'https://drive.google.com' + url;
                }
                
                console.log(`Enhanced pattern found URL: ${url}`);
                
                // Validate with longer timeout
                try {
                  const testResponse = await axios.head(url, { 
                    timeout: 60000,
                    maxRedirects: 5,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                  });
                  
                  const contentType = testResponse.headers['content-type'] || '';
                  const contentLength = testResponse.headers['content-length'];
                  
                  if (!contentType.includes('text/html') && contentLength) {
                    console.log(`Enhanced pattern URL validated: ${url}`);
                    return url;
                  }
                } catch (error) {
                  console.log(`Enhanced pattern URL validation failed: ${error.message}`);
                }
              }
            }
          }

          return null;
        },

        // Approach 3: Enhanced alternative URL patterns with sophisticated token generation
        async () => {
          console.log('Approach 3: Enhanced alternative patterns with retry delays...');
          
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(7);
          
          const sophisticatedUrls = [
            // Time-based URLs
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&uuid=${timestamp}`,
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${timestamp}&t=1`,
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=download_${timestamp}`,
            
            // Advanced parameter combinations
            `https://drive.google.com/uc?export=download&id=${fileId}&authuser=0&confirm=t&gd_rd=1`,
            `https://drive.google.com/u/0/uc?id=${fileId}&export=download&confirm=t&usp=drive_web`,
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=no_antivirus&authuser=0`,
            
            // Alternative domains and paths
            `https://docs.google.com/uc?export=download&id=${fileId}&confirm=t&gd_rd=1`,
            `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
            
            // Random suffixes to bypass caching
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&r=${randomSuffix}`,
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=bypass&nocache=${timestamp}`,
            
            // Mobile and alternative user agents
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&mobile=1`,
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&lite=1`
          ];

          for (let i = 0; i < sophisticatedUrls.length; i++) {
            const url = sophisticatedUrls[i];
            console.log(`Testing sophisticated URL ${i + 1}/${sophisticatedUrls.length}: ${url}`);
            
            try {
              // Add progressive delay between requests
              if (i > 0) {
                const delay = Math.min(2000 + (i * 500), 5000); // 2s to 5s
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              const testResponse = await axios({
                method: 'HEAD',
                url: url,
                timeout: 90000,
                maxRedirects: 5,
                validateStatus: (status) => status < 400,
                headers: {
                  'User-Agent': i % 2 === 0 ? 
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' :
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });
              
              const contentType = testResponse.headers['content-type'] || '';
              const contentLength = testResponse.headers['content-length'];
              const contentDisposition = testResponse.headers['content-disposition'] || '';
              
              console.log(`Sophisticated URL ${i + 1} response - Content-Type: ${contentType}, Content-Length: ${contentLength}, Content-Disposition: ${contentDisposition}`);
              
              if (!contentType.includes('text/html') && 
                  (contentLength && parseInt(contentLength) > 1000 || 
                   contentDisposition.includes('attachment'))) {
                console.log(`Success with sophisticated URL: ${url}`);
                return url;
              }
            } catch (error) {
              console.log(`Sophisticated URL ${i + 1} failed: ${error.message}`);
              continue;
            }
          }
          
          throw new Error('No valid sophisticated URL found');
        }
      ];

      let downloadUrl = null;
      let approachUsed = '';

      // Try each approach with delays between attempts
      for (let i = 0; i < approaches.length; i++) {
        try {
          console.log(`Trying approach ${i + 1}...`);
          
          // Add delay between approaches to avoid rate limiting
          if (i > 0) {
            console.log('Waiting 5 seconds before next approach...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          downloadUrl = await approaches[i]();
          approachUsed = `Approach ${i + 1}`;
          if (downloadUrl) {
            console.log(`${approachUsed} successful: ${downloadUrl}`);
            break;
          }
        } catch (error) {
          console.log(`Approach ${i + 1} failed: ${error.message}`);
          continue;
        }
      }

      if (!downloadUrl) {
        // Last resort: try the enhanced final fallback
        console.log('All approaches failed, trying enhanced final fallback...');
        downloadUrl = await this.tryEnhancedFinalFallback(fileId);
      }

      if (!downloadUrl) {
        throw new Error('Could not find any working download method for this large file. This may be due to: 1) File permissions (ensure "Anyone with the link" access), 2) Google Drive rate limiting, 3) File corruption, or 4) Google Drive policy changes. For files over 200MB, consider using Google Drive API or manual download.');
      }

      console.log(`Final download URL found: ${downloadUrl.substring(0, 100)}...`);
      return await this.performLargeFileDownload(downloadUrl, destinationPath, onProgress);

    } catch (error) {
      console.error('Error handling virus scan page:', error);
      throw new Error(`Failed to download large file from Google Drive: ${error.message}`);
    }
  }
  // Final fallback method for large files    // Enhanced final fallback method for large files with session management
  async tryEnhancedFinalFallback(fileId) {
    try {
      console.log('Trying enhanced final fallback approach...');
      
      // Install tough-cookie if not available
      let jar = null;
      try {
        const tough = require('tough-cookie');
        jar = new tough.CookieJar();
      } catch (error) {
        console.log('tough-cookie not available, proceeding without cookie jar');
      }
      
      // Create axios instance with enhanced headers and session management
      const axiosInstance = axios.create({
        timeout: 120000,
        maxRedirects: 10,
        withCredentials: true,
        jar: jar,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // Try multiple fallback strategies
      const strategies = [
        // Strategy 1: Use the file view page to extract download metadata
        async () => {
          console.log('Strategy 1: Extracting from view page...');
          const viewResponse = await axiosInstance.get(`https://drive.google.com/file/d/${fileId}/view`);
          const html = viewResponse.data;
          
          // Look for embedded download metadata
          const metadataPatterns = [
            /"downloadUrl":"([^"]+)"/g,
            /"url":"([^"]*googleusercontent\.com[^"]+)"/g,
            /data-url="([^"]*uc\?[^"]*export=download[^"]*)"/g,
            /window\.__WIZ_[\w]*\s*=\s*[^;]*"([^"]*uc\?[^"]*export=download[^"]*)"[^;]*;/g
          ];
          
          for (const pattern of metadataPatterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
              let url = match[1];
              if (url && (url.includes('export=download') || url.includes('googleusercontent'))) {
                // Decode URL if needed
                url = url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
                console.log(`Found metadata URL: ${url}`);
                return url;
              }
            }
          }
          return null;
        },

        // Strategy 2: Try the sharing page approach
        async () => {
          console.log('Strategy 2: Sharing page approach...');
          const shareResponse = await axiosInstance.get(`https://drive.google.com/file/d/${fileId}/share`);
          const html = shareResponse.data;
          
          // Extract share tokens and construct download URLs
          const shareTokenMatch = html.match(/share_token['"]\s*:\s*['"]([^'"]+)['"]/i);
          if (shareTokenMatch) {
            const shareToken = shareTokenMatch[1];
            return `https://drive.google.com/uc?export=download&id=${fileId}&share_token=${shareToken}`;
          }
          return null;
        },

        // Strategy 3: Mobile interface approach
        async () => {
          console.log('Strategy 3: Mobile interface approach...');
          const mobileHeaders = {
            ...axiosInstance.defaults.headers,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          };
          
          const mobileResponse = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
            timeout: 60000,
            headers: mobileHeaders
          });
          
          const html = mobileResponse.data;
          
          // Mobile pages often have simpler download links
          const mobilePatterns = [
            /href="([^"]*uc\?export=download[^"]*)"/gi,
            /<a[^>]*download[^>]*href="([^"]+)"/gi
          ];
          
          for (const pattern of mobilePatterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
              let url = match[1];
              if (url && url.includes('export=download')) {
                if (!url.startsWith('http')) {
                  url = 'https://drive.google.com' + url;
                }
                console.log(`Found mobile download URL: ${url}`);
                return url;
              }
            }
          }
          return null;
        },

        // Strategy 4: Enhanced brute force with sophisticated tokens
        async () => {
          console.log('Strategy 4: Enhanced brute force approach...');
          const timestamp = Date.now();
          const sophisticatedTokens = [
            // Time-based tokens
            `t_${timestamp}`,
            `${timestamp}`,
            `confirm_${timestamp}`,
            // Common patterns
            'download_anyway',
            'proceed_with_download',
            'continue_download',
            'bypass_warning',
            'force_download',
            'no_virus_scan',
            // Encoded variations
            encodeURIComponent('confirm=t'),
            encodeURIComponent('bypass'),
            // Google-specific patterns
            'gd_confirm',
            'gdrive_confirm',
            'virus_scan_bypass'
          ];
          
          for (const token of sophisticatedTokens) {
            const urls = [
              `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${token}`,
              `https://drive.google.com/uc?id=${fileId}&export=download&confirm=${token}`,
              `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${token}`,
              `https://drive.google.com/u/0/uc?export=download&id=${fileId}&confirm=${token}`
            ];
            
            for (const url of urls) {
              try {
                console.log(`Testing sophisticated URL: ${url}`);
                const testResponse = await axios({
                  method: 'HEAD',
                  url: url,
                  timeout: 30000,
                  maxRedirects: 3,
                  validateStatus: (status) => status < 400,
                  headers: axiosInstance.defaults.headers
                });
                
                const contentType = testResponse.headers['content-type'] || '';
                const contentLength = testResponse.headers['content-length'];
                const contentDisposition = testResponse.headers['content-disposition'] || '';
                
                if (!contentType.includes('text/html') && 
                    (contentLength && parseInt(contentLength) > 1000 || 
                     contentDisposition.includes('attachment'))) {
                  console.log(`Sophisticated token success: ${token}`);
                  return url;
                }
              } catch (error) {
                // Continue to next token
                continue;
              }
            }
          }
          return null;
        }
      ];

      // Try each strategy with delays
      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`Trying enhanced fallback strategy ${i + 1}...`);
          
          // Add delay between strategies
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          const result = await strategies[i]();
          if (result) {
            console.log(`Enhanced fallback strategy ${i + 1} successful: ${result}`);
            return result;
          }
        } catch (error) {
          console.log(`Enhanced fallback strategy ${i + 1} failed: ${error.message}`);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Enhanced final fallback failed:', error);
      return null;
    }
  }

  // Keep the original fallback as backup
  async tryFinalFallback(fileId) {
    try {
      console.log('Trying standard final fallback approach...');
      
      // Try using the file view page to extract direct download link
      const viewResponse = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = viewResponse.data;
      
      // Look for direct download links in the view page
      const directLinkPatterns = [
        /https:\/\/[^"'\s]*googleusercontent\.com[^"'\s]*/g,
        /https:\/\/[^"'\s]*drive\.google\.com\/uc[^"'\s]*/g
      ];
      
      for (const pattern of directLinkPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (match.includes(fileId)) {
              console.log(`Found potential direct link: ${match}`);
              return match;
            }
          }
        }
      }
      
      // Try constructing URL with different parameters
      const fallbackUrls = [
        `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&uuid=${Date.now()}`,
        `https://drive.google.com/uc?export=download&id=${fileId}&authuser=0&confirm=t`,
        `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t&resourcekey`
      ];
      
      for (const url of fallbackUrls) {
        try {
          const testResponse = await axios({
            method: 'HEAD',
            url: url,
            timeout: 10000,
            maxRedirects: 3,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          const contentType = testResponse.headers['content-type'] || '';
          if (!contentType.includes('text/html')) {
            console.log(`Fallback URL successful: ${url}`);
            return url;
          }
        } catch (error) {
          console.log(`Fallback URL failed: ${url} - ${error.message}`);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Final fallback failed:', error);
      return null;
    }
  }
  // Perform large file download with enhanced error handling and resumption support
  async performLargeFileDownload(downloadUrl, destinationPath, onProgress = () => {}) {
    try {
      console.log(`Starting large file download from: ${downloadUrl}`);
      
      // Validate URL before using it
      try {
        new URL(downloadUrl);
      } catch (urlError) {
        throw new Error(`Invalid download URL: ${downloadUrl}`);
      }

      // Check if partial file exists for resumption
      let resumePosition = 0;
      if (fs.existsSync(destinationPath)) {
        const stats = fs.statSync(destinationPath);
        resumePosition = stats.size;
        console.log(`Found partial file, attempting to resume from position: ${resumePosition}`);
      }

      // Enhanced headers for large file downloads
      const downloadHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      };

      // Add range header for resumption if needed
      if (resumePosition > 0) {
        downloadHeaders['Range'] = `bytes=${resumePosition}-`;
      }
      
      const downloadResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 600000, // 10 minutes timeout for very large files
        maxRedirects: 10,
        headers: downloadHeaders,
        // Disable compression for large files to avoid memory issues
        decompress: false,
        // Allow larger max content length
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Check if we got redirected again (sometimes happens with very large files)
      const finalUrl = downloadResponse.request.res.responseUrl || downloadResponse.config.url;
      console.log(`Final response URL: ${finalUrl.substring(0, 100)}...`);

      // Check content type to ensure we're getting the actual file
      const contentType = downloadResponse.headers['content-type'] || '';
      const contentLength = downloadResponse.headers['content-length'];
      const acceptRanges = downloadResponse.headers['accept-ranges'];
      const contentRange = downloadResponse.headers['content-range'];
      
      console.log(`Response headers - Content-Type: ${contentType}, Content-Length: ${contentLength}, Accept-Ranges: ${acceptRanges}, Content-Range: ${contentRange}`);
      
      if (contentType.includes('text/html')) {
        throw new Error('Download URL still returns HTML page. File may require manual download or different access method.');
      }

      // Handle resume response
      if (resumePosition > 0 && downloadResponse.status === 206) {
        console.log(`Successfully resuming download from position ${resumePosition}`);
      } else if (resumePosition > 0 && downloadResponse.status === 200) {
        console.log(`Server doesn't support resume, restarting download from beginning`);
        resumePosition = 0;
        // Remove partial file
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
      }

      // Calculate total file size
      let totalLength = null;
      if (contentRange) {
        // Parse content-range header: "bytes start-end/total"
        const rangeMatch = contentRange.match(/bytes \d+-\d+\/(\d+)/);
        if (rangeMatch) {
          totalLength = parseInt(rangeMatch[1], 10);
        }
      } else if (contentLength) {
        totalLength = parseInt(contentLength, 10) + resumePosition;
      }

      let downloadedLength = resumePosition;
      const fileSizeFormatted = totalLength ? `${Math.round(totalLength / (1024 * 1024))}MB` : 'unknown size';
      
      console.log(`Downloading ${fileSizeFormatted} file... ${resumePosition > 0 ? `(resuming from ${Math.round(resumePosition / (1024 * 1024))}MB)` : ''}`);

      // Enhanced progress tracking
      if (onProgress && totalLength) {
        downloadResponse.data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const progress = Math.round((downloadedLength / totalLength) * 100);
          const downloadedMB = Math.round(downloadedLength / (1024 * 1024));
          const totalMB = Math.round(totalLength / (1024 * 1024));
          
          // Report progress every 10MB or at specific percentages
          if (downloadedLength % (10 * 1024 * 1024) < chunk.length || progress % 5 === 0) {
            console.log(`Download progress: ${progress}% (${downloadedMB}MB / ${totalMB}MB)`);
          }
          
          onProgress(progress);
        });
      }

      // Create write stream with append mode for resumption
      const writeOptions = {
        flags: resumePosition > 0 ? 'a' : 'w',
        highWaterMark: 64 * 1024 // 64KB buffer for better performance
      };
      
      const writer = fs.createWriteStream(destinationPath, writeOptions);
      
      // Enhanced error handling
      let downloadError = null;
      
      writer.on('error', (error) => {
        downloadError = error;
        console.error('Write stream error:', error);
      });
      
      downloadResponse.data.on('error', (error) => {
        downloadError = error;
        console.error('Download stream error:', error);
      });

      // Add timeout handling for stalled downloads
      let lastDataTime = Date.now();
      const stallTimeout = 120000; // 2 minutes without data is considered stalled
      
      downloadResponse.data.on('data', () => {
        lastDataTime = Date.now();
      });

      const stallCheckInterval = setInterval(() => {
        if (Date.now() - lastDataTime > stallTimeout) {
          downloadError = new Error('Download stalled - no data received for 2 minutes');
          downloadResponse.data.destroy();
          clearInterval(stallCheckInterval);
        }
      }, 30000); // Check every 30 seconds

      try {
        await pipelineAsync(downloadResponse.data, writer);
        clearInterval(stallCheckInterval);
        
        if (downloadError) {
          throw downloadError;
        }

        // Verify downloaded file size
        const finalStats = fs.statSync(destinationPath);
        console.log(`Download completed. Final file size: ${Math.round(finalStats.size / (1024 * 1024))}MB`);
        
        if (totalLength && finalStats.size !== totalLength) {
          console.warn(`File size mismatch. Expected: ${totalLength}, Got: ${finalStats.size}`);
          // Don't throw error as some servers may report incorrect content-length
        }

        console.log(`Large file download completed successfully: ${destinationPath}`);
        return destinationPath;

      } catch (pipelineError) {
        clearInterval(stallCheckInterval);
        throw pipelineError;
      }

    } catch (error) {
      console.error('Error performing large file download:', error);
      
      // Don't clean up partial file if it's a resumable error
      const resumableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'Download stalled'];
      const isResumableError = resumableErrors.some(errType => error.message.includes(errType));
      
      if (!isResumableError && fs.existsSync(destinationPath)) {
        try {
          const stats = fs.statSync(destinationPath);
          if (stats.size === 0) {
            // Only delete if file is empty
            fs.unlinkSync(destinationPath);
            console.log('Removed empty partial file');
          } else {
            console.log(`Keeping partial file (${Math.round(stats.size / (1024 * 1024))}MB) for potential resume`);
          }
        } catch (cleanupError) {
          console.error('Error handling partial file:', cleanupError);
        }
      }
      
      throw error;
    }
  }
  // Download and process Google Drive video
  async downloadAndProcessVideo(googleDriveLink, userId, filename = null) {
    const fileId = this.extractFileId(googleDriveLink);
    if (!fileId) {
      throw new Error('Invalid Google Drive link');
    }

    // Check file accessibility first
    console.log('Checking file accessibility before download...');
    const accessCheck = await this.checkFileAccessibility(fileId);
    if (!accessCheck.accessible) {
      throw new Error(accessCheck.error);
    }

    console.log('File accessibility check passed:', accessCheck.message);
    if (accessCheck.fileSize) {
      console.log('Detected file size:', accessCheck.fileSize);
    }

    // Get file info if filename not provided
    if (!filename) {
      const fileInfo = await this.getFileInfo(fileId);
      filename = fileInfo.filename;
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFilename = `user-${userId}-${timestamp}-${filename}`;
    const destinationPath = path.join(this.uploadsDir, uniqueFilename);

    console.log(`Downloading Google Drive file to: ${destinationPath}`);

    // Download the file with retry mechanism
    let downloadAttempt = 1;
    const maxRetries = 3;
    let lastError = null;

    while (downloadAttempt <= maxRetries) {
      try {
        console.log(`Download attempt ${downloadAttempt}/${maxRetries}`);
        await this.downloadFile(fileId, destinationPath);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.error(`Download attempt ${downloadAttempt} failed:`, error.message);
        
        // Clean up partial file
        if (fs.existsSync(destinationPath)) {
          try {
            fs.unlinkSync(destinationPath);
          } catch (cleanupError) {
            console.error('Error cleaning up partial file:', cleanupError);
          }
        }

        if (downloadAttempt === maxRetries) {
          throw new Error(`Failed to download after ${maxRetries} attempts: ${lastError.message}`);
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, downloadAttempt - 1) * 2000; // 2s, 4s, 8s
        console.log(`Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        downloadAttempt++;
      }
    }

    // Verify file was downloaded and has content
    const stats = fs.statSync(destinationPath);
    if (stats.size === 0) {
      fs.unlinkSync(destinationPath);
      throw new Error('Downloaded file is empty');
    }

    console.log(`Downloaded file size: ${stats.size} bytes`);

    return {
      localPath: destinationPath,
      filename: uniqueFilename,
      fileSize: stats.size
    };
  }

  // Validate Google Drive URL
  isValidGoogleDriveUrl(url) {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  // Check if Google Drive file is accessible
  async checkFileAccessibility(fileId) {
    try {
      console.log(`Checking accessibility for file ID: ${fileId}`);
      
      // Try to access the file info page
      const response = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      
      // Check for common error indicators
      if (html.includes('Sorry, the file you have requested does not exist') ||
          html.includes('Access denied') ||
          html.includes('File not found') ||
          html.includes('Permission denied')) {
        return {
          accessible: false,
          error: 'File not found or access denied. Please check the sharing permissions.'
        };
      }

      // Check if file requires permission request
      if (html.includes('Request access') || html.includes('requestAccess')) {
        return {
          accessible: false,
          error: 'File requires access permission. Please ensure it is shared with "Anyone with the link".'
        };
      }

      // Try to extract file size to verify it's a real file
      const sizeMatch = html.match(/(\d+(?:\.\d+)?)\s*(bytes?|KB|MB|GB)/i);
      let fileSize = null;
      if (sizeMatch) {
        fileSize = sizeMatch[0];
      }

      return {
        accessible: true,
        fileSize: fileSize,
        message: 'File appears to be accessible'
      };

    } catch (error) {
      console.error('Error checking file accessibility:', error);
      return {
        accessible: false,
        error: `Unable to check file accessibility: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
const googleDriveService = new GoogleDriveService();
module.exports = googleDriveService;
