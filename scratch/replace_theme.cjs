const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/Partner/PartnerDashboard.tsx',
  'src/components/layout/PartnerLayout.tsx',
  'src/components/navigation/PartnerSidebar.tsx',
  'src/pages/Dashboard/Dashboard.tsx',
  'src/components/navigation/Sidebar.tsx',
  'src/components/layout/AppLayout.tsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace emerald with brand
    content = content.replace(/emerald-/g, 'brand-');
    
    // Add glass effects to cards
    content = content.replace(/bg-white\s+rounded-\[?24px\]?\s+shadow-sm\s+border/g, 'glass rounded-3xl shadow-sm border');
    content = content.replace(/bg-white\s+p-6\s+rounded-\[?24px\]?/g, 'glass p-6 rounded-3xl');
    
    // Replace flat grays with slate (more premium)
    content = content.replace(/gray-/g, 'slate-');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`Skipped ${file}, not found.`);
  }
});
