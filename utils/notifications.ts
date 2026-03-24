/**
 * In-app notification utility.
 * Uses a simple event emitter pattern so any screen can subscribe to status notifications.
 * In production this would integrate with Expo Notifications for push notifications.
 */

type NotificationListener = (message: string, type: 'success' | 'info' | 'warning') => void;

const listeners: NotificationListener[] = [];

export function subscribeToNotifications(listener: NotificationListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function emitNotification(message: string, type: 'success' | 'info' | 'warning' = 'info') {
  console.log(`[Notification] [${type.toUpperCase()}] ${message}`);
  listeners.forEach(l => l(message, type));
}

// Map application status to notification messages
export function getStatusNotificationMessage(status: string): { message: string; type: 'success' | 'info' | 'warning' } {
  switch (status) {
    case 'submitted':
      return { message: 'Your application has been submitted successfully.', type: 'success' };
    case 'processing':
      return { message: 'Your application is being processed by Home Affairs.', type: 'info' };
    case 'approved':
      return { message: 'Your application has been approved!', type: 'success' };
    case 'ready_for_collection':
      return { message: 'Your document is ready for collection at your nearest Home Affairs office.', type: 'success' };
    case 'rejected':
      return { message: 'Your application was not approved. Please visit a Home Affairs office.', type: 'warning' };
    default:
      return { message: `Application status updated to: ${status}`, type: 'info' };
  }
}
