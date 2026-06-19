import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Theme } from './src/theme/colors';
import { StorageService } from './src/storage/db';
import { NotificationService } from './src/storage/notificationService';
import { supabase } from './supabase';

// Import Screens
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import NotesScreen from './src/screens/NotesScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Fallback Structured Roadmap Data in case Supabase fails
const FALLBACK_ROADMAP = [
  {
    id: 'html',
    title: 'HTML Essentials',
    items: [
      { id: 'html_intro', title: 'Introduction', categoryTitle: 'HTML Essentials' },
      { id: 'html_tags', title: 'Tags & Elements', categoryTitle: 'HTML Essentials' },
      { id: 'html_forms', title: 'Forms & Input Validation', categoryTitle: 'HTML Essentials' },
      { id: 'html_semantic', title: 'Semantic HTML & SEO', categoryTitle: 'HTML Essentials' },
      { id: 'html_project', title: 'Mini Project: Profile Page', categoryTitle: 'HTML Essentials' }
    ]
  },
  {
    id: 'css',
    title: 'CSS Styling',
    items: [
      { id: 'css_selectors', title: 'Selectors & Rules', categoryTitle: 'CSS Styling' },
      { id: 'css_boxmodel', title: 'Box Model & Sizing', categoryTitle: 'CSS Styling' },
      { id: 'css_flexbox', title: 'Flexbox Layouts', categoryTitle: 'CSS Styling' },
      { id: 'css_grid', title: 'Grid Systems', categoryTitle: 'CSS Styling' },
      { id: 'css_responsive', title: 'Responsive Design & Media Queries', categoryTitle: 'CSS Styling' },
      { id: 'css_project', title: 'Mini Project: Flex Landing Page', categoryTitle: 'CSS Styling' }
    ]
  },
  {
    id: 'js',
    title: 'JavaScript Scripting',
    items: [
      { id: 'js_variables', title: 'Variables, Types & Operators', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_functions', title: 'Functions & Scope', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_arrays', title: 'Arrays & Transformations', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_objects', title: 'Objects & Key-value storage', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_dom', title: 'DOM Selectors & Event Handling', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_async', title: 'Async JavaScript & Promises', categoryTitle: 'JavaScript Scripting' },
      { id: 'js_project', title: 'Mini Project: Weather Application', categoryTitle: 'JavaScript Scripting' }
    ]
  },
  {
    id: 'backend',
    title: 'Backend Development',
    items: [
      { id: 'backend_node', title: 'Node.js Basics', categoryTitle: 'Backend Development' },
      { id: 'backend_express', title: 'Express Server setup', categoryTitle: 'Backend Development' },
      { id: 'backend_rest', title: 'REST APIs & Route queries', categoryTitle: 'Backend Development' },
      { id: 'backend_auth', title: 'Authentication & JWT Middleware', categoryTitle: 'Backend Development' },
      { id: 'backend_databases', title: 'Databases & Mappings (SQL/NoSQL)', categoryTitle: 'Backend Development' },
      { id: 'backend_project', title: 'Final Project: RESTful API Deployment', categoryTitle: 'Backend Development' }
    ]
  }
];

// Helper to sync the next topic study reminder
const syncNotificationSchedule = async (completedList, enabled, flatRoadmap) => {
  if (!enabled) {
    await NotificationService.cancelAllReminders();
    return;
  }
  // Find first topic not completed (which is the currentTopic)
  const current = flatRoadmap.find(item => !completedList.includes(item.id)) || null;
  if (current) {
    await NotificationService.scheduleNextTopicReminder(current.title);
  } else {
    await NotificationService.cancelAllReminders();
  }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Dashboard'); // 'Dashboard' | 'Roadmap' | 'Search' | 'Settings' | 'Notes'
  const [roadmapData, setRoadmapData] = useState([]);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [completedSubtopics, setCompletedSubtopics] = useState([]);
  const [notes, setNotes] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);
  const [noteScreenTopic, setNoteScreenTopic] = useState(null); // stores active topic object for NotesScreen
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Dynamically compute flat list of all roadmap items for calculations
  const flatRoadmap = roadmapData.reduce((acc, cat) => [...acc, ...cat.items], []);

  // Sync data from local storage and Supabase
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Load from AsyncStorage first for immediate preferences/progress
        const completed = await StorageService.getCompletedTopics();
        const completedSubs = await StorageService.getCompletedSubtopics();
        const savedNotes = await StorageService.getNotes();
        const prefs = await StorageService.getPreferences();
        const searches = await StorageService.getRecentSearches();

        setCompletedTopics(completed);
        setCompletedSubtopics(completedSubs);
        setNotes(savedNotes);
        setIsDarkMode(prefs.theme === 'dark');
        setNotificationsEnabled(prefs.notificationsEnabled);
        setRecentSearches(searches);

        // Fetch user progress from Supabase where username matches localStorage cp_user.username
        let username = 'bhavik'; // default fallback username
        try {
          if (typeof localStorage !== 'undefined') {
            const cpUserStr = localStorage.getItem('cp_user');
            if (cpUserStr) {
              const cpUser = JSON.parse(cpUserStr);
              if (cpUser && cpUser.username) {
                username = cpUser.username;
              }
            }
          }
        } catch (e) {
          console.warn('Error reading cp_user from localStorage:', e);
        }

        console.log('Fetching user_progress for:', username);
        const { data: dbProgress, error: progressError } = await supabase
          .from('user_progress')
          .select('topic_id, completed')
          .eq('username', username);

        let finalCompleted = completed;
        if (!progressError && dbProgress) {
          const completedFromDB = dbProgress
            .filter(row => row.completed)
            .map(row => row.topic_id);
          finalCompleted = completedFromDB;
          setCompletedTopics(completedFromDB);
          await StorageService.saveCompletedTopics(completedFromDB);
        } else if (progressError) {
          console.error('Error fetching user_progress:', progressError);
        }

        // 2. Fetch tracks and topics from Supabase
        console.log('Fetching tracks and topics from Supabase...');
        const { data: dbTracks, error: tracksError } = await supabase
          .from('tracks')
          .select('*');

        const { data: dbTopics, error: topicsError } = await supabase
          .from('topics')
          .select('*');

        if (tracksError) throw tracksError;
        if (topicsError) throw topicsError;

        // Route tracks to their correct sequence
        const trackOrder = ['frontend', 'projects', 'reading', 'backend'];
        const sortedTracks = (dbTracks || []).sort((a, b) => {
          return trackOrder.indexOf(a.id) - trackOrder.indexOf(b.id);
        });

        // Parse and structure tracks/topics
        const structuredRoadmap = sortedTracks.map(track => {
          const trackTopics = (dbTopics || [])
            .filter(t => t.track_id === track.id)
            .sort((a, b) => a.order_index - b.order_index);

          return {
            id: track.id,
            title: track.title,
            items: trackTopics.map(topic => {
              let parsedSubtopics = [];
              let parsedResources = [];

              try {
                parsedSubtopics = typeof topic.subtopics === 'string' ? JSON.parse(topic.subtopics) : (topic.subtopics || []);
              } catch (e) {
                console.error('Error parsing subtopics for topic', topic.id, e);
              }

              try {
                parsedResources = typeof topic.resources === 'string' ? JSON.parse(topic.resources) : (topic.resources || []);
              } catch (e) {
                console.error('Error parsing resources for topic', topic.id, e);
              }

              return {
                id: topic.id,
                title: topic.title,
                categoryTitle: track.title,
                subtopics: parsedSubtopics,
                resources: parsedResources,
                order_index: topic.order_index
              };
            })
          };
        });

        setRoadmapData(structuredRoadmap);
        const dynamicFlatRoadmap = structuredRoadmap.reduce((acc, cat) => [...acc, ...cat.items], []);

        // Perform one-off sync on app load if notifications are enabled
        if (prefs.notificationsEnabled) {
          const hasPermission = await NotificationService.requestPermissions();
          if (hasPermission) {
            await syncNotificationSchedule(finalCompleted, true, dynamicFlatRoadmap);
          } else {
            setNotificationsEnabled(false);
            await StorageService.savePreferences({
              theme: prefs.theme,
              notificationsEnabled: false
            });
          }
        }
      } catch (err) {
        console.warn('Error loading dynamic Supabase data, applying fallback roadmap:', err);
        setRoadmapData(FALLBACK_ROADMAP);
        
        const fallbackFlatRoadmap = FALLBACK_ROADMAP.reduce((acc, cat) => [...acc, ...cat.items], []);
        const completed = await StorageService.getCompletedTopics();
        const prefs = await StorageService.getPreferences();

        if (prefs.notificationsEnabled) {
          await syncNotificationSchedule(completed, true, fallbackFlatRoadmap);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Run streak comparison logic on Dashboard load
  useEffect(() => {
    if (currentScreen === 'Dashboard') {
      try {
        if (typeof localStorage !== 'undefined') {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          const lastActive = localStorage.getItem('cp_last_active');
          const savedStreakStr = localStorage.getItem('cp_streak');
          let currentStreak = savedStreakStr ? parseInt(savedStreakStr, 10) || 0 : 0;

          if (lastActive) {
            const dToday = new Date(todayStr + 'T00:00:00');
            const dLast = new Date(lastActive + 'T00:00:00');
            const diffTime = dToday - dLast;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              const lastIncrementedDate = localStorage.getItem('cp_last_streak_increment_date');
              if (lastIncrementedDate !== todayStr) {
                currentStreak += 1;
                localStorage.setItem('cp_streak', String(currentStreak));
                localStorage.setItem('cp_last_streak_increment_date', todayStr);
              }
            } else if (diffDays > 1) {
              currentStreak = 0;
              localStorage.setItem('cp_streak', String(currentStreak));
            }
            // If diffDays === 0 (same day), keep streak same (do nothing)
          } else {
            // No last active date exists yet
            currentStreak = 0;
            localStorage.setItem('cp_streak', '0');
          }
          setStreak(currentStreak);
        }
      } catch (e) {
        console.warn('Error checking/updating streak:', e);
      }
    }
  }, [currentScreen]);

  const activeTheme = isDarkMode ? Theme.dark : Theme.light;

  // Toggle category completion checkbox
  const handleToggleComplete = async (topicId) => {
    const updated = completedTopics.includes(topicId)
      ? completedTopics.filter(id => id !== topicId)
      : [...completedTopics, topicId];

    setCompletedTopics(updated);
    await StorageService.saveCompletedTopics(updated);
    
    // Reschedule notifications based on the new roadmap state
    await syncNotificationSchedule(updated, notificationsEnabled, flatRoadmap);

    // Sync to Supabase user_progress table
    let username = 'bhavik'; // fallback
    try {
      if (typeof localStorage !== 'undefined') {
        const cpUserStr = localStorage.getItem('cp_user');
        if (cpUserStr) {
          const cpUser = JSON.parse(cpUserStr);
          if (cpUser && cpUser.username) {
            username = cpUser.username;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading cp_user from localStorage:', e);
    }

    try {
      const isCompleted = updated.includes(topicId);
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          username: username,
          topic_id: topicId,
          completed: isCompleted,
          updated_at: new Date().toISOString()
        }, { onConflict: 'username,topic_id' });
      if (error) {
        console.error('Error syncing user_progress to Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to sync toggle to Supabase:', err);
    }
  };

  // Toggle subtopic completion checkbox
  const handleToggleSubtopicComplete = async (subtopicId) => {
    const isCheckingComplete = !completedSubtopics.includes(subtopicId);
    const updated = completedSubtopics.includes(subtopicId)
      ? completedSubtopics.filter(id => id !== subtopicId)
      : [...completedSubtopics, subtopicId];

    setCompletedSubtopics(updated);
    await StorageService.saveCompletedSubtopics(updated);

    if (isCheckingComplete) {
      try {
        if (typeof localStorage !== 'undefined') {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          localStorage.setItem('cp_last_active', todayStr);
        }
      } catch (e) {
        console.warn('Error saving cp_last_active to localStorage:', e);
      }
    }
  };

  // Save specific notes edit
  const handleSaveNotes = async (topicId, textContent) => {
    const updated = { ...notes, [topicId]: textContent };
    setNotes(updated);
    await StorageService.saveNotes(updated);
  };

  // Save customized YouTube link in Supabase topics resources array
  const handleSaveYoutubeResource = async (topicId, url, title) => {
    const username = 'bhavik';
    try {
      // 1. Fetch current resources from Supabase
      const { data: topicData, error: fetchErr } = await supabase
        .from('topics')
        .select('resources')
        .eq('id', topicId)
        .single();

      if (fetchErr) throw fetchErr;

      let resources = [];
      if (topicData && topicData.resources) {
        resources = typeof topicData.resources === 'string'
          ? JSON.parse(topicData.resources)
          : topicData.resources;
      }

      const cleanUrl = url.trim();
      // Remove any existing user video resource to prevent duplicates
      const filteredResources = resources.filter(r => r.username !== username);

      const newResource = {
        title: title || 'YouTube Video',
        url: cleanUrl,
        username: username,
        order_index: filteredResources.length
      };

      filteredResources.push(newResource);

      // 2. Update Supabase
      const { error: updateErr } = await supabase
        .from('topics')
        .update({ resources: JSON.stringify(filteredResources) })
        .eq('id', topicId);

      if (updateErr) throw updateErr;

      // 3. Update local state roadmapData reactively
      setRoadmapData(prevData => {
        return prevData.map(track => {
          return {
            ...track,
            items: track.items.map(item => {
              if (item.id === topicId) {
                return {
                  ...item,
                  resources: filteredResources
                };
              }
              return item;
            })
          };
        });
      });
      
      return filteredResources;
    } catch (err) {
      console.error('Failed to save YouTube resource:', err);
      Alert.alert('Database Error', 'Could not save video resource to Supabase.');
      throw err;
    }
  };

  // Toggle light/dark appearance
  const handleToggleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    await StorageService.savePreferences({
      theme: nextMode ? 'dark' : 'light',
      notificationsEnabled
    });
  };

  // Toggle study reminders
  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    if (nextVal) {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        setNotificationsEnabled(true);
        await StorageService.savePreferences({
          theme: isDarkMode ? 'dark' : 'light',
          notificationsEnabled: true
        });
        await syncNotificationSchedule(completedTopics, true, flatRoadmap);
        Alert.alert("Study Reminders Enabled", "You will now receive playful notifications to help you stay on track!");
      } else {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications for CodePath in your device system settings to use study reminders."
        );
      }
    } else {
      setNotificationsEnabled(false);
      await StorageService.savePreferences({
        theme: isDarkMode ? 'dark' : 'light',
        notificationsEnabled: false
      });
      await NotificationService.cancelAllReminders();
    }
  };

  // Send an immediate 5-second test notification
  const handleSendTestNotification = async () => {
    const current = flatRoadmap.find(item => !completedTopics.includes(item.id)) || null;
    const topicTitle = current ? current.title : "HTML Essentials";
    
    await NotificationService.sendImmediateTestNotification(topicTitle);
    Alert.alert(
      "Test Notification Sent",
      "A study reminder has been scheduled to fire in 5 seconds. Lock your screen or go to your home screen to see it!"
    );
  };

  // Reset progress and notes
  const handleResetProgress = async () => {
    setCompletedTopics([]);
    setCompletedSubtopics([]);
    setNotes({});
    setRecentSearches([]);
    await StorageService.resetAll();
    await NotificationService.cancelAllReminders();
  };

  // Add search query
  const handleAddSearchQuery = async (query) => {
    // Keep top 6 unique searches
    const filtered = recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 6);
    setRecentSearches(updated);
    await StorageService.saveRecentSearches(updated);
  };

  const handleClearSearches = async () => {
    setRecentSearches([]);
    await StorageService.saveRecentSearches([]);
  };

  // Compute Current & Next Topics
  const getProgressState = () => {
    // Current stop = first incomplete topic
    // Up next = second incomplete topic
    const incomplete = flatRoadmap.filter(item => !completedTopics.includes(item.id));
    const current = incomplete[0] || null;
    const next = incomplete[1] || null;
    return { current, next };
  };

  const { current: currentTopic, next: nextTopic } = getProgressState();

  // Find recently edited notes (non-empty notes)
  const getRecentNotes = () => {
    const list = [];
    for (const [topicId, content] of Object.entries(notes)) {
      if (content && content.trim() !== '') {
        const found = flatRoadmap.find(item => item.id === topicId);
        if (found) {
          list.push({ ...found, content });
        }
      }
    }
    return list.slice(0, 3); // show top 3
  };

  const recentNotes = getRecentNotes();

  // Custom Navigation stack transition pre-filling Notes heading if empty
  const handleEditNotes = (topic) => {
    const existingNotes = notes[topic.id] || '';
    if (!existingNotes.trim()) {
      const heading = `# ${topic.title}\n\n`;
      handleSaveNotes(topic.id, heading);
    }
    setNoteScreenTopic(topic);
    setCurrentScreen('Notes');
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: activeTheme.background }]}>
        <Text style={{ color: activeTheme.accent, fontWeight: '700' }}>Loading CodePath journey...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={activeTheme.statusBackground}
      />

      {/* Screen container */}
      <View style={styles.screenArea}>
        {currentScreen === 'Dashboard' && (
          <DashboardScreen
            completedTopics={completedTopics}
            roadmapData={roadmapData}
            currentTopic={currentTopic}
            nextTopic={nextTopic}
            recentNotes={recentNotes}
            theme={activeTheme}
            streak={streak}
            onNavigate={(screen, params) => {
              if (screen === 'Notes' && params?.topic) {
                handleEditNotes(params.topic);
              } else {
                setCurrentScreen(screen);
              }
            }}
          />
        )}

        {currentScreen === 'Roadmap' && (
          <RoadmapScreen
            roadmapData={roadmapData}
            completedTopics={completedTopics}
            completedSubtopics={completedSubtopics}
            currentTopic={currentTopic}
            theme={activeTheme}
            onToggleComplete={handleToggleComplete}
            onToggleSubtopicComplete={handleToggleSubtopicComplete}
            onEditNotes={handleEditNotes}
            onSaveYoutubeResource={handleSaveYoutubeResource}
          />
        )}

        {currentScreen === 'Search' && (
          <SearchScreen
            theme={activeTheme}
            recentSearches={recentSearches}
            onAddSearchQuery={handleAddSearchQuery}
            onClearSearches={handleClearSearches}
            savedUrls={flatRoadmap.reduce((acc, item) => {
              if (item.resources) {
                item.resources.forEach(r => {
                  if (r.username === 'bhavik' && r.url) {
                    acc.push(r.url);
                  }
                });
              }
              return acc;
            }, [])}
          />
        )}

        {currentScreen === 'Settings' && (
          <SettingsScreen
            theme={activeTheme}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onResetProgress={handleResetProgress}
            notesData={notes}
            completedTopics={completedTopics}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            onSendTestNotification={handleSendTestNotification}
          />
        )}

        {currentScreen === 'Notes' && noteScreenTopic && (
          <NotesScreen
            topic={noteScreenTopic}
            currentNotes={notes[noteScreenTopic.id] || ''}
            theme={activeTheme}
            onSave={handleSaveNotes}
            onBack={() => setCurrentScreen('Roadmap')}
          />
        )}
      </View>

      {/* Custom Bottom Tab Bar (hidden when in Note Editor screen to maximize keyboard room) */}
      {currentScreen !== 'Notes' && (
        <View style={[styles.tabBar, { backgroundColor: activeTheme.card, borderTopColor: activeTheme.border }]}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Dashboard')}
          >
            <Text style={[
              styles.tabLabel,
              { color: currentScreen === 'Dashboard' ? activeTheme.accent : activeTheme.textSecondary }
            ]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Roadmap')}
          >
            <Text style={[
              styles.tabLabel,
              { color: currentScreen === 'Roadmap' ? activeTheme.accent : activeTheme.textSecondary }
            ]}>Roadmap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Search')}
          >
            <Text style={[
              styles.tabLabel,
              { color: currentScreen === 'Search' ? activeTheme.accent : activeTheme.textSecondary }
            ]}>Doubt Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Settings')}
          >
            <Text style={[
              styles.tabLabel,
              { color: currentScreen === 'Settings' ? activeTheme.accent : activeTheme.textSecondary }
            ]}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  screenArea: {
    flex: 1
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%'
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  }
});
