require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const transcripts = require('./transcripts');
const { getVideoRoadmap, fetchTranscript, extractVideoId } = require('./youtube-service');

// Read Supabase credentials from process.env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const app = express();
const PORT = process.env.PORT || 3000;
let currentAiProvider = process.env.AI_PROVIDER || 'groq';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Set up directory for dynamic transcripts and metadata
const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts_cache');
const METADATA_PATH = path.join(TRANSCRIPTS_DIR, 'metadata.json');

// Ensure directory and metadata file exist
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}
if (!fs.existsSync(METADATA_PATH)) {
  fs.writeFileSync(METADATA_PATH, JSON.stringify([]));
}

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Reads metadata file helper
 */
function readMetadata() {
  try {
    const rawData = fs.readFileSync(METADATA_PATH, 'utf8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error('Error reading metadata file:', err);
    return [];
  }
}

/**
 * Writes metadata file helper
 */
function writeMetadata(data) {
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing metadata file:', err);
  }
}

/**
 * POST /add-video
 * Paste YouTube URL, extract topics/chapters and transcript, save it, and return.
 */
app.post('/add-video', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ error: 'YouTube URL parameter is required' });
  }

  try {
    // 1. Check if video is already added
    const currentVideos = readMetadata();
    const videoIdRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(videoIdRegex);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    const existingVideo = currentVideos.find(v => v.videoId === videoId);
    if (existingVideo) {
      console.log(`[Server] Video ID ${videoId} already exists in database. Returning stored version.`);
      return res.json(existingVideo);
    }

    // 2. Fetch and generate roadmap from YouTube Service
    console.log(`[Server] Parsing video roadmap for: ${url} using provider: ${currentAiProvider}`);
    const roadmap = await getVideoRoadmap(url, currentAiProvider);

    // 3. Save transcript segments for search capability
    if (roadmap.transcriptSegments && roadmap.transcriptSegments.length > 0) {
      const transcriptFilePath = path.join(TRANSCRIPTS_DIR, `${roadmap.videoId}.json`);
      fs.writeFileSync(transcriptFilePath, JSON.stringify(roadmap.transcriptSegments, null, 2), 'utf8');
      console.log(`[Server] Stored transcript for ${roadmap.videoId} to ${transcriptFilePath}`);
    }

    // 4. Save video entry in metadata (remove transcriptSegments field to keep metadata file small)
    const newVideoEntry = {
      videoId: roadmap.videoId,
      title: roadmap.title,
      channelTitle: roadmap.channelTitle,
      thumbnail: roadmap.thumbnail,
      parsedFromDescription: roadmap.parsedFromDescription,
      chapters: roadmap.chapters,
      addedAt: new Date().toISOString()
    };

    currentVideos.push(newVideoEntry);
    writeMetadata(currentVideos);

    return res.json(newVideoEntry);
  } catch (err) {
    console.error('[Server] Error adding video:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while adding the video' });
  }
});

/**
 * GET /videos
 * Returns all added YouTube roadmap courses
 */
app.get('/videos', (req, res) => {
  const currentVideos = readMetadata();
  return res.json(currentVideos);
});

/**
 * DELETE /video/:id
 * Removes a course and its saved transcript
 */
app.delete('/video/:id', (req, res) => {
  const { id } = req.params;
  let currentVideos = readMetadata();
  
  const videoExists = currentVideos.some(v => v.videoId === id);
  if (!videoExists) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Filter out the video
  currentVideos = currentVideos.filter(v => v.videoId !== id);
  writeMetadata(currentVideos);

  // Delete transcript file
  const transcriptFilePath = path.join(TRANSCRIPTS_DIR, `${id}.json`);
  if (fs.existsSync(transcriptFilePath)) {
    try {
      fs.unlinkSync(transcriptFilePath);
    } catch (err) {
      console.error(`Error deleting transcript file ${transcriptFilePath}:`, err);
    }
  }

  return res.json({ success: true, message: `Removed video ${id}` });
});

/**
 * POST /search-transcript
 * Searches static seeded transcripts AND dynamically added video transcripts
 */
app.post('/search-transcript', (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required and must be a string' });
  }

  const cleanQuery = query.toLowerCase().trim();
  let bestMatch = null;
  let maxScore = 0;

  // 1. Search through static seeded transcripts
  for (const courseObj of transcripts) {
    for (const segment of courseObj.segments) {
      const text = segment.text.toLowerCase();
      
      let score = 0;
      if (text.includes(cleanQuery)) {
        score += 100;
      }
      
      const queryWords = cleanQuery.split(/\s+/);
      queryWords.forEach(word => {
        if (word.length > 2 && text.includes(word)) {
          score += 10;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        const timeParam = segment.seconds ? `&t=${segment.seconds}s` : '';
        const fullUrl = `${courseObj.youtubeUrl}${timeParam}`;
        
        bestMatch = {
          videoTitle: courseObj.videoTitle,
          courseName: courseObj.course,
          timestamp: segment.timestamp,
          seconds: segment.seconds,
          youtubeUrl: fullUrl,
          matchText: segment.text
        };
      }
    }
  }

  // 2. Search through dynamically added video transcripts
  const currentVideos = readMetadata();
  for (const video of currentVideos) {
    const transcriptFilePath = path.join(TRANSCRIPTS_DIR, `${video.videoId}.json`);
    
    if (fs.existsSync(transcriptFilePath)) {
      try {
        const rawTranscript = fs.readFileSync(transcriptFilePath, 'utf8');
        const segments = JSON.parse(rawTranscript);

        for (const segment of segments) {
          const text = segment.text.toLowerCase();
          
          let score = 0;
          if (text.includes(cleanQuery)) {
            score += 100;
          }
          
          const queryWords = cleanQuery.split(/\s+/);
          queryWords.forEach(word => {
            if (word.length > 2 && text.includes(word)) {
              score += 10;
            }
          });

          if (score > maxScore) {
            maxScore = score;
            const timeParam = segment.seconds ? `&t=${segment.seconds}s` : '';
            const fullUrl = `https://www.youtube.com/watch?v=${video.videoId}${timeParam}`;
            
            bestMatch = {
              videoTitle: video.title,
              courseName: video.channelTitle,
              timestamp: segment.timestamp,
              seconds: segment.seconds,
              youtubeUrl: fullUrl,
              matchText: segment.text
            };
          }
        }
      } catch (err) {
        console.error(`Error searching transcript for video ${video.videoId}:`, err);
      }
    }
  }

  if (bestMatch && maxScore > 0) {
    return res.json(bestMatch);
  } else {
    return res.status(404).json({
      error: 'No matching segment found for your query. Try searching for other terms or add more videos.'
    });
  }
});

/**
 * GET /settings
 * Returns the current active AI provider
 */
app.get('/settings', (req, res) => {
  res.json({ aiProvider: currentAiProvider });
});

/**
 * POST /settings
 * Updates the current active AI provider
 */
app.post('/settings', (req, res) => {
  const { aiProvider } = req.body;
  if (aiProvider === 'groq' || aiProvider === 'gemini') {
    currentAiProvider = aiProvider;
    console.log(`[Server] AI Provider switched to: ${currentAiProvider}`);
    return res.json({ success: true, aiProvider: currentAiProvider });
  }
  return res.status(400).json({ error: "Invalid AI provider. Must be 'groq' or 'gemini'." });
});

/**
 * GET /health
 * Simple health indicator showing total courses seeded and added
 */
app.get('/health', (req, res) => {
  const currentVideos = readMetadata();
  res.json({ 
    status: 'ok', 
    staticCoursesSeeded: transcripts.length,
    dynamicVideosAdded: currentVideos.length 
  });
});

/**
 * Helper to fetch video title via oEmbed
 */
async function getTitleViaOEmbed(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return data.title || 'YouTube Video';
    }
  } catch (err) {
    console.error('oEmbed fetch failed for title:', err);
  }
  return 'YouTube Video';
}

/**
 * POST /api/search-transcript
 * Searches user-saved YouTube videos transcripts dynamically
 */
app.post('/api/search-transcript', async (req, res) => {
  const { query, urls } = req.body;
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'At least one YouTube URL is required' });
  }

  const cleanQuery = query.toLowerCase().trim();
  const allMatches = [];

  try {
    for (const url of urls) {
      const videoId = extractVideoId(url);
      if (!videoId) continue;

      console.log(`[Search-Transcript API] Fetching transcript for video: ${videoId}`);
      const segments = await fetchTranscript(videoId);
      if (!segments || segments.length === 0) continue;

      const videoTitle = await getTitleViaOEmbed(url);

      for (const segment of segments) {
        const text = segment.text.toLowerCase();
        let score = 0;

        if (text.includes(cleanQuery)) {
          score += 100;
        }

        const queryWords = cleanQuery.split(/\s+/);
        queryWords.forEach(word => {
          if (word.length > 2 && text.includes(word)) {
            score += 10;
          }
        });

        if (score > 0) {
          allMatches.push({
            score,
            videoTitle,
            matchText: segment.text,
            timestamp: segment.timestamp,
            seconds: segment.seconds,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}&t=${segment.seconds}s`
          });
        }
      }
    }

    // Sort matches by score desc
    allMatches.sort((a, b) => b.score - a.score);

    // Get top 3
    const top3 = allMatches.slice(0, 3).map(m => ({
      videoTitle: m.videoTitle,
      matchText: m.matchText,
      timestamp: m.timestamp,
      youtubeUrl: m.youtubeUrl
    }));

    if (top3.length === 0) {
      return res.status(404).json({ error: 'No matching context found in the transcripts.' });
    }

    return res.json(top3);
  } catch (err) {
    console.error('Error in search transcript API:', err);
    return res.status(500).json({ error: 'An error occurred while searching transcripts.' });
  }
});

app.listen(PORT, () => {
  console.log(`CodePath Backend Server running on port ${PORT}`);
});
