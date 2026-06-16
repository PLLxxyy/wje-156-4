import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ScheduleCalendar from './pages/ScheduleCalendar';
import DriverSchedule from './pages/DriverSchedule';
import AttendancePage from './pages/AttendancePage';
import AdminStats from './pages/AdminStats';
import AnnouncementAdmin from './pages/AnnouncementAdmin';
import AnnouncementDriver from './pages/AnnouncementDriver';
import { getUnreadAnnouncementCount } from './api';

type AdminPage = 'schedule' | 'stats' | 'announcements';
type DriverPage = 'schedule' | 'attendance' | 'announcements';

function App() {
  const { user, loading, logout } = useAuth();
  const [adminPage, setAdminPage] = useState<AdminPage>('schedule');
  const [driverPage, setDriverPage] = useState<DriverPage>('schedule');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const showToast = useCallback((msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  async function loadUnreadCount() {
    try {
      const result = await getUnreadAnnouncementCount();
      setUnreadCount(result.unreadCount);
    } catch {}
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="loading"><div className="spinner" /> 加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Login showToast={showToast} />;
  }

  if (user.role === 'admin') {
    return (
      <div className="app-container">
        <header className="header">
          <h1>公交司机排班管理系统</h1>
          <div className="header-nav">
            <button className={adminPage === 'schedule' ? 'active' : ''} onClick={() => setAdminPage('schedule')}>排班管理</button>
            <button className={adminPage === 'stats' ? 'active' : ''} onClick={() => setAdminPage('stats')}>统计后台</button>
            <button className={adminPage === 'announcements' ? 'active' : ''} onClick={() => setAdminPage('announcements')}>公告管理</button>
          </div>
          <div className="header-right">
            <span className="header-role">管理员</span>
            <span className="header-user">{user.name}</span>
            <button className="btn btn-logout" onClick={logout}>退出</button>
          </div>
        </header>
        <main className="main-content">
          {adminPage === 'schedule' ? <ScheduleCalendar showToast={showToast} /> :
           adminPage === 'stats' ? <AdminStats showToast={showToast} /> :
           <AnnouncementAdmin showToast={showToast} />}
        </main>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  // Driver
  return (
    <div className="app-container">
      <header className="header">
        <h1>公交司机排班管理系统</h1>
        <div className="header-nav">
          <button className={driverPage === 'schedule' ? 'active' : ''} onClick={() => setDriverPage('schedule')}>我的排班</button>
          <button className={driverPage === 'attendance' ? 'active' : ''} onClick={() => setDriverPage('attendance')}>签到签退</button>
          <button className={driverPage === 'announcements' ? 'active' : ''} onClick={() => setDriverPage('announcements')}>
            公告通知
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        </div>
        <div className="header-right">
          <span className="header-role">司机</span>
          <span className="header-user">{user.name}</span>
          <button className="btn btn-logout" onClick={logout}>退出</button>
        </div>
      </header>
      <main className="main-content">
        {driverPage === 'schedule' ? <DriverSchedule /> :
         driverPage === 'attendance' ? <AttendancePage showToast={showToast} /> :
         <AnnouncementDriver showToast={showToast} onUnreadChange={setUnreadCount} />}
      </main>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

export default App;
