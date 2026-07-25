import { useAuthStore } from '../../store/useAuthStore';
import { SmartNotifications } from '../ai/SmartNotifications';

export const NotificationBell = () => {
  const { user } = useAuthStore();

  return (
    <SmartNotifications 
      mode="dropdown" 
      userRole={user?.role} 
      userName={user?.full_name?.split(' ')[0]} 
    />
  );
};

