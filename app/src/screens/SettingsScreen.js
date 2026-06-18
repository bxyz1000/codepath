import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share } from 'react-native';

export default function SettingsScreen({
  theme,
  isDarkMode,
  onToggleTheme,
  onResetProgress,
  notesData,
  completedTopics,
  notificationsEnabled,
  onToggleNotifications,
  onSendTestNotification
}) {
  const handleReset = () => {
    Alert.alert(
      'Reset All Progress',
      'Are you sure you want to delete your progress, search history, and notebook notes? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Everything', style: 'destructive', onPress: onResetProgress }
      ]
    );
  };

  const handleExport = async () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        completedCount: completedTopics.length,
        completedTopics,
        notes: notesData
      };
      const jsonString = JSON.stringify(exportObject, null, 2);

      await Share.share({
        title: 'My CodePath Study Data',
        message: jsonString
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'An error occurred while attempting to share data.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Manage your app theme, local storage, backups, and configurations.
        </Text>
      </View>

      {/* Preferences Option */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Preferences</Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
            <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
              Optimized dark palette for low-light studying.
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={onToggleTheme}
            trackColor={{ false: '#767577', true: theme.accent }}
            thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(91, 107, 122, 0.1)', marginVertical: 12 }} />

        <View style={styles.row}>
          <View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Study Reminders</Text>
            <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
              Playful alerts prompting your next learning stop.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ false: '#767577', true: theme.accent }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Local Storage & Actions */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>System & Data</Text>
        </View>

        {/* Send Test Notification */}
        {notificationsEnabled && (
          <TouchableOpacity style={styles.actionRow} onPress={onSendTestNotification}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Send Test Notification</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Triggers a playful reminder in 5 seconds to test permissions.
              </Text>
            </View>
            <Text style={[styles.arrow, { color: theme.accent }]}>🚀</Text>
          </TouchableOpacity>
        )}

        {/* Export Notes */}
        <TouchableOpacity style={styles.actionRow} onPress={handleExport}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Export Notebook Logs</Text>
            <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
              Export all local notes, completion records, and transcripts search settings.
            </Text>
          </View>
          <Text style={[styles.arrow, { color: theme.accent }]}>→</Text>
        </TouchableOpacity>

        {/* Reset progress */}
        <TouchableOpacity style={styles.actionRow} onPress={handleReset}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: '#d9534f' }]}>Reset Progress & Notes</Text>
            <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
              Wipe out all local progress checks, search history, and saved NotebookLM notes.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Box */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>About CodePath</Text>
        </View>
        <View style={styles.aboutContent}>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            CodePath is a premium mobile-first learning companion. It combines structured progress paths for HTML, CSS, JavaScript, and Backend architecture with localized notebook tracking and YouTube transcript searching capabilities.
          </Text>
          <Text style={[styles.versionText, { color: theme.accent }]}>
            Version 1.0.0
          </Text>
        </View>
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
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(91, 107, 122, 0.15)',
    paddingBottom: 10,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  rowDesc: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: '85%'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(91, 107, 122, 0.1)'
  },
  rowText: {
    flex: 1
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    paddingLeft: 8
  },
  aboutContent: {
    paddingVertical: 4
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 18
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12
  }
});
