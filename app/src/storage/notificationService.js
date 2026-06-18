import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set up the default foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_TEMPLATES = [
  (topic) => ({
    title: "Next Stop: Coding Mastery! 🚀",
    body: `Your brain is waiting for "${topic}". Let's write some code together!`
  }),
  (topic) => ({
    title: "Knock knock! 💻",
    body: `"${topic}" is waiting at your door. Let's tackle it in just 5 minutes!`
  }),
  (topic) => ({
    title: "Study Mission Incoming! 🕵️‍♂️",
    body: `Today's objective, should you choose to accept: Conquer "${topic}".`
  }),
  (topic) => ({
    title: "Behold, your next challenge! 🛡️",
    body: `Level up your skills. Current quest: "${topic}".`
  }),
  (topic) => ({
    title: "Future senior developer calling... 📞",
    body: `They left a message: "Don't forget to study '${topic}' today!"`
  })
];

export const NotificationService = {
  /**
   * Request user permission for notifications and configure channels on Android.
   * Returns true if permissions are granted.
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('codepath_reminders', {
          name: 'CodePath Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#805ad5', // Purple accent color
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  },

  /**
   * Cancel all currently scheduled notifications.
   */
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  },

  /**
   * Schedule a new local reminder 24 hours in the future.
   * @param {string} nextTopicTitle 
   */
  async scheduleNextTopicReminder(nextTopicTitle) {
    try {
      // Clean up previous schedules first
      await this.cancelAllReminders();

      const topic = nextTopicTitle || "your next coding topic";
      
      // Select a random playful template
      const templateIndex = Math.floor(Math.random() * REMINDER_TEMPLATES.length);
      const template = REMINDER_TEMPLATES[templateIndex];
      const { title, body } = template(topic);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          android: {
            channelId: 'codepath_reminders',
          },
          data: { topicTitle: topic }
        },
        trigger: {
          seconds: 24 * 60 * 60, // 24 hours
          repeats: true,         // Repeat daily
        },
      });
    } catch (error) {
      console.error('Failed to schedule next topic reminder:', error);
    }
  },

  /**
   * Immediately schedules a notification 5 seconds from now for testing purposes.
   * @param {string} nextTopicTitle 
   */
  async sendImmediateTestNotification(nextTopicTitle) {
    try {
      const topic = nextTopicTitle || "HTML Essentials";
      const templateIndex = Math.floor(Math.random() * REMINDER_TEMPLATES.length);
      const template = REMINDER_TEMPLATES[templateIndex];
      const { title, body } = template(topic);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `[Test] ${title}`,
          body,
          sound: true,
          android: {
            channelId: 'codepath_reminders',
          },
          data: { topicTitle: topic }
        },
        trigger: {
          seconds: 5, // 5 seconds
        },
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }
};
