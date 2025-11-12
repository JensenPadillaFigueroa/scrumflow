const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'ScrumFlow3008',
  description: 'ScrumFlow Project Management Application on Port 3008',
  script: path.join(__dirname, 'dist', 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [{
    name: "NODE_ENV",
    value: "production"
  }, {
    name: "PORT", 
    value: "3008"
  }]
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
  console.log('✅ Service installed successfully!');
  console.log('📍 Starting service...');
  svc.start();
});

svc.on('start', function(){
  console.log('🚀 ScrumFlow service started!');
  console.log('📍 URL: http://localhost:3008');
  console.log('🔧 Service Name: ScrumFlow3008');
  console.log('');
  console.log('To manage the service:');
  console.log('  net start ScrumFlow3008    - Start');
  console.log('  net stop ScrumFlow3008     - Stop');
  console.log('  node uninstall-service.cjs  - Uninstall');
});

svc.on('alreadyinstalled', function(){
  console.log('⚠️  Service already installed. Starting...');
  svc.start();
});

console.log('Installing ScrumFlow as Windows Service...');
svc.install();
