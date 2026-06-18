import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function DashboardScreen({
  completedTopics,
  roadmapData,
  currentTopic,
  nextTopic,
  recentNotes,
  theme,
  onNavigate
}) {
  const totalItems = roadmapData.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = completedTopics.length;
  const progressPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Mock stats
  const streak = completedCount > 0 ? 5 : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: theme.textSecondary }]}>Welcome Back,</Text>
        <Text style={[styles.title, { color: theme.text }]}>Your Coding Journey</Text>
      </View>

      {/* Progress Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{progressPercentage}%</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: theme.success }]}>{streak} Days</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Streak</Text>
        </View>
      </View>

      {/* Progress Path Filler Visual Indicator */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, { width: `${progressPercentage}%`, backgroundColor: theme.accent }]} />
      </View>

      {/* Current Position / Continue Learning */}
      {currentTopic ? (
        <View style={[styles.currentCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
          <Text style={[styles.sectionSubtitle, { color: theme.accent }]}>CURRENT STOP</Text>
          <Text style={[styles.currentTopicTitle, { color: theme.text }]}>{currentTopic.title}</Text>
          <Text style={[styles.currentTopicCat, { color: theme.textSecondary }]}>Module: {currentTopic.categoryTitle}</Text>

          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.accent }]}
            onPress={() => onNavigate('Roadmap')}
          >
            <Text style={styles.continueBtnText}>Continue Learning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.currentCard, { backgroundColor: theme.card, borderColor: theme.success }]}>
          <Text style={[styles.sectionSubtitle, { color: theme.success }]}>JOURNEY COMPLETE</Text>
          <Text style={[styles.currentTopicTitle, { color: theme.text }]}>Congratulations! 🎉</Text>
          <Text style={[styles.currentTopicCat, { color: theme.textSecondary }]}>You've mastered all learning roadmap topics.</Text>
          
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.success }]}
            onPress={() => onNavigate('Roadmap')}
          >
            <Text style={styles.continueBtnText}>View Full Roadmap</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next Milestone */}
      {nextTopic && (
        <View style={[styles.nextCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.nextLabel, { color: theme.textSecondary }]}>Up Next: {nextTopic.title}</Text>
        </View>
      )}

      {/* Recently Edited Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Notes</Text>
        {recentNotes.length > 0 ? (
          recentNotes.map(note => (
            <TouchableOpacity
              key={note.id}
              style={[styles.noteItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => onNavigate('Notes', { topic: note })}
            >
              <View>
                <Text style={[styles.noteTitle, { color: theme.text }]}>{note.title}</Text>
                <Text
                  numberOfLines={2}
                  style={[styles.noteSnippet, { color: theme.textSecondary }]}
                >
                  {note.content || "Empty notes... Tap to write down thoughts."}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.emptyNotesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
              No notes written yet. Go to your learning roadmap and start documenting key takeaways!
            </Text>
          </View>
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
  welcome: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    marginTop: 4
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statCard: {
    flex: 0.48,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600'
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: 4
  },
  currentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8
  },
  currentTopicTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  currentTopicCat: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16
  },
  continueBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  nextCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 24
  },
  nextLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'sans-serif-condensed'
  },
  noteItem: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  noteSnippet: {
    fontSize: 12,
    lineHeight: 16
  },
  emptyNotesCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed'
  }
});
