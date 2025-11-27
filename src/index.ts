import { createApp } from './app.js';
import { getPort } from './utils/config.js';

const app = createApp();
const port = getPort();

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Login API Tester running on http://0.0.0.0:${port}`);
  console.log(`📖 API Documentation: http://0.0.0.0:${port}/api/docs`);
  console.log(`🏥 Health Check: http://0.0.0.0:${port}/health`);
  console.log(`⚙️  Status: http://0.0.0.0:${port}/api/status`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/login/test - Test single login');
  console.log('  POST /api/login/batch - Test multiple logins');
  console.log('  GET /api/status - Get service status');
  console.log('  GET /api/docs - API documentation');
});