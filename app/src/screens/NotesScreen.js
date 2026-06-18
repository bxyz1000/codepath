import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';

export default function NotesScreen({ topic, currentNotes, theme, onSave, onBack }) {
  const [content, setContent] = useState(currentNotes || '');
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setContent(currentNotes || '');
    setIsSaved(true);
  }, [topic, currentNotes]);

  const handleTextChange = (text) => {
    setContent(text);
    setIsSaved(false);
  };

  const handleSave = () => {
    onSave(topic.id, content);
    setIsSaved(true);
    Alert.alert('Saved', 'Your notes have been saved locally.', [{ text: 'OK' }]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.statusText, { color: isSaved ? theme.success : theme.accent }]}>
          {isSaved ? 'Synced Locally' : 'Unsaved Changes'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.meta}>
          <Text style={[styles.categoryTitle, { color: theme.textSecondary }]}>
            {topic.categoryTitle.toUpperCase()}
          </Text>
          <Text style={[styles.topicTitle, { color: theme.text }]}>
            {topic.title}
          </Text>
        </View>

        {/* Informative NotebookLM notice */}
        <View style={[styles.infoBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.accent }]}>NotebookLM Integration</Text>
          <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
            Paste study guides, summaries, or AI chat logs from NotebookLM directly below to keep all notes consolidated.
          </Text>
        </View>

        {/* Input box */}
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
              textAlignVertical: 'top'
            }
          ]}
          multiline
          placeholder="Paste NotebookLM summaries or start typing your study notes here..."
          placeholderTextColor={theme.textSecondary}
          value={content}
          onChangeText={handleTextChange}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: isSaved ? theme.textSecondary : theme.accent
            }
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save Notes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  backBtn: {
    paddingVertical: 6
  },
  backText: {
    fontSize: 15,
    fontWeight: '700'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  meta: {
    marginVertical: 12
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    marginTop: 4
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4
  },
  infoBody: {
    fontSize: 11,
    lineHeight: 15
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    minHeight: 250,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});
