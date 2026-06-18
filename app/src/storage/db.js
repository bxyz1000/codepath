import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  COMPLETED: 'codepath_completed_topics',
  NOTES: 'codepath_notes',
  PREFS: 'codepath_preferences',
  SEARCHES: 'codepath_recent_searches'
};

export const StorageService = {
  // Progress Track
  async getCompletedTopics() {
    try {
      const data = await AsyncStorage.getItem(KEYS.COMPLETED);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading completed topics', e);
      return [];
    }
  },

  async saveCompletedTopics(topics) {
    try {
      await AsyncStorage.setItem(KEYS.COMPLETED, JSON.stringify(topics));
    } catch (e) {
      console.error('Error saving completed topics', e);
    }
  },

  // Notes System
  async getNotes() {
    try {
      const data = await AsyncStorage.getItem(KEYS.NOTES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Error reading notes', e);
      return {};
    }
  },

  async saveNotes(notes) {
    try {
      await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('Error saving notes', e);
    }
  },

  // Preferences (e.g. Theme)
  async getPreferences() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PREFS);
      return data ? JSON.parse(data) : { theme: 'dark' };
    } catch (e) {
      console.error('Error reading preferences', e);
      return { theme: 'dark' };
    }
  },

  async savePreferences(prefs) {
    try {
      await AsyncStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving preferences', e);
    }
  },

  // Search History
  async getRecentSearches() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SEARCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading search history', e);
      return [];
    }
  },

  async saveRecentSearches(searches) {
    try {
      await AsyncStorage.setItem(KEYS.SEARCHES, JSON.stringify(searches));
    } catch (e) {
      console.error('Error saving search history', e);
    }
  },

  // Clear data
  async resetAll() {
    try {
      await AsyncStorage.removeItem(KEYS.COMPLETED);
      await AsyncStorage.removeItem(KEYS.NOTES);
      await AsyncStorage.removeItem(KEYS.SEARCHES);
    } catch (e) {
      console.error('Error resetting storage', e);
    }
  }
};
