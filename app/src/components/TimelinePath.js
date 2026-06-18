import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function TimelinePath({ roadmapData, completedTopics, currentTopic, theme, onToggleComplete, onEditNotes }) {
  return (
    <View style={styles.container}>
      {roadmapData.map((category, catIndex) => {
        const catCompleted = category.items.every(item => completedTopics.includes(item.id));
        return (
          <View key={category.id} style={styles.categoryBlock}>
            {/* Category Header */}
            <View style={[
              styles.categoryHeader,
              {
                borderColor: catCompleted ? theme.success : theme.accent,
                backgroundColor: theme.card
              }
            ]}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {category.title}
              </Text>
              <Text style={[styles.categorySub, { color: theme.textSecondary }]}>
                {category.items.filter(i => completedTopics.includes(i.id)).length} / {category.items.length} Completed
              </Text>
            </View>

            {/* List of subtopics with vertical connecting line */}
            <View style={styles.subtopicsList}>
              {category.items.map((item, itemIndex) => {
                const isCompleted = completedTopics.includes(item.id);
                const isCurrent = currentTopic && currentTopic.id === item.id;
                const isLast = itemIndex === category.items.length - 1;

                // Color of the indicator node
                const nodeColor = isCompleted
                  ? theme.success
                  : isCurrent
                  ? theme.accent
                  : theme.textSecondary;

                return (
                  <View key={item.id} style={styles.row}>
                    {/* Vertical line connector */}
                    <View style={styles.lineCol}>
                      <View style={[
                        styles.bulletPoint,
                        {
                          backgroundColor: nodeColor,
                          shadowColor: theme.accent,
                          shadowOpacity: isCurrent ? 0.8 : 0,
                          shadowRadius: isCurrent ? 8 : 0,
                          elevation: isCurrent ? 5 : 0
                        }
                      ]} />
                      {!isLast && (
                        <View style={[
                          styles.verticalLine,
                          {
                            backgroundColor: isCompleted ? theme.success : theme.timelineLine
                          }
                        ]} />
                      )}
                    </View>

                    {/* Card content */}
                    <View style={[
                      styles.card,
                      {
                        backgroundColor: theme.card,
                        borderColor: isCurrent ? theme.accent : theme.border,
                        borderWidth: isCurrent ? 1.5 : 1
                      }
                    ]}>
                      <TouchableOpacity
                        style={styles.checkboxTouch}
                        onPress={() => onToggleComplete(item.id)}
                      >
                        <View style={[
                          styles.checkbox,
                          {
                            borderColor: isCompleted ? theme.success : theme.textSecondary,
                            backgroundColor: isCompleted ? theme.success : 'transparent'
                          }
                        ]}>
                          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.cardInfo}>
                        <Text style={[
                          styles.itemTitle,
                          {
                            color: theme.text,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                            opacity: isCompleted ? 0.7 : isCurrent ? 1 : 0.6
                          }
                        ]}>
                          {item.title}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.glowBadge, { backgroundColor: theme.accentLight }]}>
                            <Text style={[styles.glowText, { color: theme.accent }]}>CURRENT TOPIC</Text>
                          </View>
                        )}
                      </View>

                      {/* Notes button */}
                      <TouchableOpacity
                        style={[styles.notesBtn, { backgroundColor: theme.background }]}
                        onPress={() => onEditNotes(item)}
                      >
                        <Text style={[styles.notesBtnText, { color: theme.accent }]}>Notes</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  categoryBlock: {
    marginBottom: 30
  },
  categoryHeader: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    letterSpacing: 0.5
  },
  categorySub: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600'
  },
  subtopicsList: {
    paddingLeft: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16
  },
  lineCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative'
  },
  bulletPoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 2,
    marginTop: 18
  },
  verticalLine: {
    width: 3,
    position: 'absolute',
    top: 32,
    bottom: -16,
    left: 10.5,
    zIndex: 1
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3
  },
  checkboxTouch: {
    padding: 4
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600'
  },
  glowBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  glowText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  notesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(232, 137, 90, 0.4)'
  },
  notesBtnText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
