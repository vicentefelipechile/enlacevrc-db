const { randomBytes } = require('crypto');

// Generate 32 random bytes and convert to a hex string (64 characters)
const key = randomBytes(32).toString('hex');

console.log('Your new private key is:');
console.log(key);
console.log('\nRun the following command to add it to your Cloudflare Worker secrets:');
console.log(`npx wrangler secret put PRIVATE_KEY`);
console.log('Then paste the key when prompted.');
