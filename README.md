# menilvukovic.com

Personal website of Menil Vuković — Engineer, CEO, Writer, Father.

Built with [Eleventy](https://www.11ty.dev/) and deployed to GitHub Pages.

## Structure

- `/` — Personal landing page
- `/about/` — About page with bio and experience
- `/blog/` — Blog with technical writing
- `/projects/` — Public projects showcase
- `/contact/` — Contact information

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Hidden Projects

The site supports "hidden projects" — pages that exist but aren't linked from navigation. These are accessible only by direct URL.

To create a hidden project:
1. Add `hidden: true` to the project frontmatter
2. The project won't appear in `/projects/` listing
3. It will still be built and accessible by direct URL

## Easter Eggs

- **Konami Code**: Press `↑ ↑ ↓ ↓ ← → ← → B A` anywhere on the site for a surprise

## Design

Modern Minimal aesthetic — Swiss-inspired, engineering precision:
- Clean typography (Inter + JetBrains Mono)
- Dark mode default with light mode toggle
- Subtle animations and micro-interactions
- Responsive design for all devices

## Deployment

The site automatically deploys to GitHub Pages on every push to `main`.

## License

MIT