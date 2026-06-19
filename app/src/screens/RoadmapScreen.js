import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TimelinePath from '../components/TimelinePath';

export default function RoadmapScreen({
  roadmapData,
  completedTopics,
  completedSubtopics,
  currentTopic,
  theme,
  onToggleComplete,
  onToggleSubtopicComplete,
  onEditNotes,
  onSaveYoutubeResource
}) {
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Learning Roadmap</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Navigate your path from HTML basics to Backend mastery. Tap checkboxes to mark progress.
        </Text>
      </View>

      <TimelinePath
        roadmapData={roadmapData}
        completedTopics={completedTopics}
        completedSubtopics={completedSubtopics}
        currentTopic={currentTopic}
        theme={theme}
        onToggleComplete={onToggleComplete}
        onToggleSubtopicComplete={onToggleSubtopicComplete}
        onEditNotes={onEditNotes}
        onSaveYoutubeResource={onSaveYoutubeResource}
      />
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
  }
});
