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
const SITE_DIR = path.join(__dirname, '..', '..');
const EDITOR = process.env.EDITOR || 'nano';

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

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
        date: data.date,
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

function runBuild() {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow('\n🔄 Running build...\n'));
    
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: SITE_DIR,
      stdio: 'inherit',
      shell: true
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✅ Build complete!\n'));
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

async function mainMenu() {
  const posts = getPosts(POSTS_DIR);
  const drafts = getPosts(DRAFTS_DIR);
  
  const choices = [
    { name: 'Create new post', value: 'create' },
    { name: 'Edit existing post', value: 'edit' },
    { name: 'List all posts', value: 'list' },
    { name: 'Delete post', value: 'delete' },
    { name: 'Commit & Push', value: 'commit' },
  ];
  
  if (drafts.length > 0) {
    choices.push({ name: chalk.yellow(`Drafts (${drafts.length})`), value: 'drafts' });
  } else {
    choices.push({ name: 'Drafts', value: 'drafts' });
  }
  
  choices.push({ name: 'Exit', value: 'exit' });
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.cyan('📝  CMS - What would you like to do?'),
      choices
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
    case 'exit':
      console.log(chalk.gray('\n👋 Bye!\n'));
      process.exit(0);
  }
  
  await mainMenu();
}

async function createPost() {
  console.log(chalk.cyan('\n📄 Creating new post...\n'));
  
  const { isDraft } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isDraft',
      message: 'Save as draft?',
      default: false
    }
  ]);
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Title:',
      validate: (input) => input.trim().length > 0 || 'Title is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      validate: (input) => input.trim().length > 0 || 'Description is required'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, optional):',
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
    console.log(chalk.red(`\n❌ ${isDraft ? 'Draft' : 'Post'} already exists: ${filename}\n`));
    return;
  }
  
  console.log(chalk.gray(`\nOpening editor... (${EDITOR})`));
  console.log(chalk.gray('Write your post, save and close the editor.\n'));
  
  try {
    const content = await openEditor(frontmatter);
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(chalk.green(`\n✅ ${isDraft ? 'Draft' : 'Post'} saved: ${filename}\n`));
    
    if (!isDraft) {
      const { shouldBuild } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldBuild',
          message: 'Build the site?',
          default: true
        }
      ]);
      
      if (shouldBuild) {
        await runBuild();
      }
    }
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }
}

async function editPost() {
  const posts = getPosts(POSTS_DIR);
  
  if (posts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No posts found.\n'));
    return;
  }
  
  const { selectedPost } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPost',
      message: 'Select post to edit:',
      choices: posts.map(p => ({
        name: `${p.title} (${p.date})`,
        value: p.filename
      }))
    }
  ]);
  
  const filepath = path.join(POSTS_DIR, selectedPost);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  console.log(chalk.gray(`\nOpening editor... (${EDITOR})`));
  console.log(chalk.gray('Edit your post, save and close the editor.\n'));
  
  try {
    const newContent = await openEditor(content);
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(chalk.green(`\n✅ Post updated: ${selectedPost}\n`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: 'Build the site?',
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }
}

async function listPosts() {
  const posts = getPosts(POSTS_DIR);
  
  if (posts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No posts found.\n'));
    return;
  }
  
  console.log(chalk.cyan('\n📚 Your posts:\n'));
  posts.forEach((p, i) => {
    console.log(`  ${i + 1}. ${chalk.bold(p.title)}`);
    console.log(`     ${chalk.gray(p.slug)}`);
    console.log(`     ${chalk.gray(p.date)}`);
    console.log();
  });
}

async function deletePost() {
  const posts = getPosts(POSTS_DIR);
  
  if (posts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No posts to delete.\n'));
    return;
  }
  
  const { selectedPost } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPost',
      message: 'Select post to delete:',
      choices: posts.map(p => ({
        name: `${p.title} (${p.date})`,
        value: p.filename
      }))
    }
  ]);
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: `Delete ${selectedPost}?`,
      default: false
    }
  ]);
  
  if (confirmDelete) {
    const filepath = path.join(POSTS_DIR, selectedPost);
    fs.unlinkSync(filepath);
    console.log(chalk.green(`\n✅ Deleted: ${selectedPost}\n`));
    
    const { shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: 'Build the site?',
        default: true
      }
    ]);
    
    if (shouldBuild) {
      await runBuild();
    }
  } else {
    console.log(chalk.gray('\nCancelled.\n'));
  }
}

async function draftsMenu() {
  const drafts = getPosts(DRAFTS_DIR);
  
  if (drafts.length === 0) {
    console.log(chalk.yellow('\n⚠️  No drafts found.\n'));
    return;
  }
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.yellow('📝  Drafts'),
      choices: [
        { name: 'Edit draft', value: 'edit' },
        { name: 'Publish draft', value: 'publish' },
        { name: 'Delete draft', value: 'delete' },
        { name: 'Back', value: 'back' }
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
}

async function editDraft() {
  const drafts = getPosts(DRAFTS_DIR);
  
  const { selectedDraft } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDraft',
      message: 'Select draft to edit:',
      choices: drafts.map(d => ({
        name: `${d.title} (${d.date})`,
        value: d.filename
      }))
    }
  ]);
  
  const filepath = path.join(DRAFTS_DIR, selectedDraft);
  const content = fs.readFileSync(filepath, 'utf-8');
  
  console.log(chalk.gray(`\nOpening editor... (${EDITOR})`));
  console.log(chalk.gray('Edit your draft, save and close the editor.\n'));
  
  try {
    const newContent = await openEditor(content);
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log(chalk.green(`\n✅ Draft updated: ${selectedDraft}\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }
}

async function publishDraft() {
  const drafts = getPosts(DRAFTS_DIR);
  
  const { selectedDraft } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDraft',
      message: 'Select draft to publish:',
      choices: drafts.map(d => ({
        name: `${d.title} (${d.date})`,
        value: d.filename
      }))
    }
  ]);
  
  const draftPath = path.join(DRAFTS_DIR, selectedDraft);
  const postPath = path.join(POSTS_DIR, selectedDraft);
  
  if (fs.existsSync(postPath)) {
    console.log(chalk.red(`\n❌ A post with this name already exists. Delete it first or rename the draft.\n`));
    return;
  }
  
  const content = fs.readFileSync(draftPath, 'utf-8');
  fs.writeFileSync(postPath, content, 'utf-8');
  fs.unlinkSync(draftPath);
  
  console.log(chalk.green(`\n✅ Draft published: ${selectedDraft}\n`));
  
  const { shouldBuild } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldBuild',
      message: 'Build the site?',
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
      message: 'Select draft to delete:',
      choices: drafts.map(d => ({
        name: `${d.title} (${d.date})`,
        value: d.filename
      }))
    }
  ]);
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: `Delete ${selectedDraft}?`,
      default: false
    }
  ]);
  
  if (confirmDelete) {
    const filepath = path.join(DRAFTS_DIR, selectedDraft);
    fs.unlinkSync(filepath);
    console.log(chalk.green(`\n✅ Deleted: ${selectedDraft}\n`));
  } else {
    console.log(chalk.gray('\nCancelled.\n'));
  }
}

async function commitAndPush() {
  const { message } = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: 'Commit message:',
      validate: (input) => input.trim().length > 0 || 'Commit message is required'
    }
  ]);
  
  console.log(chalk.gray('\n📦 Committing and pushing...\n'));
  
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
    console.log(chalk.green('\n✅ Committed and pushed!\n'));
  } catch (err) {
    console.log(chalk.red(`\n❌ ${err.message}\n`));
  }
}

async function checkDependencies() {
}

console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║     🖊️  Local CMS for Your Blog       ║
╚═══════════════════════════════════════╝
`));

checkDependencies();
mainMenu().catch(err => {
  console.error(chalk.red(`\n❌ Fatal error: ${err.message}`));
  process.exit(1);
});
