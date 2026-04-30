import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarOutlined, FileTextOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useIsMobile } from '../hooks/useIsMobile';
import './BottomNavigationBar.css';

export default function BottomNavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(768);

  if (!isMobile) {
    return null;
  }

  const isActive = (path) => {
    if (path === '/tecnico-mobile' && location.pathname.startsWith('/tecnico-mobile')) {
      return true;
    }
    return location.pathname === path;
  };

  const items = [
    {
      id: 'today',
      label: 'Hoje',
      icon: CalendarOutlined,
      path: '/tecnico-mobile'
    },
    {
      id: 'os',
      label: 'OS',
      icon: FileTextOutlined,
      path: '/ordens'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageOutlined,
      path: '/chat'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: UserOutlined,
      path: '/profile'
    }
  ];

  return (
    <nav className="bottom-navigation">
      <div className="bottom-nav-content">
        {items.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              <IconComponent className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
