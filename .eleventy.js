module.exports = function (eleventyConfig) {
  const pluginRss = require("@11ty/eleventy-plugin-rss");
  const sitemap = require("@quasibit/eleventy-plugin-sitemap");

  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: "https://menilvukovic.com",
    },
  });

  // Add passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");



  // Copy CNAME for GitHub Pages custom domain
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy(".nojekyll");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Add syntax highlighting for code blocks
  const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
  eleventyConfig.addPlugin(syntaxHighlight);

  // Add date filter
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return '';
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Add ISO date filter for meta tags
  eleventyConfig.addFilter("isoDate", (dateObj) => {
    if (!dateObj) return '';
    return new Date(dateObj).toISOString();
  });

  // Add limit filter for collections
  eleventyConfig.addFilter("limit", function (array, limit) {
    if (!Array.isArray(array)) return [];
    return array.slice(0, limit);
  });

  // Current year shortcode for copyright
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Collection: Blog posts (sorted by date, newest first)
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByTag("post").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Collection: Public projects only (not hidden)
  eleventyConfig.addCollection("publicProjects", function (collectionApi) {
    return collectionApi.getFilteredByTag("project").filter((item) => {
      return !item.data.hidden;
    });
  });

  // Collection: Hidden projects only
  eleventyConfig.addCollection("hiddenProjects", function (collectionApi) {
    return collectionApi.getFilteredByTag("project").filter((item) => {
      return item.data.hidden;
    });
  });

  // Watch for CSS and JS changes
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/js/");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
