#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing Blue Carbon MRV Server...\n');

// Test health endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Health Check:', parsed.status);
          console.log('📊 Uptime:', Math.round(parsed.uptime), 'seconds');
          console.log('💾 Memory:', parsed.memory.used, '/', parsed.memory.total);
          console.log('🔧 Services:', Object.entries(parsed.services)
            .map(([name, status]) => `${name}:${status ? '✅' : '❌'}`)
            .join(' '));
          resolve(true);
        } catch (error) {
          reject(new Error(`Failed to parse health response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Health check failed: ${error.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
};

// Test 404 endpoint
const test404 = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/nonexistent', (res) => {
      if (res.statusCode === 404) {
        console.log('✅ 404 handling works correctly');
        resolve(true);
      } else {
        reject(new Error(`Expected 404, got ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`404 test failed: ${error.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('404 test timeout'));
    });
  });
};

// Run tests
async function runTests() {
  try {
    await testHealth();
    await test404();
    console.log('\n🎉 All tests passed! Server is running correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running with: npm run dev');
    process.exit(1);
  }
}

// Add delay to ensure server is ready
setTimeout(runTests, 1000);