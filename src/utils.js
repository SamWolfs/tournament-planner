const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Save data to a YAML file
 * @param {Object} data - data to save
 * @param {string} outputPath - path to output file
 */
function saveToYaml(data, outputPath) {
  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, yamlContent, 'utf8');
  console.log(`Data saved to ${outputPath}`);
}

/**
 * Delay helper for rate limiting
 * @param {number} ms - milliseconds to wait
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  delay,
  loadYaml,
  saveToYaml,
};
