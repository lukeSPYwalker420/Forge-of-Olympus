const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let modified = false;
  
  data.sessions.forEach(session => {
    session.exercises.forEach(ex => {
      // Add missing targets based on progression type
      if (ex.progressionType === 'strength' && !ex.rpeTarget) {
        ex.rpeTarget = 7;
        modified = true;
      }
      if (ex.progressionType === 'volume' && !ex.rirTarget) {
        ex.rirTarget = 2;
        modified = true;
      }
      if (ex.progressionType === 'power' && !ex.qualityTarget) {
        ex.qualityTarget = 7;
        modified = true;
      }
      if (ex.progressionType === 'mobility') {
        if (!ex.stabilityTarget) {
          ex.stabilityTarget = 7;
          modified = true;
        }
        if (!ex.painTarget) {
          ex.painTarget = 4;
          modified = true;
        }
      }
      if (ex.progressionType === 'stability') {
        if (!ex.stabilityTarget) {
          ex.stabilityTarget = 7;
          modified = true;
        }
        if (!ex.painTarget) {
          ex.painTarget = 4;
          modified = true;
        }
      }
      // Add default sets if missing
      if (!ex.sets && ex.reps) {
        ex.sets = 3;
        modified = true;
      }
    });
  });
  
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⏭️ No changes: ${file}`);
  }
});

console.log('Done!');