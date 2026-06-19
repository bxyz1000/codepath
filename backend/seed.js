/**
 * CODEPATH ROADMAP SEED SCRIPT
 * 
 * Instructions on how to run:
 * 1. Open your terminal.
 * 2. Navigate to the backend directory:
 *    cd backend
 * 3. Install the Supabase client dependency:
 *    npm install @supabase/supabase-js
 * 4. Run the seed script:
 *    node seed.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxtsuagcuyjspyhyhxdz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dHN1YWdjdXlqc3B5aHloeGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDc4NDUsImV4cCI6MjA5NzQyMzg0NX0.6zGWM782kE2HezROUA646wc9AGxVg0VyumvdnbvtYDM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRIMARY_URL = 'https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master/src/data/roadmaps/frontend/frontend.json';
const FALLBACK_URL = 'https://raw.githubusercontent.com/nilbuild/developer-roadmap/master/src/data/roadmaps/frontend/frontend.json';

async function seed() {
  console.log('Starting seed process...');
  
  // 1. Fetch JSON data
  let data;
  try {
    console.log(`Fetching from primary URL: ${PRIMARY_URL}`);
    const response = await fetch(PRIMARY_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    data = await response.json();
    console.log('Successfully fetched from primary URL.');
  } catch (error) {
    console.warn(`Primary URL fetch failed: ${error.message}. Trying fallback URL...`);
    try {
      const response = await fetch(FALLBACK_URL);
      if (!response.ok) {
        throw new Error(`HTTP error on fallback! Status: ${response.status}`);
      }
      data = await response.json();
      console.log('Successfully fetched from fallback URL.');
    } catch (fallbackError) {
      console.error('Fatal: Fallback URL also failed.', fallbackError);
      process.exit(1);
    }
  }

  // 2. Ensure "frontend" track exists in tracks table
  console.log('Ensuring "frontend" track exists in tracks table...');
  const { error: trackError } = await supabase
    .from('tracks')
    .upsert({
      id: 'frontend',
      title: 'Frontend Developer',
      track_type: 'frontend',
      source_repo: 'kamranahmedse/developer-roadmap'
    });

  if (trackError) {
    console.error('Error inserting track:', trackError);
    process.exit(1);
  }
  console.log('"frontend" track verified.');

  // 3. Parse topics and subtopics from React Flow diagram structure
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const topicNodes = nodes.filter(n => n.type === 'topic');
  const subtopicNodes = nodes.filter(n => n.type === 'subtopic');

  // Sort topics by Y position to maintain chronological roadmap order
  topicNodes.sort((a, b) => a.position.y - b.position.y);

  console.log(`Processing ${topicNodes.length} topics and ${subtopicNodes.length} subtopics...`);

  // Build adjacency list for edge traversal
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (adj[e.target]) adj[e.target].push(e.source);
  });

  const subtopicToTopic = new Map();

  // Find reachable subtopics from each topic via edges
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

  // Assign any leftover subtopics using column-proximity fallback
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
      // Global Euclidean fallback
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

  // Group subtopics and map resources
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

    // Map resources if defined in the nodes
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

  // 4. Delete existing topics under "frontend" track to avoid conflicts
  console.log('Cleaning up existing topics for "frontend" track...');
  const { error: deleteError } = await supabase
    .from('topics')
    .delete()
    .eq('track_id', 'frontend');

  if (deleteError) {
    console.error('Error during cleanup:', deleteError);
    process.exit(1);
  }

  // 5. Insert new topics
  console.log(`Inserting ${topicsToInsert.length} new topics into topics table...`);
  const { error: insertError } = await supabase
    .from('topics')
    .insert(topicsToInsert);

  if (insertError) {
    console.error('Error seeding topics:', insertError);
    process.exit(1);
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed();
