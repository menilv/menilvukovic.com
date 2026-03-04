#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import chalk from 'chalk';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const DRAFTS_DIR = path.join(__dirname, '..', 'drafts');
const PROJECTS_DIR = path.join(__dirname, '..', 'projects');
const SITE_DIR = path.join(__dirname, '..', '..');
const EDITOR = process.env.EDITOR || 'nano';

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL STYLING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const ICONS = {
  posts: '📝',
  drafts: '💾',
  projects: '🏗️ ',
  create: '📄',
  edit: '✏️ ',
  delete: '🗑️ ',
  list: '📋',
  publish: '🚀',
  commit: '📦',
  back: '←',
  exit: '👋',
  build: '🔨',
  warning: '⚠️ ',
  error: '✗',
  success: '✓',
  info: 'ℹ️ ',
  arrow: '▸',
  bullet: '•',
  star: '★',
  folder: '📁',
  calendar: '📅',
  tag: '🏷️ ',
  link: '🔗'
};

const COLORS = {
  primary: chalk.cyan,
  secondary: chalk.magenta,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim
};

// Helper to strip ANSI codes for accurate length calculation
function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

// Box drawing characters
const BOX = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  ml: '├', mr: '┤', mt: '┬', mb: '┴',
  cross: '┼'
};

function box(text, width = 50, options = {}) {
  const { 
    color = COLORS.primary, 
    padding = 1,
    align = 'center',
    title = null
  } = options;
  
  const innerWidth = width - 2;
  const lines = [];
  
  // Top border with optional title
  if (title) {
    const titleStr = ` ${title} `;
    const leftPad = Math.floor((innerWidth - titleStr.length) / 2);
    const rightPad = innerWidth - titleStr.length - leftPad;
    lines.push(color(BOX.tl + BOX.h.repeat(leftPad) + titleStr + BOX.h.repeat(rightPad) + BOX.tr));
  } else {
    lines.push(color(BOX.tl + BOX.h.repeat(innerWidth) + BOX.tr));
  }
  
  // Empty padding rows
  for (let i = 0; i < padding; i++) {
    lines.push(color(BOX.v + ' '.repeat(innerWidth) + BOX.v));
  }
  
  // Content
  const textLines = Array.isArray(text) ? text : [text];
  textLines.forEach(line => {
    let content;
    if (align === 'center') {
      const pad = Math.max(0, innerWidth - stripAnsi(line).length);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      content = ' '.repeat(left) + line + ' '.repeat(right);
    } else if (align === 'left') {
      const pad = Math.max(0, innerWidth - stripAnsi(line).length - 2);
      content = ' ' + line + ' '.repeat(pad + 1);
    } else {
      const pad = Math.max(0, innerWidth - stripAnsi(line).length - 2);
      content = ' '.repeat(pad + 1) + line + ' ';
    }
    lines.push(color(BOX.v) + content.substring(0, innerWidth) + color(BOX.v));
  });
  
  // Empty padding rows
  for (let i = 0; i < padding; i++) {
    lines.push(color(BOX.v + ' '.repeat(innerWidth) + BOX.v));
  }
  
  // Bottom border
  lines.push(color(BOX.bl + BOX.h.repeat(innerWidth) + BOX.br));
  
  return lines.join('\n');
}

function banner(type, message) {
  const styles = {
    success: { icon: ICONS.success, color: COLORS.success, bg: chalk.bgGreen.black },
    error: { icon: ICONS.error, color: COLORS.error, bg: chalk.bgRed.white },
    warning: { icon: ICONS.warning, color: COLORS.warning, bg: chalk.bgYellow.black },
    info: { icon: ICONS.info, color: COLORS.info, bg: chalk.bgBlue.white }
  };
  
  const style = styles[type] || styles.info;
  const prefix = style.color(` ${style.icon} `);
  const line = BOX.h.repeat(Math.max(0, 48 - message.length));
  
  return `\n${COLORS.primary(BOX.tl + BOX.h.repeat(50) + BOX.tr)}
${COLORS.primary(BOX.v)}${prefix} ${message}${' '.repeat(Math.max(0, 47 - message.length))}${COLORS.primary(BOX.v)}
${COLORS.primary(BOX.bl + BOX.h.repeat(50) + BOX.br)}\n`;
}

function separator(width = 52, char = BOX.h, color = COLORS.muted) {
  return color(char.repeat(width));
}

function section(title, color = COLORS.primary) {
  const padding = Math.max(0, 50 - title.length - 4);
  return `\n${color(BOX.ml + BOX.h.repeat(2) + ' ' + title + ' ' + BOX.h.repeat(padding) + BOX.mr)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return COLORS.muted('No date');
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getPosts(dir = POSTS_DIR) {
  if (!fs.existsSync(dir)) return [];
  
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      const { data } = matter(content);
      return {
        filename: f,
        slug: f.replace('.md', ''),
        title: data.title || 'Untitled',
        description: data.description || '',
        date: data.date,
        tags: data.tags || [],
        hasContent: content.length > 100,
        isDraft: dir === DRAFTS_DIR
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return files;
}

function generateFrontmatter(data) {
  return `---
title: "${data.title}"
description: "${data.description}"
date: ${data.date}
layout: post.njk
tags:
  - post${data.tags ? data.tags.split(',').map(t => `\n  - ${t.trim()}`).join('') : ''}
author: Menil V.
---

`;
}

function getProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  
  const files = fs.readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf-8');
      const { data } = matter(content);
      return {
        filename: f,
        slug: f.replace('.md', ''),
        title: data.title || 'Untitled',
        description: data.description || '',
        year: data.year,
        role: data.role,
        url: data.url,
        tags: data.tags || [],
        hasContent: content.length > 100
      };
    })
    .sort((a, b) => (b.year || 0) - (a.year || 0));
  
  return files;
}

function generateProjectFrontmatter(data) {
  const tags = data.tags 
    ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];
  if (!tags.includes('project')) {
    tags.unshift('project');
  }
  
  const tagsYaml = tags.map(t => `  - ${t}`).join('\n');
  
  return `---
title: "${data.title}"
description: "${data.description}"
year: ${data.year}
role: "${data.role}"
tags:
${tagsYaml}${data.url ? `\nurl: ${data.url}` : ''}
---

`;
}

function openEditor(initialContent) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, '.temp.md');
    fs.writeFileSync(tempFile, initialContent, 'utf-8');
    
    const editorProcess = spawn(EDITOR, [tempFile], {
      stdio: 'inherit',
      shell: true
    });
    
    editorProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Editor exited with code ${code}`));
        return;
      }
      
      const content = fs.readFileSync(tempFile, 'utf-8');
      fs.unlinkSync(tempFile);
      resolve(content);
    });
  });
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function runBuild() {
  console.log(COLORS.primary(`\n${BOX.tl}${BOX.h.repeat(50)}${BOX.tr}`));
  console.log(COLORS.primary(`${BOX.v}  ${ICONS.build}  Building site...${' '.repeat(33)}${BOX.v}`));
  console.log(COLORS.primary(`${BOX.bl}${BOX.h.repeat(50)}${BOX.br}\n`));
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: SITE_DIR,
    stdio: 'inherit',
    shell: true
  });
  
  return new Promise((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log(banner('success', 'Build completed successfully!'));
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function displayPostsTable(posts, title = 'Posts') {
  if (posts.length === 0) {
    console.log(banner('warning', `No ${title.toLowerCase()} found`));
    return;
  }
  
  console.log(section(`${ICONS.list} ${title} (${posts.length})`));
  console.log(separator());
  
  // Header
  const numWidth = 4;
  const titleWidth = 30;
  const dateWidth = 12;
  
  console.log(
    COLORS.muted(BOX.v) + 
    ' '.repeat(numWidth) +
    COLORS.bold('Title').padEnd(titleWidth) +
    COLORS.muted('│ ') +
    COLORS.bold('Date').padEnd(dateWidth) +
    COLORS.muted('│ ') +
    COLORS.bold('Status')
  );
  console.log(separator());
  
  // Rows
  posts.forEach((p, i) => {
    const num = `${i + 1}.`.padStart(3);
    const title = truncate(p.title, titleWidth - 1).padEnd(titleWidth);
    const date = formatDate(p.date).padEnd(dateWidth);
    const status = p.isDraft 
      ? COLORS.warning(`${ICONS.drafts} Draft`)
      : COLORS.success(`${ICONS.success} Published`);
    
    console.log(
      COLORS.muted(`${BOX.v} ${num} `) +
      title +
      COLORS.muted('│ ') + date +
      COLORS.muted('│ ') + status
    );
  });
  
  console.log(separator() + '\n');
}

function displayProjectsTable(projects) {
  if (projects.length === 0) {
    console.log(banner('warning', 'No projects found'));
    return;
  }
  
  console.log(section(`${ICONS.projects} Projects (${projects.length})`));
  console.log(separator());
  
  const numWidth = 4;
  const titleWidth = 28;
  const yearWidth = 6;
  
  console.log(
    COLORS.muted(BOX.v) + 
    ' '.repeat(numWidth) +
    COLORS.bold('Project').padEnd(titleWidth) +
    COLORS.muted('│ ') +
    COLORS.bold('Year').padEnd(yearWidth) +
    COLORS.muted('│ ') +
    COLORS.bold('Role')
  );
  console.log(separator());
  
  projects.forEach((p, i) => {
    const num = `${i + 1}.`.padStart(3);
    const title = truncate(p.title, titleWidth - 1).padEnd(titleWidth);
    const year = (p.year || 'N/A').toString().padEnd(yearWidth);
    const role = truncate(p.role || 'N/A', 20);
    
    console.log(
      COLORS.muted(`${BOX.v} ${num} `) +
      COLORS.primary(title) +
      COLORS.muted('│ ') + year +
      COLORS.muted('│ ') + COLORS.muted(role)
    );
  });
  
  console.log(separator() + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function mainMenu() {
  const posts = getPosts(POSTS_DIR);
  const drafts = getPosts(DRAFTS_DIR);
  const projects = getProjects();
  
  const choices = [
    { name: `${ICONS.create} Create new post`, value: 'create' },
    { name: `${ICONS.edit} Edit post`, value: 'edit' },
    { name: `${ICONS.list} List all posts${posts.length > 0 ? COLORS.muted(` (${posts.length})`) : ''}`, value: 'list' },
    { name: `${ICONS.delete} Delete post`, value: 'delete' },
    new inquirer.Separator(COLORS.muted(`${BOX.ml}${BOX.h.repeat(48)}${BOX.mr}`)),
    { name: `${ICONS.projects} Manage Projects${projects.length > 0 ? COLORS.muted(` (${projects.length})`) : ''}`, value: 'projects' },
    { name: `${ICONS.drafts} Manage Drafts${drafts.length > 0 ? COLORS.warning(` (${drafts.length})`) : ''}`, value: 'drafts' },
    new inquirer.Separator(COLORS.muted(`${BOX.ml}${BOX.h.repeat(48)}${BOX.mr}`)),
    { name: `${ICONS.commit} Commit & Push`, value: 'commit' },
    new inquirer.Separator(COLORS.muted(`${BOX.ml}${BOX.h.repeat(48)}${BOX.mr}`)),
    { name: `${ICONS.exit} Exit`, value: 'exit' }
  ];
  
  console.log('\n' + separator());
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: COLORS.primary(`${ICONS.arrow} What would you like to do?`),
      choices,
      pageSize: 15
    }
  ]);

  switch (action) {
    case 'create':
      await createPost();
      break;
    case 'edit':
      await editPost();
      break;
    case 'list':
      await listPosts();
      break;
    case 'delete':
      await deletePost();
      break;
    case 'commit':
      await commitAndPush();
      break;
    case 'drafts':
      await draftsMenu();
      break;
    case 'projects':
      await projectMenu();
      break;
    case 'exit':
      console.log(banner('info', 'Goodbye! See you next time.'));
      process.exit(0);
  }
  
  await mainMenu();
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function createPost() {
  console.log(section(`${ICONS.create} Create New Post`));
  
  const { isDraft } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isDraft',
      message: COLORS.primary('Save as draft?'),
      default: false
    }
  ]);
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: COLORS.bold('Title:'),
      validate: (input) => input.trim().length > 0 || 'Title is required'
    },
    {
      type: 'input',
      name: 'description',
      message: COLORS.bold('Description:'),
      validate: (input) => input.trim().length > 0 || 'Description is required'
    },
    {
      type: 'input',
      name: 'tags',
      message: COLORS.bold('Tags (comma-separated, optional):'),
      default: ''
    }
  ]);
  
  const slug = generateSlug(answers.title);
  const date = new Date().toISOString().split('T')[0];
  const frontmatter = generateFrontmatter({
    ...answers,
    date
  });
  
  const filename = `${slug}.md`;
  const targetDir = isDraft ? DRAFTS_DIR : POSTS_DIR;
  const filepath = path.join(targetDir, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(banner('error', `${isDraft ? 'Draft' : 'Post'} already exists: ${filename}`));
    return;
  }
  
  console.log(COLORS.muted(`\n${ICONS.info} Opening editor... (${EDITOR})`));
  console.log(COLORS.muted(`${ICONS.info} Write your content, save and close the editor.\n`));
  
  try {
    const content = await openEditor(frontmatter);
    fs.writeFileSync(filepath, content, 'utf-8');
    
    const type = isDraft ? 'Draft' : 'Post';
    console.log(banner('success', `${type} saved: ${filename}`));
    
    if (!isDraft) {
      const { shouldBuild } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldBuild',
          message: COLORS.primary('Build the site?'),
          default: true
        }
      ]);
      
      if (shouldBuild) {
        await runBuild();
      }
    }
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

async function editPost() {
  const posts = getPosts(POSTS_DIR);
  
  if (posts.length === 0) {
    console.log(banner('warning', 'No posts found to edit'));
    return;
  }
  
  console.log(section(`${ICONS.edit} Edit Post`));
  
  const { selectedPost } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPost',
      message: COLORS.primary('Select post to edit:'),
      choices: [
        ...posts.map(p => ({
          name: ` ${COLORS.bold(truncate(p.title, 35))} ${COLORS.muted(`(${formatDate(p.date)})`)}`,
          value: p.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 12
    }
  ]);
  
  if (selectedPost === 'cancel') return;
  
  const filepath = path.join(POSTS_DIR, selectedPost);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  console.log(COLORS.muted(`\n${ICONS.info} Opening editor... (${EDITOR})`));
  console.log(COLORS.muted(`${ICONS.info} Edit your post, save and close the editor.\n`));
  
  try {
    const newContent = await openEditor(content);
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(banner('success', `Post updated: ${selectedPost}`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: COLORS.primary('Build the site?'),
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

async function listPosts() {
  const posts = getPosts(POSTS_DIR);
  displayPostsTable(posts, 'Published Posts');
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: COLORS.primary('What next?'),
      choices: [
        { name: ` ${ICONS.edit}  Edit a post`, value: 'edit' },
        { name: ` ${ICONS.back}  Back to menu`, value: 'back' }
      ]
    }
  ]);
  
  if (action === 'edit') {
    await editPost();
  }
}

async function deletePost() {
  const posts = getPosts(POSTS_DIR);
  
  if (posts.length === 0) {
    console.log(banner('warning', 'No posts to delete'));
    return;
  }
  
  console.log(section(`${ICONS.delete} Delete Post`));
  
  const { selectedPost } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPost',
      message: COLORS.primary('Select post to delete:'),
      choices: [
        ...posts.map(p => ({
          name: ` ${COLORS.bold(truncate(p.title, 35))} ${COLORS.muted(`(${formatDate(p.date)})`)}`,
          value: p.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 12
    }
  ]);
  
  if (selectedPost === 'cancel') return;
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: COLORS.error(`Are you sure you want to delete "${selectedPost}"?`),
      default: false
    }
  ]);
  
  if (confirmDelete) {
    const filepath = path.join(POSTS_DIR, selectedPost);
    fs.unlinkSync(filepath);
    console.log(banner('success', `Deleted: ${selectedPost}`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: COLORS.primary('Build the site?'),
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } else {
    console.log(banner('info', 'Deletion cancelled'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAFT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function draftsMenu() {
  const drafts = getPosts(DRAFTS_DIR);
  
  if (drafts.length === 0) {
    console.log(banner('info', 'No drafts found'));
    return;
  }
  
  displayPostsTable(drafts, 'Drafts');
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: COLORS.primary(`${ICONS.drafts} Draft Actions:`),
      choices: [
        { name: ` ${ICONS.edit}  Edit draft`, value: 'edit' },
        { name: ` ${ICONS.publish}  Publish draft`, value: 'publish' },
        { name: ` ${ICONS.delete}  Delete draft`, value: 'delete' },
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Back to main menu`, value: 'back' }
      ]
    }
  ]);
  
  switch (action) {
    case 'edit':
      await editDraft();
      break;
    case 'publish':
      await publishDraft();
      break;
    case 'delete':
      await deleteDraft();
      break;
    case 'back':
      return;
  }
  
  await draftsMenu();
}

async function editDraft() {
  const drafts = getPosts(DRAFTS_DIR);
  
  const { selectedDraft } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDraft',
      message: COLORS.primary('Select draft to edit:'),
      choices: [
        ...drafts.map(d => ({
          name: ` ${COLORS.bold(truncate(d.title, 35))}`,
          value: d.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 10
    }
  ]);
  
  if (selectedDraft === 'cancel') return;
  
  const filepath = path.join(DRAFTS_DIR, selectedDraft);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  console.log(COLORS.muted(`\n${ICONS.info} Opening editor... (${EDITOR})`));
  console.log(COLORS.muted(`${ICONS.info} Edit your draft, save and close the editor.\n`));
  
  try {
    const newContent = await openEditor(content);
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(banner('success', `Draft updated: ${selectedDraft}`));
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

async function publishDraft() {
  const drafts = getPosts(DRAFTS_DIR);
  
  const { selectedDraft } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDraft',
      message: COLORS.primary('Select draft to publish:'),
      choices: [
        ...drafts.map(d => ({
          name: ` ${COLORS.bold(truncate(d.title, 35))}`,
          value: d.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 10
    }
  ]);
  
  if (selectedDraft === 'cancel') return;
  
  const draftPath = path.join(DRAFTS_DIR, selectedDraft);
  const postPath = path.join(POSTS_DIR, selectedDraft);
  
  if (fs.existsSync(postPath)) {
    console.log(banner('error', 'A post with this name already exists. Delete it first or rename the draft.'));
    return;
  }
  
  const content = fs.readFileSync(draftPath, 'utf-8');
  fs.writeFileSync(postPath, content, 'utf-8');
  fs.unlinkSync(draftPath);
  
  console.log(banner('success', `Draft published: ${selectedDraft}`));
  
  const { shouldBuild } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldBuild',
      message: COLORS.primary('Build the site?'),
      default: true
    }
  ]);
  
  if (shouldBuild) {
    await runBuild();
  }
}

async function deleteDraft() {
  const drafts = getPosts(DRAFTS_DIR);
  
  const { selectedDraft } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDraft',
      message: COLORS.primary('Select draft to delete:'),
      choices: [
        ...drafts.map(d => ({
          name: ` ${COLORS.bold(truncate(d.title, 35))}`,
          value: d.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 10
    }
  ]);
  
  if (selectedDraft === 'cancel') return;
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: COLORS.error(`Delete "${selectedDraft}"?`),
      default: false
    }
  ]);
  
  if (confirmDelete) {
    const filepath = path.join(DRAFTS_DIR, selectedDraft);
    fs.unlinkSync(filepath);
    console.log(banner('success', `Deleted: ${selectedDraft}`));
  } else {
    console.log(banner('info', 'Deletion cancelled'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function projectMenu() {
  const projects = getProjects();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: COLORS.primary(`${ICONS.projects} Project Management`),
      choices: [
        { name: ` ${ICONS.create}  Create new project`, value: 'create' },
        { name: ` ${ICONS.edit}  Edit project`, value: 'edit' },
        { name: ` ${ICONS.list}  List projects${projects.length > 0 ? COLORS.muted(` (${projects.length})`) : ''}`, value: 'list' },
        { name: ` ${ICONS.delete}  Delete project`, value: 'delete' },
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Back to main menu`, value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'create':
      await createProject();
      break;
    case 'edit':
      await editProject();
      break;
    case 'list':
      await listProjects();
      break;
    case 'delete':
      await deleteProject();
      break;
    case 'back':
      return;
  }

  await projectMenu();
}

async function createProject() {
  console.log(section(`${ICONS.create} Create New Project`));
  
  const currentYear = new Date().getFullYear();
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: COLORS.bold('Title:'),
      validate: (input) => input.trim().length > 0 || 'Title is required'
    },
    {
      type: 'input',
      name: 'description',
      message: COLORS.bold('Description:'),
      validate: (input) => input.trim().length > 0 || 'Description is required'
    },
    {
      type: 'input',
      name: 'year',
      message: COLORS.bold('Year:'),
      default: currentYear.toString(),
      validate: (input) => /^\d{4}$/.test(input) || 'Enter a valid year (e.g., 2024)'
    },
    {
      type: 'input',
      name: 'role',
      message: COLORS.bold('Role:'),
      validate: (input) => input.trim().length > 0 || 'Role is required'
    },
    {
      type: 'input',
      name: 'tags',
      message: COLORS.bold('Tags (comma-separated, optional):'),
      default: ''
    },
    {
      type: 'input',
      name: 'url',
      message: COLORS.bold('URL (optional):'),
      default: ''
    }
  ]);
  
  const slug = generateSlug(answers.title);
  const frontmatter = generateProjectFrontmatter({
    ...answers,
    tags: answers.tags || 'project'
  });
  
  const filename = `${slug}.md`;
  const filepath = path.join(PROJECTS_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(banner('error', `Project already exists: ${filename}`));
    return;
  }
  
  console.log(COLORS.muted(`\n${ICONS.info} Opening editor... (${EDITOR})`));
  console.log(COLORS.muted(`${ICONS.info} Write your project content, save and close the editor.\n`));
  
  try {
    const content = await openEditor(frontmatter);
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(banner('success', `Project saved: ${filename}`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: COLORS.primary('Build the site?'),
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

async function editProject() {
  const projects = getProjects();
  
  if (projects.length === 0) {
    console.log(banner('warning', 'No projects found'));
    return;
  }
  
  console.log(section(`${ICONS.edit} Edit Project`));
  
  const { selectedProject } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProject',
      message: COLORS.primary('Select project to edit:'),
      choices: [
        ...projects.map(p => ({
          name: ` ${COLORS.bold(truncate(p.title, 30))} ${COLORS.muted(`(${p.year})`)}`,
          value: p.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 12
    }
  ]);
  
  if (selectedProject === 'cancel') return;
  
  const filepath = path.join(PROJECTS_DIR, selectedProject);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  console.log(COLORS.muted(`\n${ICONS.info} Opening editor... (${EDITOR})`));
  console.log(COLORS.muted(`${ICONS.info} Edit your project, save and close the editor.\n`));
  
  try {
    const newContent = await openEditor(content);
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(banner('success', `Project updated: ${selectedProject}`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: COLORS.primary('Build the site?'),
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

async function listProjects() {
  const projects = getProjects();
  displayProjectsTable(projects);
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: COLORS.primary('What next?'),
      choices: [
        { name: ` ${ICONS.edit}  Edit a project`, value: 'edit' },
        { name: ` ${ICONS.back}  Back`, value: 'back' }
      ]
    }
  ]);
  
  if (action === 'edit') {
    await editProject();
  }
}

async function deleteProject() {
  const projects = getProjects();
  
  if (projects.length === 0) {
    console.log(banner('warning', 'No projects to delete'));
    return;
  }
  
  console.log(section(`${ICONS.delete} Delete Project`));
  
  const { selectedProject } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProject',
      message: COLORS.primary('Select project to delete:'),
      choices: [
        ...projects.map(p => ({
          name: ` ${COLORS.bold(truncate(p.title, 30))} ${COLORS.muted(`(${p.year})`)}`,
          value: p.filename
        })),
        new inquirer.Separator(separator(40)),
        { name: ` ${ICONS.back}  Cancel`, value: 'cancel' }
      ],
      pageSize: 12
    }
  ]);
  
  if (selectedProject === 'cancel') return;
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: COLORS.error(`Delete "${selectedProject}"?`),
      default: false
    }
  ]);
  
  if (confirmDelete) {
    const filepath = path.join(PROJECTS_DIR, selectedProject);
    fs.unlinkSync(filepath);
    console.log(banner('success', `Deleted: ${selectedProject}`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: COLORS.primary('Build the site?'),
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } else {
    console.log(banner('info', 'Deletion cancelled'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function commitAndPush() {
  console.log(section(`${ICONS.commit} Commit & Push`));
  
  const { message } = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: COLORS.bold('Commit message:'),
      validate: (input) => input.trim().length > 0 || 'Commit message is required'
    }
  ]);
  
  console.log(COLORS.muted(`\n${ICONS.info} Committing and pushing to remote...\n`));
  
  const git = (cmd) => new Promise((resolve, reject) => {
    const proc = spawn(cmd, { shell: true, cwd: SITE_DIR });
    let output = '';
    proc.stdout.on('data', (data) => output += data);
    proc.stderr.on('data', (data) => output += data);
    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `Command failed with code ${code}`));
    });
  });
  
  try {
    await git('git add -A');
    await git(`git commit -m "${message}"`);
    await git('git push');
    console.log(banner('success', 'Committed and pushed successfully!'));
  } catch (err) {
    console.log(banner('error', err.message));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

// Display header
console.log('\n' + box([
  '',
  `${ICONS.posts}  ${COLORS.bold('Content Management System')}`,
  '',
  COLORS.muted('Manage your blog posts, drafts, and projects'),
  ''
], 56, { 
  title: 'CMS',
  color: COLORS.primary,
  padding: 0 
}));

mainMenu().catch(err => {
  console.log(banner('error', `Fatal error: ${err.message}`));
  process.exit(1);
});
