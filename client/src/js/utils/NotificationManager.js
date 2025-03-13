/**
 * Utility class to manage in-game notifications
 */
export class NotificationManager {
  constructor() {
    this.notificationContainer = null;
    this.notificationTimeout = null;
    this.initialize();
  }

  initialize() {
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.className = 'notification-container';
      document.body.appendChild(this.notificationContainer);
    }
  }

  showNotification(message, type = 'info') {
    // Check if we already have an active notification
    let notification = this.notificationContainer.querySelector('.game-notification');

    if (!notification) {
      // Create a new notification if one doesn't exist
      notification = document.createElement('div');
      notification.className = 'game-notification';
      this.notificationContainer.appendChild(notification);
    }

    // Update notification based on message type
    let iconText = '';
    switch(type) {
    case 'join':
      iconText = '🎮';
      notification.className = 'game-notification notification-join';
      break;
    case 'death':
      iconText = '💀';
      notification.className = 'game-notification notification-death';
      break;
    case 'respawn':
      iconText = '✨';
      notification.className = 'game-notification notification-respawn';
      break;
    case 'hit':
      iconText = '💥';
      notification.className = 'game-notification notification-hit';
      break;
    case 'kill':
      iconText = '🏆';
      notification.className = 'game-notification notification-kill';
      break;
    default:
      iconText = 'ℹ️';
      notification.className = 'game-notification notification-info';
    }

    // Clear previous content
    notification.innerHTML = '';

    // Add icon
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = iconText;
    notification.appendChild(icon);

    // Add text
    const text = document.createElement('span');
    text.textContent = message;
    text.className = 'notification-text';
    notification.appendChild(text);

    // Make sure notification is visible
    notification.classList.remove('fadeout');

    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Set timeout to hide notification
    this.notificationTimeout = setTimeout(() => {
      notification.classList.add('fadeout');
    }, type === 'join' || type === 'death' ? 5000 : 3000);
  }
}