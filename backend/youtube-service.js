require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { YoutubeTranscript } = require('youtube-transcript');

const YT_API_KEY = process.env.YT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Extracts the 11-character video ID from a YouTube URL
 */
function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Converts "MM:SS" or "HH:MM:SS" into total seconds
 */
function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Converts total seconds to a "MM:SS" or "HH:MM:SS" string
 */
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parses chapter milestones from video description using RegExp patterns
 */
function parseChaptersFromDescription(description) {
  if (!description) return [];
  const lines = description.split('\n');
  const chapters = [];
  
  // RegExp looking for timestamps, e.g. "01:23:45", "05:12", "[12:34]" followed by title
  const timeRegex = /(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)(?:\])?[\s-:]*(.+)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const timestamp = match[1];
      const title = match[2].trim();
      const seconds = timestampToSeconds(timestamp);
      
      // Filter out invalid/empty titles or lines that look like generic timestamped comments
      if (title.length > 2 && title.length < 80) {
        chapters.push({
          title,
          timestamp,
          seconds
        });
      }
    }
  }

  if (chapters.length > 0) {
    // Sort chronologically by start time
    chapters.sort((a, b) => a.seconds - b.seconds);
  }
  
  return chapters;
}

/**
 * Fetches video metadata (title, description, channel) from YouTube API
 */
async function fetchVideoDetails(videoId) {
  if (!YT_API_KEY) {
    throw new Error("Missing YouTube Data API Key (YT_API_KEY)");
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`YouTube API returned HTTP ${response.status}: ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Video with ID ${videoId} not found on YouTube`);
  }

  const snippet = data.items[0].snippet;
  return {
    title: snippet.title,
    description: snippet.description,
    channelTitle: snippet.channelTitle,
    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url
  };
}

/**
 * Fetches transcript from YouTube
 */
async function fetchTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    // Normalize format to include seconds and clean text
    return segments.map(s => ({
      text: s.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\n/g, ' '),
      seconds: Math.floor(s.offset / 1000), // offset is in ms
      timestamp: formatTime(Math.floor(s.offset / 1000))
    }));
  } catch (err) {
    console.warn(`[YouTubeService] Transcript fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Groups raw transcript segments dynamically to keep payload size small and within API token limits
 */
function groupSegments(segments) {
  if (!segments || segments.length === 0) return [];
  
  const totalDuration = segments[segments.length - 1].seconds - segments[0].seconds;
  // Target around 50 groups for the model to extract from
  const interval = Math.max(30, Math.floor(totalDuration / 50));
  
  const grouped = [];
  let currentGroup = null;
  
  for (const seg of segments) {
    if (!currentGroup || (seg.seconds - currentGroup.seconds > interval)) {
      if (currentGroup) grouped.push(currentGroup);
      currentGroup = {
        seconds: seg.seconds,
        timestamp: seg.timestamp,
        text: seg.text
      };
    } else {
      currentGroup.text += ' ' + seg.text;
    }
  }
  if (currentGroup) grouped.push(currentGroup);
  
  return grouped;
}

/**
 * Uses Gemini API to extract milestones from a raw transcript
 */
async function generateChaptersWithGemini(videoTitle, segments) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key (GEMINI_API_KEY) for transcript processing");
  }

  const grouped = groupSegments(segments);
  const transcriptText = grouped.map(s => `[${s.timestamp}] ${s.text}`).join('\n');

  const prompt = `
You are an AI assistant helping a student build a structured learning roadmap from a YouTube video transcript.
The video title is: "${videoTitle}"

Analyze the following transcript of this tutorial video and extract 5 to 12 logical milestones/chapters.
For each milestone, determine the exact topic title and the start time.
Ensure the milestones:
1. Are ordered chronologically by start time.
2. Cover the major sections/concepts in the video.
3. Have concise, clean, descriptive titles (e.g. "Introduction to Variables", "Setting Up Express Middleware", "Writing Database Queries").

Here is the timestamped transcript:
${transcriptText.substring(0, 15000)} // safe limit of ~15k characters

Output the result strictly as a JSON array of objects with the following format:
[
  {
    "title": "Topic Title",
    "timestamp": "MM:SS" or "HH:MM:SS",
    "seconds": 120
  }
]
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const chapters = JSON.parse(textResponse);

    if (Array.isArray(chapters)) {
      return chapters.map(c => ({
        title: c.title,
        timestamp: c.timestamp || formatTime(c.seconds || 0),
        seconds: c.seconds !== undefined ? Number(c.seconds) : timestampToSeconds(c.timestamp || '0:00')
      }));
    }
    throw new Error("Gemini did not return an array of chapters");
  } catch (err) {
    console.error("Gemini chapter generation failed:", err);
    throw new Error(`Failed to generate chapters via Gemini AI: ${err.message}`);
  }
}

/**
 * Uses Groq API to extract milestones from a raw transcript
 */
async function generateChaptersWithGroq(videoTitle, segments) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing Groq API Key (GROQ_API_KEY) for transcript processing");
  }

  const grouped = groupSegments(segments);
  const transcriptText = grouped.map(s => `[${s.timestamp}] ${s.text}`).join('\n');

  const systemPrompt = `You are an AI assistant helping a student build a structured learning roadmap from a YouTube video transcript.
Analyze the transcript and extract 5 to 12 logical milestones/chapters.
For each milestone, determine the exact topic title and the start time.
Ensure the milestones:
1. Are ordered chronologically by start time.
2. Cover the major sections/concepts in the video.
3. Have concise, clean, descriptive titles (e.g. "Introduction to Variables", "Setting Up Express Middleware", "Writing Database Queries").

You MUST output the result strictly as a JSON object containing a "chapters" key, which holds an array of objects matching this exact structure:
{
  "chapters": [
    {
      "title": "Topic Title",
      "timestamp": "MM:SS" or "HH:MM:SS",
      "seconds": 120
    }
  ]
}`;

  const userPrompt = `Video Title: "${videoTitle}"

Here is the timestamped transcript:
${transcriptText.substring(0, 15000)}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Groq API returned HTTP ${response.status}: ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    const textResponse = data.choices[0].message.content;
    const parsed = JSON.parse(textResponse);
    const chapters = parsed.chapters;

    if (Array.isArray(chapters)) {
      return chapters.map(c => ({
        title: c.title,
        timestamp: c.timestamp || formatTime(c.seconds || 0),
        seconds: c.seconds !== undefined ? Number(c.seconds) : timestampToSeconds(c.timestamp || '0:00')
      }));
    }
    throw new Error("Groq response did not contain an array under the 'chapters' key");
  } catch (err) {
    console.error("Groq chapter generation failed:", err);
    throw new Error(`Failed to generate chapters via Groq AI: ${err.message}`);
  }
}

/**
 * Main coordinator function to get roadmap chapters from video URL
 */
async function getVideoRoadmap(url, provider = process.env.AI_PROVIDER || 'groq') {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube video URL");
  }

  console.log(`[YouTubeService] Fetching details for Video ID: ${videoId}`);
  const details = await fetchVideoDetails(videoId);
  
  // Try to parse description first
  console.log(`[YouTubeService] Checking description for chapters...`);
  let chapters = parseChaptersFromDescription(details.description);
  let parsedFromDescription = true;

  const transcriptSegments = await fetchTranscript(videoId);

  if (chapters.length === 0) {
    parsedFromDescription = false;
    console.log(`[YouTubeService] No chapters found in description. Attempting transcript fallback using provider: ${provider}...`);
    if (!transcriptSegments || transcriptSegments.length === 0) {
      throw new Error("Could not extract chapters from description, and transcript is unavailable for this video.");
    }
    
    if (provider === 'gemini') {
      chapters = await generateChaptersWithGemini(details.title, transcriptSegments);
      console.log(`[YouTubeService] Successfully generated ${chapters.length} chapters via Gemini AI!`);
    } else {
      chapters = await generateChaptersWithGroq(details.title, transcriptSegments);
      console.log(`[YouTubeService] Successfully generated ${chapters.length} chapters via Groq AI!`);
    }
  } else {
    console.log(`[YouTubeService] Successfully parsed ${chapters.length} chapters from video description!`);
  }

  // Ensure first chapter starts at 0 if missing
  if (chapters.length > 0 && chapters[0].seconds > 10) {
    chapters.unshift({
      title: "Introduction",
      timestamp: "0:00",
      seconds: 0
    });
  }

  return {
    videoId,
    title: details.title,
    channelTitle: details.channelTitle,
    thumbnail: details.thumbnail,
    parsedFromDescription,
    chapters,
    transcriptSegments // Return transcript segments to save for searching
  };
}

module.exports = {
  extractVideoId,
  getVideoRoadmap,
  fetchTranscript
};
