const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

// Accessory keywords to identify accessory exercises
const accessoryKeywords = [
  'leg press', 'leg extension', 'leg curl', 'calf', 'lateral raise', 
  'arnold press', 'skull crusher', 'tricep', 'bicep', 'curl', 
  'bulgarian', 'split squat', 'face pull', 'lateral', 'fly', 
  'raise', 'pushdown', 'kickback', 'shrug', 'cable', 'dumbbell',
  'incline', 'decline', 'dip', 'pull apart', 'band'
];

// Main lift keywords (these should have higher RPE)
const mainLiftKeywords = [
  'squat (top set)', 'bench (top set)', 'deadlift (top set)',
  'back squat', 'bench press', 'deadlift', 'overhead press',
  'front squat', 'trap bar deadlift', 'zercher'
];

function isAccessory(liftName, role) {
  if (!liftName) return false;
  const name = liftName.toLowerCase();
  
  // If role is explicitly accessory
  if (role === 'accessory') return true;
  
  // If it's a main lift, not accessory
  for (const keyword of mainLiftKeywords) {
    if (name.includes(keyword)) return false;
  }
  
  // Check accessory keywords
  for (const keyword of accessoryKeywords) {
    if (name.includes(keyword)) return true;
  }
  
  // Default: if not clearly a main lift, treat as accessory
  return true;
}

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let modified = false;
  
  data.sessions.forEach(session => {
    const isDeloadWeek = session.focus?.toLowerCase().includes('deload') || session.week === 5;
    
    session.exercises.forEach(ex => {
      const isAcc = isAccessory(ex.liftName, ex.role);
      
      // Skip if already has appropriate targets
      if (ex.progressionType === 'strength' && ex.rpeTarget !== undefined && !isNaN(ex.rpeTarget)) return;
      if (ex.progressionType === 'volume' && ex.rirTarget !== undefined && !isNaN(ex.rirTarget)) return;
      if (ex.progressionType === 'power' && ex.qualityTarget !== undefined && !isNaN(ex.qualityTarget)) return;
      if ((ex.progressionType === 'mobility' || ex.progressionType === 'stability') && ex.stabilityTarget !== undefined) return;
      
      // Assign targets based on progression type and role
      if (ex.progressionType === 'strength') {
        if (isDeloadWeek) {
          ex.rpeTarget = 4;
        } else if (isAcc) {
          ex.rpeTarget = 6;   // Accessories: lighter RPE
        } else {
          ex.rpeTarget = 7;   // Main lifts: moderate RPE
        }
        modified = true;
        console.log(`  📊 ${file} - ${ex.liftName}: strength RPE = ${ex.rpeTarget} (${isAcc ? 'accessory' : 'main'})`);
      }
      
      else if (ex.progressionType === 'volume') {
        if (isDeloadWeek) {
          ex.rirTarget = 4;
        } else if (isAcc) {
          ex.rirTarget = 3;   // Accessories: further from failure
        } else {
          ex.rirTarget = 2;   // Main volume work: closer to failure
        }
        modified = true;
        console.log(`  📊 ${file} - ${ex.liftName}: volume RIR = ${ex.rirTarget} (${isAcc ? 'accessory' : 'main'})`);
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
    console.log(`✅ Updated: ${file}\n`);
  } else {
    console.log(`⏭️ No changes: ${file}\n`);
  }
});

console.log('\n📋 Target Assignment Logic Applied:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('| Progression | Exercise Type | Normal Week | Deload Week |');
console.log('|-------------|---------------|-------------|-------------|');
console.log('| strength    | Main Lift     | RPE 7       | RPE 4       |');
console.log('| strength    | Accessory     | RPE 6       | RPE 4       |');
console.log('| volume      | Main Lift     | RIR 2       | RIR 4       |');
console.log('| volume      | Accessory     | RIR 3       | RIR 4       |');
console.log('| power       | Any           | Quality 8   | Quality 6   |');
console.log('| mobility    | Any           | Stability 7/Pain 4 | Stability 6/Pain 3 |');
console.log('| stability   | Any           | Stability 7/Pain 4 | Stability 6/Pain 3 |');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');