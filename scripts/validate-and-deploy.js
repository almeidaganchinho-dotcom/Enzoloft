#!/usr/bin/env node

/**
 * Validation script to check for errors before deploying
 * Usage: node scripts/validate-and-deploy.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, silent = false) {
  try {
    if (!silent) log(`\n▶ ${command}`, 'blue');
    const result = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n🔍 EnzoLoft Validation Pipeline', 'blue');
  log('================================\n', 'blue');

  // 1. Check TypeScript errors
  log('1️⃣  Checking TypeScript...', 'yellow');
  const buildResult = runCommand('npm run build', true);
  if (!buildResult.success) {
    log('❌ Build failed! Fix the errors before proceeding.', 'red');
    console.log(buildResult.error);
    process.exit(1);
  }
  log('✅ TypeScript validation passed', 'green');

  // 2. Check for console errors in source files
  log('\n2️⃣  Checking for common issues...', 'yellow');
  const srcDir = path.join(__dirname, '..', 'pages');
  const issues = [];

  function checkFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        checkFiles(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for undefined functions
        if (content.includes('onChange={handleSubmit}') && !content.includes('const handleSubmit')) {
          issues.push(`⚠️  ${filePath}: handleSubmit called but not defined`);
        }
        
        // Check for missing imports
        if (content.includes('useState') && !content.includes("import React")) {
          issues.push(`⚠️  ${filePath}: Missing React import`);
        }
      }
    });
  }

  checkFiles(srcDir);
  
  if (issues.length > 0) {
    issues.forEach(issue => log(issue, 'red'));
    log('\n❌ Issues found! Please fix them.', 'red');
    process.exit(1);
  }
  log('✅ No common issues detected', 'green');

  // 3. Git status
  log('\n3️⃣  Checking Git status...', 'yellow');
  const gitStatus = runCommand('git status --porcelain', true);
  if (gitStatus.output.trim()) {
    log('⚠️  Uncommitted changes detected:', 'yellow');
    log(gitStatus.output, 'yellow');
  } else {
    log('✅ Working directory clean', 'green');
  }

  // 4. Summary
  log('\n✅ All validations passed!', 'green');
  log('\n📋 Summary:', 'blue');
  log('  - TypeScript compilation: OK', 'green');
  log('  - Code analysis: OK', 'green');
  log('  - Git status: Ready', 'green');
  log('\n💡 Next steps:', 'blue');
  log('  1. Review changes: git diff', 'yellow');
  log('  2. Commit: git commit -m "your message"', 'yellow');
  log('  3. Push: git push origin main', 'yellow');
  log('  4. Start dev: npm run dev\n', 'yellow');
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
