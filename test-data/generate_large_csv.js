const fs = require('fs');
const path = require('path');

const years = [2022, 2023, 2024, 2025, 2026];
const orgTypes = ['Tech', 'Data', 'Bio', 'Cyber', 'Eco', 'Robotics', 'FinTech', 'Health', 'Quantum', 'Aerospace'];
const suffixes = ['Corp', 'Solutions', 'Labs', 'Systems', 'Pioneers', 'Hub', 'Group', 'Networks', 'Holdings', 'Ventures'];

const lines = [
  'Project_id,Registration ID,Organisation Name,Address,ABN,Industy Partner Contact Name(s),Position Title,Email,Phone'
];

for (let i = 1; i <= 500; i++) {
  const year = years[i % years.length];
  const type = orgTypes[i % orgTypes.length];
  const suffix = suffixes[i % suffixes.length];
  const orgName = `${type}${suffix} ${year} Benchmark ${i}`;
  const regId = `REG-${year}-${1000 + i}`;
  const prjId = `PRJ-${year}-${String(i).padStart(4, '0')}`;
  const abn = String(10000000000 + i);
  const contact = `Contact Person ${i}`;
  const title = `Director of ${type} Innovation`;
  const email = `contact${i}@${type.toLowerCase()}${suffix.toLowerCase()}${year}.com`;
  const phone = `073${String(i).padStart(7, '0')}`;
  const address = `${i} Tech Parkway, Sector ${i % 20}, Brisbane QLD 4000`;

  lines.push(`"${prjId}","${regId}","${orgName}","${address}","${abn}","${contact}","${title}","${email}","${phone}"`);
}

const outputPath = path.join(__dirname, 'csv-samples', 'large_volume_500rows.csv');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Generated 500-row benchmark CSV at: ${outputPath}`);
