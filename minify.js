const CleanCSS = require("clean-css");
const Terser = require("terser");
const fs = require("fs");
const path = require("path");

async function minify() {
  console.log("Minifying CSS files...");
  
  // CSS files
  const cssFiles = ["_site/css/main.css", "_site/css/syntax.css"];
  for (const file of cssFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const minified = new CleanCSS({}).minify(content);
      fs.writeFileSync(file, minified.styles);
      console.log(`Minified: ${file}`);
    }
  }

  // JS files
  console.log("Minifying JS files...");
  const jsFiles = ["_site/js/theme.js", "_site/js/konami.js"];
  for (const file of jsFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const minified = await Terser.minify(content);
      fs.writeFileSync(file, minified.code);
      console.log(`Minified: ${file}`);
    }
  }
  
  console.log("Minification complete!");
}

minify();
