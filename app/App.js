import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Theme } from './src/theme/colors';
import { StorageService } from './src/storage/db';
import { NotificationService } from './src/storage/notificationService';

// Import Screens
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import NotesScreen from './src/screens/NotesScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Core Structured Roadmap Data
const ROADMAP_DATA = [
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

// Flat list of all roadmap items for calculations
const FLAT_ROADMAP = ROADMAP_DATA.reduce((acc, cat) => [...acc, ...cat.items], []);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Dashboard'); // 'Dashboard' | 'Roadmap' | 'Search' | 'Settings' | 'Notes'
  const [completedTopics, setCompletedTopics] = useState([]);
  const [notes, setNotes] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);
  const [noteScreenTopic, setNoteScreenTopic] = useState(null); // stores active topic object for NotesScreen
  const [loading, setLoading] = useState(true);

  // Helper to sync the next topic study reminder
  const syncNotificationSchedule = async (completedList, enabled) => {
    if (!enabled) {
      await NotificationService.cancelAllReminders();
      return;
    }
    // Find first topic not completed (which is the currentTopic)
    const current = FLAT_ROADMAP.find(item => !completedList.includes(item.id)) || null;
    if (current) {
      await NotificationService.scheduleNextTopicReminder(current.title);
    } else {
      await NotificationService.cancelAllReminders();
    }
  };

  // Sync data from local storage
  useEffect(() => {
    async function loadStorage() {
      const completed = await StorageService.getCompletedTopics();
      const savedNotes = await StorageService.getNotes();
      const prefs = await StorageService.getPreferences();
      const searches = await StorageService.getRecentSearches();

      setCompletedTopics(completed);
      setNotes(savedNotes);
      setIsDarkMode(prefs.theme === 'dark');
      setNotificationsEnabled(prefs.notificationsEnabled);
      setRecentSearches(searches);
      setLoading(false);

      // Perform one-off sync on app load if notifications are enabled
      if (prefs.notificationsEnabled) {
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          await syncNotificationSchedule(completed, true);
        } else {
          // If permission is denied in OS, update local preference to match
          setNotificationsEnabled(false);
          await StorageService.savePreferences({
            theme: prefs.theme,
            notificationsEnabled: false
          });
        }
      }
    }
    loadStorage();
  }, []);

  const activeTheme = isDarkMode ? Theme.dark : Theme.light;

  // Toggle category completion checkbox
  const handleToggleComplete = async (topicId) => {
    const updated = completedTopics.includes(topicId)
      ? completedTopics.filter(id => id !== topicId)
      : [...completedTopics, topicId];

    setCompletedTopics(updated);
    await StorageService.saveCompletedTopics(updated);
    
    // Reschedule notifications based on the new roadmap state
    await syncNotificationSchedule(updated, notificationsEnabled);
  };

  // Save specific notes edit
  const handleSaveNotes = async (topicId, textContent) => {
    const updated = { ...notes, [topicId]: textContent };
    setNotes(updated);
    await StorageService.saveNotes(updated);
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
        await syncNotificationSchedule(completedTopics, true);
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
    const current = FLAT_ROADMAP.find(item => !completedTopics.includes(item.id)) || null;
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
    // Current topic is the first topic in the roadmap that is NOT completed
    const current = FLAT_ROADMAP.find(item => !completedTopics.includes(item.id)) || null;
    let next = null;

    if (current) {
      const currIndex = FLAT_ROADMAP.findIndex(item => item.id === current.id);
      if (currIndex + 1 < FLAT_ROADMAP.length) {
        next = FLAT_ROADMAP[currIndex + 1];
      }
    }
    return { current, next };
  };

  const { current: currentTopic, next: nextTopic } = getProgressState();

  // Find recently edited notes (non-empty notes)
  const getRecentNotes = () => {
    const list = [];
    for (const [topicId, content] of Object.entries(notes)) {
      if (content && content.trim() !== '') {
        const found = FLAT_ROADMAP.find(item => item.id === topicId);
        if (found) {
          list.push({ ...found, content });
        }
      }
    }
    return list.slice(0, 3); // show top 3
  };

  const recentNotes = getRecentNotes();

  // Custom Navigation stack transition
  const handleEditNotes = (topic) => {
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
            roadmapData={ROADMAP_DATA}
            currentTopic={currentTopic}
            nextTopic={nextTopic}
            recentNotes={recentNotes}
            theme={activeTheme}
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
            roadmapData={ROADMAP_DATA}
            completedTopics={completedTopics}
            currentTopic={currentTopic}
            theme={activeTheme}
            onToggleComplete={handleToggleComplete}
            onEditNotes={handleEditNotes}
          />
        )}

        {currentScreen === 'Search' && (
          <SearchScreen
            theme={activeTheme}
            recentSearches={recentSearches}
            onAddSearchQuery={handleAddSearchQuery}
            onClearSearches={handleClearSearches}
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
