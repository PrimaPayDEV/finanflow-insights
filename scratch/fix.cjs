const fs = require('fs');

['owners', 'properties', 'tenants', 'contracts'].forEach(f => {
  const p = 'src/routes/real-estate/' + f + '.tsx';
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(p, content);
});
console.log('Fixed');
