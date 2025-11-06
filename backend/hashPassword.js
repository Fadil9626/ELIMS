const bcrypt = require('bcryptjs');

const newPassword = 'superadmin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(newPassword, salt);

console.log('--- COPY YOUR NEW PASSWORD HASH BELOW ---');
console.log(hash);
console.log('-----------------------------------------');