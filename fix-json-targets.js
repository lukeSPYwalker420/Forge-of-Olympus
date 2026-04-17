const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let modified = false;
  
  data.sessions.forEach(session => {
    const isDeloadWeek = session.focus?.toLowerCase().includes('deload') || session.week === 5;
    
    session.exercises.forEach(ex => {
      const role = ex.role || '';
      const isAccessory = role === 'accessory' || 
                          (ex.liftName && (
                            ex.liftName.includes('Leg Press') ||
                            ex.liftName.includes('Raise') ||
                            ex.liftName.includes('Curl') ||
                            ex.liftName.includes('Extension') ||
                            ex.liftName.includes('Fly') ||
                            ex.liftName.includes('Press') && !ex.liftName.includes('Bench') && !ex.liftName.includes('Overhead')
                          ));
      
      // Skip if already has appropriate targets
      if (ex.progressionType === 'strength' && ex.rpeTarget !== undefined) return;
      if (ex.progressionType === 'volume' && ex.rirTarget !== undefined) return;
      if (ex.progressionType === 'mobility' && ex.stabilityTarget !== undefined) return;
      
      // Assign targets based on progression type and role
      if (ex.progressionType === 'strength') {
        if (isDeloadWeek) {
          ex.rpeTarget = 4;
        } else if (isAccessory) {
          ex.rpeTarget = 6;  // Accessories during strength blocks: lighter
        } else {
          ex.rpeTarget = 7;   // Main lifts: moderate
        }
        modified = true;
      }
      
      else if (ex.progressionType === 'volume') {
        if (isDeloadWeek) {
          ex.rirTarget = 4;
        } else if (isAccessory) {
          ex.rirTarget = 3;   // Accessories: further from failure
        } else {
          ex.rirTarget = 2;   // Main volume work: closer to failure
        }
        modified = true;
      }
      
      else if (ex.progressionType === 'power') {
        if (isDeloadWeek) {
          ex.qualityTarget = 6;
        } else {
          ex.qualityTarget = 8;
        }
        modified = true;
      }
      
      else if (ex.progressionType === 'mobility') {
        if (isDeloadWeek) {
          ex.stabilityTarget = 6;
          ex.painTarget = 3;
        } else {
          ex.stabilityTarget = 7;
          ex.painTarget = 4;
        }
        modified = true;
      }
      
      else if (ex.progressionType === 'stability') {
        if (isDeloadWeek) {
          ex.stabilityTarget = 6;
          ex.painTarget = 3;
        } else {
          ex.stabilityTarget = 7;
          ex.painTarget = 4;
        }
        modified = true;
      }
      
      // Add sets if missing
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

console.log('\n📋 Target Assignment Logic:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('| Progression | Role        | Normal Week | Deload Week |');
console.log('|-------------|-------------|-------------|-------------|');
console.log('| strength    | Main Lift   | RPE 7       | RPE 4       |');
console.log('| strength    | Accessory   | RPE 6       | RPE 4       |');
console.log('| volume      | Main Lift   | RIR 2       | RIR 4       |');
console.log('| volume      | Accessory   | RIR 3       | RIR 4       |');
console.log('| power       | Any         | Quality 8   | Quality 6   |');
console.log('| mobility    | Any         | Stability 7/Pain 4 | Stability 6/Pain 3 |');
console.log('| stability   | Any         | Stability 7/Pain 4 | Stability 6/Pain 3 |');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');