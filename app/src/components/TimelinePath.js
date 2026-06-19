import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Linking, ActivityIndicator } from 'react-native';
import { ROADMAP_RESOURCES } from '../../resources';

export default function TimelinePath({
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
  const [expandedTopicId, setExpandedTopicId] = useState(null);
  const [youtubeUrls, setYoutubeUrls] = useState({});
  const [videoMetadata, setVideoMetadata] = useState({});
  const [activeResourceTabs, setActiveResourceTabs] = useState({});

  const toggleExpand = (topicId) => {
    const isExpanding = expandedTopicId !== topicId;
    setExpandedTopicId(isExpanding ? topicId : null);

    if (isExpanding) {
      // Find if there is an existing user youtube resource saved
      const foundTopic = roadmapData.flatMap(cat => cat.items).find(i => i.id === topicId);
      if (foundTopic && foundTopic.resources) {
        const ytResource = foundTopic.resources.find(r => r.username === 'bhavik');
        if (ytResource) {
          // Pre-populate input
          setYoutubeUrls(prev => ({ ...prev, [topicId]: ytResource.url }));
          // Load metadata
          if (!videoMetadata[topicId]) {
            fetchMetadataForUrl(topicId, ytResource.url);
          }
        }
      }
    }
  };

  const handleUrlChange = async (topicId, text) => {
    setYoutubeUrls(prev => ({ ...prev, [topicId]: text }));

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (ytRegex.test(text.trim())) {
      const url = text.trim();
      fetchMetadataForUrl(topicId, url);
    }
  };

  const fetchMetadataForUrl = async (topicId, url) => {
    setVideoMetadata(prev => ({
      ...prev,
      [topicId]: { loading: true, url }
    }));
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!res.ok) throw new Error('oEmbed request failed');
      const data = await res.json();
      
      setVideoMetadata(prev => ({
        ...prev,
        [topicId]: {
          loading: false,
          title: data.title || 'YouTube Video',
          thumbnail: data.thumbnail_url,
          url
        }
      }));

      if (onSaveYoutubeResource) {
        await onSaveYoutubeResource(topicId, url, data.title);
      }
    } catch (err) {
      console.warn('oEmbed fetch failed:', err);
      setVideoMetadata(prev => ({
        ...prev,
        [topicId]: {
          loading: false,
          title: 'YouTube Video',
          thumbnail: null,
          url
        }
      }));

      if (onSaveYoutubeResource) {
        await onSaveYoutubeResource(topicId, url, 'YouTube Video');
      }
    }
  };

  // Determine user's active track from localStorage
  let track = 'frontend';
  try {
    if (typeof localStorage !== 'undefined') {
      const cpUserStr = localStorage.getItem('cp_user');
      if (cpUserStr) {
        const cpUser = JSON.parse(cpUserStr);
        if (cpUser && cpUser.track) {
          track = cpUser.track;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading track from localStorage:', e);
  }

  const activeCategory = roadmapData.find(cat => cat.id === track);

  // 1. Projects Track (Build Something)
  if (track === 'projects') {
    const category = activeCategory || roadmapData.find(cat => cat.id === 'projects');
    const items = category ? category.items : [];

    return (
      <View style={styles.container}>
        <View style={styles.projectGrid}>
          {items.map(item => {
            const isCompleted = completedTopics.includes(item.id);
            const difficulty = (item.order_index ?? 0) + 1;
            
            // Difficulty Badge colors & label (1-5 beginner, 6-15 intermediate, 16+ advanced)
            let diffLabel = 'Beginner';
            let diffColor = '#7a9b76';
            let diffBg = 'rgba(122, 155, 118, 0.15)';
            if (difficulty >= 6 && difficulty <= 15) {
              diffLabel = 'Intermediate';
              diffColor = '#e8895a';
              diffBg = 'rgba(232, 137, 90, 0.15)';
            } else if (difficulty >= 16) {
              diffLabel = 'Advanced';
              diffColor = '#d9534f';
              diffBg = 'rgba(217, 83, 79, 0.15)';
            }

            return (
              <View
                key={item.id}
                style={[
                  styles.projectCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCompleted ? '#e8895a' : theme.border,
                    borderWidth: isCompleted ? 1.5 : 1
                  }
                ]}
              >
                <View style={styles.projectCardHeader}>
                  <View style={styles.projectTitleRow}>
                    <TouchableOpacity
                      style={styles.checkboxTouch}
                      onPress={() => onToggleComplete(item.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isCompleted ? '#e8895a' : theme.textSecondary,
                            backgroundColor: isCompleted ? '#e8895a' : 'transparent'
                          }
                        ]}
                      >
                        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.projectTitle,
                        {
                          color: theme.text,
                          textDecorationLine: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.7 : 1
                        }
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </View>
                  
                  {/* Difficulty Badge */}
                  <View style={[styles.diffBadge, { backgroundColor: diffBg }]}>
                    <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                      {diffLabel}
                    </Text>
                  </View>

                  {/* Subtopics as Steps to Build This */}
                  {item.subtopics && item.subtopics.length > 0 && (
                    <View style={styles.projectStepsContainer}>
                      <Text style={[styles.projectStepsHeader, { color: theme.textSecondary }]}>
                        Steps to build this:
                      </Text>
                      {item.subtopics.map(sub => (
                        <Text
                          key={sub.id}
                          style={[styles.projectStepText, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          • {sub.title}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Start Building Button */}
                <TouchableOpacity
                  style={[styles.startBuildingBtn, { backgroundColor: theme.accent }]}
                  onPress={() => {
                    const query = encodeURIComponent(`build ${item.title} from scratch tutorial`);
                    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
                  }}
                >
                  <Text style={styles.startBuildingBtnText}>Start Building</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // 2. Reading Track (Read & Understand)
  if (track === 'reading') {
    const category = activeCategory || roadmapData.find(cat => cat.id === 'reading');
    const items = category ? category.items : [];
    
    // Progress calculation
    const totalCount = items.length;
    const completedCount = items.filter(item => completedTopics.includes(item.id)).length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <View style={styles.container}>
        {/* Progress Bar Container */}
        <View style={[styles.readingProgressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.readingProgressHeader}>
            <Text style={[styles.readingProgressText, { color: theme.text }]}>
              Reading Progress
            </Text>
            <Text style={[styles.readingProgressSub, { color: theme.textSecondary }]}>
              {completedCount} of {totalCount} read
            </Text>
          </View>
          <View style={[styles.readingProgressBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.readingProgressBarFill,
                { width: `${progressPercentage}%`, backgroundColor: theme.accent }
              ]}
            />
          </View>
        </View>

        {/* Reading List */}
        <View style={styles.readingList}>
          {items.map(item => {
            const isCompleted = completedTopics.includes(item.id);
            const firstResourceUrl = item.resources && item.resources.length > 0
              ? item.resources[0].url
              : `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;

            return (
              <View
                key={item.id}
                style={[
                  styles.readingCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCompleted ? '#e8895a' : theme.border,
                    borderWidth: isCompleted ? 1.5 : 1
                  }
                ]}
              >
                <View style={styles.readingCardHeader}>
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => onToggleComplete(item.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isCompleted ? '#e8895a' : theme.textSecondary,
                          backgroundColor: isCompleted ? '#e8895a' : 'transparent'
                        }
                      ]}
                    >
                      {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.readingCardContent}>
                    <Text
                      style={[
                        styles.readingTitle,
                        {
                          color: theme.text,
                          textDecorationLine: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.7 : 1
                        }
                      ]}
                    >
                      {item.title}
                    </Text>

                    {/* Key points to understand */}
                    {item.subtopics && item.subtopics.length > 0 && (
                      <View style={styles.readingPointsContainer}>
                        <Text style={[styles.readingPointsHeader, { color: theme.textSecondary }]}>
                          Key points to understand:
                        </Text>
                        {item.subtopics.map(sub => (
                          <Text
                            key={sub.id}
                            style={[styles.readingPointText, { color: theme.text }]}
                          >
                            • {sub.title}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Read More Button */}
                <TouchableOpacity
                  style={[styles.readMoreBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(firstResourceUrl)}
                >
                  <Text style={[styles.readMoreBtnText, { color: theme.accent }]}>Read More</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // 3. Frontend & Backend Tracks (Vertical Timeline Spine) or default fallback
  const displayCategory = activeCategory || roadmapData.find(cat => cat.id === 'frontend') || (roadmapData.length > 0 ? roadmapData[0] : null);
  if (!displayCategory) return null;

  return (
    <View style={styles.container}>
      <View style={styles.categoryBlock}>
        {/* Category Header */}
        <View style={[
          styles.categoryHeader,
          {
            borderColor: displayCategory.items.every(item => completedTopics.includes(item.id)) ? theme.success : theme.accent,
            backgroundColor: theme.card
          }
        ]}>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>
            {displayCategory.title}
          </Text>
          <Text style={[styles.categorySub, { color: theme.textSecondary }]}>
            {displayCategory.items.filter(i => completedTopics.includes(i.id)).length} / {displayCategory.items.length} Completed
          </Text>
        </View>

        {/* List of topics with vertical connecting line */}
        <View style={styles.subtopicsList}>
          {displayCategory.items.map((item, itemIndex) => {
            const isCompleted = completedTopics.includes(item.id);
            const isCurrent = currentTopic && currentTopic.id === item.id;
            const isLast = itemIndex === displayCategory.items.length - 1;
            const isExpanded = expandedTopicId === item.id;

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

                {/* Card container */}
                <View style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCurrent ? theme.accent : theme.border,
                    borderWidth: isCurrent ? 1.5 : 1
                  }
                ]}>
                  {/* Top Row: Checkbox, Title, Notes button */}
                  <View style={styles.cardHeaderRow}>
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

                    {/* Clickable Info to Expand */}
                    <TouchableOpacity
                      style={styles.cardInfo}
                      onPress={() => toggleExpand(item.id)}
                      activeOpacity={0.7}
                    >
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
                    </TouchableOpacity>

                    {/* Notes button */}
                    <TouchableOpacity
                      style={[styles.notesBtn, { backgroundColor: theme.background }]}
                      onPress={() => onEditNotes(item)}
                    >
                      <Text style={[styles.notesBtnText, { color: theme.accent }]}>Notes</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Expanded Area */}
                  {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
                      {/* Subtopics Checklist */}
                      {item.subtopics && item.subtopics.length > 0 && (
                        <View style={styles.subtopicsContainer}>
                          <Text style={[styles.subtopicSectionHeader, { color: theme.textSecondary }]}>Subtopics</Text>
                          {item.subtopics.map(sub => {
                            const isSubCompleted = completedSubtopics.includes(sub.id);
                            return (
                              <View key={sub.id} style={styles.subtopicRow}>
                                <TouchableOpacity
                                  style={styles.subCheckboxTouch}
                                  onPress={() => onToggleSubtopicComplete(sub.id)}
                                >
                                  <View style={[
                                    styles.subCheckbox,
                                    {
                                      borderColor: isSubCompleted ? theme.success : theme.textSecondary,
                                      backgroundColor: isSubCompleted ? theme.success : 'transparent'
                                    }
                                  ]}>
                                    {isSubCompleted && <Text style={styles.subCheckmark}>✓</Text>}
                                  </View>
                                </TouchableOpacity>
                                <Text style={[
                                  styles.subtopicTitle,
                                  {
                                    color: theme.text,
                                    textDecorationLine: isSubCompleted ? 'line-through' : 'none',
                                    opacity: isSubCompleted ? 0.6 : 0.9
                                  }
                                ]}>
                                  {sub.title}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* "Learn This" Section */}
                      <View style={[styles.learnThisSection, { borderTopColor: theme.border }]}>
                        <Text style={[styles.learnThisHeader, { color: theme.accent }]}>Learn This</Text>
                        
                        {/* 1. YouTube Search Button (only if not found in resources) */}
                        {!ROADMAP_RESOURCES[item.title] && (
                          <TouchableOpacity
                            style={[styles.youtubeSearchBtn, { backgroundColor: '#FF0000' }]}
                            onPress={() => {
                              const query = encodeURIComponent(`${item.title} tutorial for beginners`);
                              Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
                            }}
                          >
                            <Text style={styles.youtubeSearchBtnText}>🔍 Search on YouTube</Text>
                          </TouchableOpacity>
                        )}

                        {/* 2. Text Input for YouTube URL */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                          Have a specific tutorial? Paste YouTube link here:
                        </Text>
                        <TextInput
                          style={[styles.youtubeInput, { 
                            backgroundColor: theme.background, 
                            color: theme.text, 
                            borderColor: theme.border 
                          }]}
                          placeholder="https://www.youtube.com/watch?v=..."
                          placeholderTextColor={theme.textSecondary}
                          onChangeText={(text) => handleUrlChange(item.id, text)}
                          value={youtubeUrls[item.id] || ''}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        {/* Showing video details/thumbnail if loaded */}
                        {videoMetadata[item.id] && (
                          <View style={styles.videoMetaContainer}>
                            {videoMetadata[item.id].loading ? (
                              <ActivityIndicator color={theme.accent} size="small" />
                            ) : (
                              <>
                                {videoMetadata[item.id].thumbnail ? (
                                  <Image
                                    source={{ uri: videoMetadata[item.id].thumbnail }}
                                    style={styles.videoThumbnail}
                                    resizeMode="cover"
                                  />
                                ) : null}
                                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={1}>
                                  {videoMetadata[item.id].title || "YouTube Video"}
                                </Text>
                                <TouchableOpacity
                                  style={[styles.watchBtn, { backgroundColor: theme.success }]}
                                  onPress={() => {
                                    Linking.openURL(videoMetadata[item.id].url);
                                  }}
                                >
                                  <Text style={styles.watchBtnText}>▶ Watch & Learn</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}

                        {/* Resources Section (only if found in resources) */}
                        {ROADMAP_RESOURCES[item.title] && (
                          <View style={styles.resourcesContainer}>
                            {/* Tabs Header */}
                            <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
                              <TouchableOpacity
                                style={[
                                  styles.tabButton,
                                  (activeResourceTabs[item.id] || 'free') === 'free' && { borderBottomColor: theme.accent }
                                ]}
                                onPress={() => setActiveResourceTabs(prev => ({ ...prev, [item.id]: 'free' }))}
                              >
                                <Text style={[
                                  styles.tabButtonText,
                                  { color: (activeResourceTabs[item.id] || 'free') === 'free' ? theme.accent : theme.textSecondary }
                                ]}>Free</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.tabButton,
                                  activeResourceTabs[item.id] === 'paid' && { borderBottomColor: theme.accent }
                                ]}
                                onPress={() => setActiveResourceTabs(prev => ({ ...prev, [item.id]: 'paid' }))}
                              >
                                <Text style={[
                                  styles.tabButtonText,
                                  { color: activeResourceTabs[item.id] === 'paid' ? theme.accent : theme.textSecondary }
                                ]}>Paid</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Active Tab Content */}
                            <View style={styles.resourceList}>
                              {(ROADMAP_RESOURCES[item.title][activeResourceTabs[item.id] || 'free'] || []).map((resource, resIndex) => (
                                <TouchableOpacity
                                  key={resIndex}
                                  style={[styles.resourceItem, { borderBottomColor: theme.border }]}
                                  onPress={() => Linking.openURL(resource.url)}
                                >
                                  <Text style={[styles.resourceTitle, { color: theme.text }]} numberOfLines={1}>
                                    {resource.title}
                                  </Text>
                                  <Text style={[styles.externalIcon, { color: theme.accent }]}>↗</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* 3. Small Notes Button */}
                        <View style={styles.notesRow}>
                          <TouchableOpacity
                            style={[styles.smallNotesBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => onEditNotes(item)}
                          >
                            <Text style={[styles.smallNotesBtnText, { color: theme.accent }]}>📝 Notes</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
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
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
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
    justifyContent: 'center',
    paddingVertical: 4
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
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5
  },
  subtopicsContainer: {
    marginBottom: 12
  },
  subtopicSectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  subtopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4
  },
  subCheckboxTouch: {
    padding: 4,
    marginRight: 8
  },
  subCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subCheckmark: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900'
  },
  subtopicTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  learnThisSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 0.5
  },
  learnThisHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  youtubeSearchBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row'
  },
  youtubeSearchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6
  },
  youtubeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 12
  },
  videoMetaContainer: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(91, 107, 122, 0.08)',
    marginBottom: 12,
    alignItems: 'center'
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  watchBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  watchBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  notesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4
  },
  smallNotesBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    alignItems: 'center'
  },
  smallNotesBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },
  resourcesContainer: {
    marginTop: 12,
    marginBottom: 16
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700'
  },
  resourceList: {
    paddingHorizontal: 4
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 0.95
  },
  externalIcon: {
    fontSize: 14,
    fontWeight: '700'
  },
  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20
  },
  projectCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    justifyContent: 'space-between'
  },
  projectCardHeader: {
    flex: 1
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    flexWrap: 'wrap'
  },
  diffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 12
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  projectStepsContainer: {
    marginBottom: 12
  },
  projectStepsHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  projectStepText: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.8
  },
  startBuildingBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  startBuildingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  readingProgressCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3
  },
  readingProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  readingProgressText: {
    fontSize: 16,
    fontWeight: '700'
  },
  readingProgressSub: {
    fontSize: 12,
    fontWeight: '600'
  },
  readingProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  readingProgressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  readingList: {
    paddingBottom: 20
  },
  readingCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3
  },
  readingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  readingCardContent: {
    flex: 1,
    marginLeft: 12
  },
  readingTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  readingPointsContainer: {
    marginTop: 8
  },
  readingPointsHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  readingPointText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8
  },
  readMoreBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  readMoreBtnText: {
    fontSize: 13,
    fontWeight: '700'
  }
});
