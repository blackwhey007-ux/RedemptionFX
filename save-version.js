const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('💾 RedemptionFX Version Saver');
console.log('=============================\n');

// Check if we're in a git repository
try {
  execSync('git status', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ ERROR: Not in a git repository!');
  console.log('Please run this script from your project directory.');
  process.exit(1);
}

// Get current status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (!status.trim()) {
    console.log('ℹ️ No changes to commit. Working directory is clean.');
    rl.close();
    process.exit(0);
  }
} catch (error) {
  console.log('❌ Error checking git status:', error.message);
  process.exit(1);
}

// Ask for commit message
rl.question('📝 Enter a description for this version (e.g., "Added backup system"): ', (description) => {
  if (!description.trim()) {
    console.log('❌ Description cannot be empty!');
    rl.close();
    process.exit(1);
  }

  try {
    // Add all changes
    console.log('📦 Adding changes to git...');
    execSync('git add .', { stdio: 'inherit' });

    // Create commit with timestamp
    const timestamp = new Date().toISOString();
    const commitMessage = `${description} - ${timestamp}`;
    
    console.log('💾 Creating commit...');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    // Show commit history
    console.log('\n📜 Recent commits:');
    console.log('==================');
    try {
      const log = execSync('git log --oneline -5', { encoding: 'utf8' });
      console.log(log);
    } catch (logError) {
      console.log('Could not display commit history');
    }

    console.log('\n✅ Version saved successfully!');
    console.log('🔄 To restore to this version later, use:');
    console.log('   git reset --hard <commit-hash>');
    console.log('   npm install');

  } catch (error) {
    console.log('❌ Error saving version:', error.message);
  }

  rl.close();
});

