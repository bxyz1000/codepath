import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { CONFIG } from '../config';

export default function SearchScreen({ 
  theme, 
  recentSearches, 
  onAddSearchQuery, 
  onClearSearches,
  savedUrls = []
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    if (savedUrls.length === 0) {
      Alert.alert('No Videos Saved', 'Please add some YouTube videos to your topics first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Save query to history
    onAddSearchQuery(searchQuery.trim());

    try {
      // Call the dynamic multi-video transcript search endpoint
      const response = await fetch(`${CONFIG.API_URL}/api/search-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery, 
          urls: savedUrls 
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        setResult(data);
      } else {
        setError(data.error || 'No matching transcripts found for your doubt.');
      }
    } catch (err) {
      console.error(err);
      setError(`Could not connect to backend search service. Make sure your server at ${CONFIG.API_URL} is online.`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open URL", err);
      Alert.alert('Error', 'Unable to open link. Ensure YouTube is installed or link is valid.');
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Doubt Search</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Ask any concept to scan transcripts and jump to the exact YouTube timestamp.
        </Text>
      </View>

      {/* Conditional Search Bar or Empty Banner */}
      {savedUrls.length === 0 ? (
        <View style={[styles.noVideosCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.noVideosText, { color: theme.textSecondary }]}>
            Add YouTube videos to your topics first, then search your doubts here
          </Text>
        </View>
      ) : (
        /* Search Bar */
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border
              }
            ]}
            placeholder="e.g., event bubbling, flexbox, box model..."
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => performSearch(query)}
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: theme.accent }]}
            onPress={() => performSearch(query)}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Scanning YouTube transcripts...</Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={[styles.errorCard, { backgroundColor: theme.card, borderColor: '#d9534f' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Search results list */}
      {result && Array.isArray(result) && result.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsSectionHeader, { color: theme.textSecondary }]}>Search Results</Text>
          {result.map((item, index) => (
            <View key={index} style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.courseName, { color: theme.accent }]}>MATCH #{index + 1}</Text>
                <View style={[styles.badge, { backgroundColor: theme.success }]}>
                  <Text style={styles.badgeText}>{item.timestamp}</Text>
                </View>
              </View>

              <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={1}>
                {item.videoTitle}
              </Text>

              <View style={[styles.matchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.matchLabel, { color: theme.textSecondary }]}>TRANSCRIPT PREVIEW:</Text>
                <Text style={[styles.matchText, { color: theme.text }]}>"{item.matchText}"</Text>
              </View>

              <TouchableOpacity
                style={[styles.youtubeBtn, { backgroundColor: '#e52d27' }]}
                onPress={() => handleOpenLink(item.youtubeUrl)}
              >
                <Text style={styles.youtubeBtnText}>Jump to Timestamp</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Recent Searches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
          {recentSearches.length > 0 && (
            <TouchableOpacity onPress={onClearSearches}>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentSearches.length > 0 ? (
          <View style={styles.recentContainer}>
            {recentSearches.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.recentTag, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  setQuery(item);
                  performSearch(item);
                }}
              >
                <Text style={[styles.recentText, { color: theme.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent searches.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16
  },
  header: {
    marginTop: 24,
    marginBottom: 20
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed'
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500'
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 24
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14
  },
  searchBtn: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  centerContainer: {
    alignItems: 'center',
    marginVertical: 30
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600'
  },
  noVideosCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noVideosText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },
  errorCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  errorText: {
    color: '#d9534f',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  resultsContainer: {
    marginBottom: 24
  },
  resultsSectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12
  },
  resultCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  courseName: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900'
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12
  },
  matchContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  matchLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  matchText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic'
  },
  youtubeBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  youtubeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  section: {
    marginBottom: 40
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed'
  },
  recentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  recentTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  recentText: {
    fontSize: 12,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic'
  }
});
