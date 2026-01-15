import { EventEmitter } from 'events';

export const EventBus = new EventEmitter();

// Usage example:
// EventBus.emit('eventName', eventData);
// EventBus.on('eventName', (eventData) => { ... });

// first component
const onSuccess = () => {
  // call event emitter to notify other components
  EventBus.emit('vipPromoted');
};

// second component
useEffect(() => {
  // Scroll to top if event emitter vipPromoted is called and redirected back from VIPPromotionScreen
  const handler = () => {
    console.log('VIP promoted event received, scrolling to top');
  };

  // sign in to event listener
  EventBus.on('vipPromoted', handler);

  return () => {
    // sign out from event listener
    EventBus.off('vipPromoted', handler);
  };
}, []);
