/**
 * CODEPATH MULTI-TRACK ROADMAP SEED SCRIPT
 * 
 * Seeding script that fetches, parses, and inserts topics
 * for all 4 tracks (frontend, projects, reading, backend) into Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables if .env exists
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxtsuagcuyjspyhyhxdz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dHN1YWdjdXlqc3B5aHloeGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDc4NDUsImV4cCI6MjA5NzQyMzg0NX0.6zGWM782kE2HezROUA646wc9AGxVg0VyumvdnbvtYDM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Source URLs
const FRONTEND_PRIMARY_URL = 'https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master/src/data/roadmaps/frontend/frontend.json';
const FRONTEND_FALLBACK_URL = 'https://raw.githubusercontent.com/nilbuild/developer-roadmap/master/src/data/roadmaps/frontend/frontend.json';
const PROJECTS_README_URL = 'https://raw.githubusercontent.com/codecrafters-io/build-your-own-x/master/README.md';
const READING_README_URL = 'https://raw.githubusercontent.com/mtdvio/every-programmer-should-know/master/README.md';
const BACKEND_README_URL = 'https://raw.githubusercontent.com/donnemartin/system-design-primer/master/README.md';

/**
 * Helper to slugify section titles for IDs
 */
function makeSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '_');
}

/**
 * Fetch helper for JSON
 */
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return await response.json();
}

/**
 * Seeding function for Frontend Track (developer-roadmap)
 */
async function seedFrontend() {
  console.log('\n--- [Frontend Track] Starting Seeding ---');
  let data;
  try {
    console.log(`Fetching frontend data from primary URL: ${FRONTEND_PRIMARY_URL}`);
    data = await fetchJSON(FRONTEND_PRIMARY_URL);
  } catch (error) {
    console.warn(`Primary URL failed: ${error.message}. Trying fallback URL...`);
    data = await fetchJSON(FRONTEND_FALLBACK_URL);
  }

  console.log('Ensuring "frontend" track exists in tracks table...');
  const { error: trackError } = await supabase
    .from('tracks')
    .upsert({
      id: 'frontend',
      title: 'Frontend Developer',
      track_type: 'frontend',
      source_repo: 'kamranahmedse/developer-roadmap'
    });

  if (trackError) throw trackError;

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const topicNodes = nodes.filter(n => n.type === 'topic');
  const subtopicNodes = nodes.filter(n => n.type === 'subtopic');

  // Maintain original vertical layout order
  topicNodes.sort((a, b) => a.position.y - b.position.y);

  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (adj[e.target]) adj[e.target].push(e.source);
  });

  const subtopicToTopic = new Map();
  topicNodes.forEach(topic => {
    const queue = [topic.id];
    const visited = new Set([topic.id]);
    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = adj[curr] || [];
      neighbors.forEach(neighborId => {
        if (visited.has(neighborId)) return;
        visited.add(neighborId);
        const neighborNode = nodes.find(n => n.id === neighborId);
        if (neighborNode && neighborNode.type === 'subtopic') {
          subtopicToTopic.set(neighborId, topic.id);
          queue.push(neighborId);
        }
      });
    }
  });

  const unassigned = subtopicNodes.filter(s => !subtopicToTopic.has(s.id));
  unassigned.forEach(s => {
    let closestTopic = null;
    let minDistance = Infinity;
    topicNodes.forEach(t => {
      const dx = Math.abs(s.position.x - t.position.x);
      const dy = Math.abs(s.position.y - t.position.y);
      if (dx < 100 && dy < minDistance) {
        minDistance = dy;
        closestTopic = t;
      }
    });
    if (!closestTopic) {
      let minGlobalDist = Infinity;
      topicNodes.forEach(t => {
        const dx = s.position.x - t.position.x;
        const dy = s.position.y - t.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minGlobalDist) {
          minGlobalDist = dist;
          closestTopic = t;
        }
      });
    }
    if (closestTopic) {
      subtopicToTopic.set(s.id, closestTopic.id);
    }
  });

  const topicsToInsert = topicNodes.map((t, index) => {
    const subtopicsList = [];
    subtopicToTopic.forEach((topicId, subtopicId) => {
      if (topicId === t.id) {
        const subtopicNode = subtopicNodes.find(s => s.id === subtopicId);
        if (subtopicNode) {
          subtopicsList.push({
            id: subtopicNode.id,
            title: subtopicNode.data?.label || '',
            order_index: subtopicsList.length
          });
        }
      }
    });

    const resourcesList = (t.data?.resources || []).map((r, rIdx) => ({
      title: r.title,
      url: r.url,
      order_index: rIdx
    }));

    return {
      id: t.id,
      track_id: 'frontend',
      title: t.data.label,
      order_index: index,
      subtopics: JSON.stringify(subtopicsList),
      resources: JSON.stringify(resourcesList)
    };
  });

  console.log('Cleaning up existing topics for "frontend" track...');
  await supabase.from('topics').delete().eq('track_id', 'frontend');

  console.log(`Inserting ${topicsToInsert.length} new topics into topics table...`);
  const { error: insertError } = await supabase.from('topics').insert(topicsToInsert);
  if (insertError) throw insertError;

  console.log('--- [Frontend Track] Seeding Completed Successfully ---');
}

/**
 * Seeding function for Projects Track (build-your-own-x)
 */
async function seedProjects() {
  console.log('\n--- [Projects Track] Starting Seeding ---');
  console.log(`Fetching build-your-own-x README from: ${PROJECTS_README_URL}`);
  const response = await fetch(PROJECTS_README_URL);
  if (!response.ok) throw new Error(`HTTP error fetching projects: ${response.status}`);
  const text = await response.text();

  console.log('Ensuring "projects" track exists in tracks table...');
  const { error: trackError } = await supabase
    .from('tracks')
    .upsert({
      id: 'projects',
      title: 'Project-Based Learning',
      track_type: 'projects',
      source_repo: 'codecrafters-io/build-your-own-x'
    });

  if (trackError) throw trackError;

  const lines = text.split(/\r?\n/);
  const topics = [];
  let currentTopic = null;
  let subtopicIndex = 0;

  for (const line of lines) {
    // Match header: #### Build your own `Category`
    const headerMatch = line.match(/^####\s+Build\s+your\s+own\s+[`']?([^`'\r\n]+)[`']?/i);
    if (headerMatch) {
      if (currentTopic && currentTopic.subtopics.length > 0) {
        topics.push(currentTopic);
      }
      const categoryName = headerMatch[1].trim();
      currentTopic = {
        id: 'projects_' + makeSlug(categoryName),
        track_id: 'projects',
        title: categoryName,
        subtopics: [],
        resources: []
      };
      subtopicIndex = 0;
      continue;
    }

    // Match bullet point project tutorials: * [**Language**: _Project_](URL)
    const bulletMatch = line.match(/^[\*\-]\s+\[\*\*([^*:]+)\*\*:\s*_(.*)_\]\(([^)]+)\)/);
    if (bulletMatch && currentTopic) {
      const language = bulletMatch[1].trim();
      const projectTitle = bulletMatch[2].trim();
      const url = bulletMatch[3].trim();

      const displayTitle = `[${language}] ${projectTitle}`;
      const subId = `${currentTopic.id}_sub_${subtopicIndex}`;

      currentTopic.subtopics.push({
        id: subId,
        title: displayTitle,
        order_index: subtopicIndex
      });

      currentTopic.resources.push({
        title: displayTitle,
        url: url,
        order_index: subtopicIndex
      });

      subtopicIndex++;
    }
  }

  if (currentTopic && currentTopic.subtopics.length > 0) {
    topics.push(currentTopic);
  }

  const topicsToInsert = topics.map((t, idx) => ({
    id: t.id,
    track_id: t.track_id,
    title: t.title,
    order_index: idx,
    subtopics: JSON.stringify(t.subtopics),
    resources: JSON.stringify(t.resources)
  }));

  console.log('Cleaning up existing topics for "projects" track...');
  await supabase.from('topics').delete().eq('track_id', 'projects');

  console.log(`Inserting ${topicsToInsert.length} new topics into topics table...`);
  const { error: insertError } = await supabase.from('topics').insert(topicsToInsert);
  if (insertError) throw insertError;

  console.log('--- [Projects Track] Seeding Completed Successfully ---');
}

/**
 * Seeding function for Reading Track (every-programmer-should-know)
 */
async function seedReading() {
  console.log('\n--- [Reading Track] Starting Seeding ---');
  console.log(`Fetching every-programmer-should-know README from: ${READING_README_URL}`);
  const response = await fetch(READING_README_URL);
  if (!response.ok) throw new Error(`HTTP error fetching reading: ${response.status}`);
  const text = await response.text();

  console.log('Ensuring "reading" track exists in tracks table...');
  const { error: trackError } = await supabase
    .from('tracks')
    .upsert({
      id: 'reading',
      title: 'Every Programmer Should Know',
      track_type: 'reading',
      source_repo: 'mtdvio/every-programmer-should-know'
    });

  if (trackError) throw trackError;

  const lines = text.split(/\r?\n/);
  const topics = [];
  let currentTopic = null;
  let subtopicIndex = 0;

  for (const line of lines) {
    // Match H3 section headers
    const headerMatch = line.match(/^###\s+([^:\r\n*#\-:\[]+)/);
    if (headerMatch) {
      const sectionName = headerMatch[1].trim();
      // Skip meta sections
      if (
        sectionName.toLowerCase().includes('star') ||
        sectionName.toLowerCase().includes('contribution') ||
        sectionName.toLowerCase().includes('measure') ||
        sectionName.toLowerCase().includes('take a free') ||
        sectionName === ''
      ) {
        continue;
      }

      if (currentTopic && currentTopic.subtopics.length > 0) {
        topics.push(currentTopic);
      }

      currentTopic = {
        id: 'reading_' + makeSlug(sectionName),
        track_id: 'reading',
        title: sectionName,
        subtopics: [],
        resources: []
      };
      subtopicIndex = 0;
      continue;
    }

    // Match bullet points with links, skipping emojis safely
    const bulletMatch = line.match(/^-\s+(?:[^\[]*\s+)?\[([^\]]+)\]\(([^)]+)\)/);
    if (bulletMatch && currentTopic) {
      const linkTitle = bulletMatch[1].trim();
      const url = bulletMatch[2].trim();
      const subId = `${currentTopic.id}_sub_${subtopicIndex}`;

      currentTopic.subtopics.push({
        id: subId,
        title: linkTitle,
        order_index: subtopicIndex
      });

      currentTopic.resources.push({
        title: linkTitle,
        url: url,
        order_index: subtopicIndex
      });

      subtopicIndex++;
    }
  }

  if (currentTopic && currentTopic.subtopics.length > 0) {
    topics.push(currentTopic);
  }

  const topicsToInsert = topics.map((t, idx) => ({
    id: t.id,
    track_id: t.track_id,
    title: t.title,
    order_index: idx,
    subtopics: JSON.stringify(t.subtopics),
    resources: JSON.stringify(t.resources)
  }));

  console.log('Cleaning up existing topics for "reading" track...');
  await supabase.from('topics').delete().eq('track_id', 'reading');

  console.log(`Inserting ${topicsToInsert.length} new topics into topics table...`);
  const { error: insertError } = await supabase.from('topics').insert(topicsToInsert);
  if (insertError) throw insertError;

  console.log('--- [Reading Track] Seeding Completed Successfully ---');
}

/**
 * Seeding function for Backend Track (system-design-primer)
 */
async function seedBackend() {
  console.log('\n--- [Backend Track] Starting Seeding ---');
  console.log(`Fetching system-design-primer README from: ${BACKEND_README_URL}`);
  const response = await fetch(BACKEND_README_URL);
  if (!response.ok) throw new Error(`HTTP error fetching backend: ${response.status}`);
  const text = await response.text();

  console.log('Ensuring "backend" track exists in tracks table...');
  const { error: trackError } = await supabase
    .from('tracks')
    .upsert({
      id: 'backend',
      title: 'System Design Primer',
      track_type: 'backend',
      source_repo: 'donnemartin/system-design-primer'
    });

  if (trackError) throw trackError;

  const lines = text.split(/\r?\n/);
  let indexStart = -1;
  let indexEnd = -1;

  // Locate the index block bounds
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^##\s+Index\s+of\s+system\s+design\s+topics/i)) {
      indexStart = i + 1;
    }
    if (indexStart !== -1 && i > indexStart && line.match(/^##\s+/)) {
      indexEnd = i;
      break;
    }
  }

  if (indexStart === -1 || indexEnd === -1) {
    throw new Error('Failed to find system design primer index boundaries in README');
  }

  const indexLines = lines.slice(indexStart, indexEnd);
  const topics = [];
  let currentTopic = null;
  let subtopicIndex = 0;

  for (const line of indexLines) {
    // Topic: bullet point at zero-indentation (e.g. * [Performance vs scalability](#performance-vs-scalability))
    const topicMatch = line.match(/^[\*\-]\s+\[([^\]]+)\]\(#([^)]+)\)/);
    if (topicMatch) {
      if (currentTopic && currentTopic.subtopics.length > 0) {
        topics.push(currentTopic);
      }
      const topicTitle = topicMatch[1].trim();
      const anchor = topicMatch[2].trim();

      if (topicTitle.toLowerCase().includes('start here')) {
        currentTopic = null;
        continue;
      }

      currentTopic = {
        id: 'backend_' + makeSlug(topicTitle),
        track_id: 'backend',
        title: topicTitle,
        subtopics: [],
        resources: [
          {
            title: `${topicTitle} (GitHub Guide)`,
            url: `https://github.com/donnemartin/system-design-primer#${anchor}`,
            order_index: 0
          }
        ]
      };
      subtopicIndex = 0;
      continue;
    }

    // Subtopic: indented bullet point (e.g.     * [CAP theorem](#cap-theorem))
    const subtopicMatch = line.match(/^\s+[\*\-]\s+\[([^\]]+)\]\(#([^)]+)\)/);
    if (subtopicMatch && currentTopic) {
      const subtopicTitle = subtopicMatch[1].trim();
      const anchor = subtopicMatch[2].trim();
      const subId = `${currentTopic.id}_sub_${subtopicIndex}`;

      currentTopic.subtopics.push({
        id: subId,
        title: subtopicTitle,
        order_index: subtopicIndex
      });

      currentTopic.resources.push({
        title: subtopicTitle,
        url: `https://github.com/donnemartin/system-design-primer#${anchor}`,
        order_index: subtopicIndex + 1
      });

      subtopicIndex++;
    }
  }

  if (currentTopic && currentTopic.subtopics.length > 0) {
    topics.push(currentTopic);
  }

  const topicsToInsert = topics.map((t, idx) => ({
    id: t.id,
    track_id: t.track_id,
    title: t.title,
    order_index: idx,
    subtopics: JSON.stringify(t.subtopics),
    resources: JSON.stringify(t.resources)
  }));

  console.log('Cleaning up existing topics for "backend" track...');
  await supabase.from('topics').delete().eq('track_id', 'backend');

  console.log(`Inserting ${topicsToInsert.length} new topics into topics table...`);
  const { error: insertError } = await supabase.from('topics').insert(topicsToInsert);
  if (insertError) throw insertError;

  console.log('--- [Backend Track] Seeding Completed Successfully ---');
}

/**
 * Main seeding runner
 */
async function seedAll() {
  console.log('🚀 INITIALIZING MULTI-TRACK DATABASE SEEDING 🚀');
  try {
    await seedFrontend();
    await seedProjects();
    await seedReading();
    await seedBackend();
    console.log('\n✨ Database seeding completed successfully for all 4 tracks! ✨');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal: Database seeding failed!', error);
    process.exit(1);
  }
}

seedAll();
