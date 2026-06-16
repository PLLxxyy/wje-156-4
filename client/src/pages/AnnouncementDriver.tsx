import React, { useState, useEffect } from 'react';
import {
  getMyAnnouncements,
  markAnnouncementRead,
  markAllAnnouncementsRead,
} from '../api';
import { Announcement, TARGET_ROLE_LABELS } from '../types';

interface Props {
  showToast: (msg: string, type?: string) => void;
  onUnreadChange?: (count: number) => void;
}

export default function AnnouncementDriver({ showToast, onUnreadChange }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await getMyAnnouncements();
      setAnnouncements(data);
      if (onUnreadChange) {
        const unread = data.filter((a: any) => !a.is_read).length;
        onUnreadChange(unread);
      }
    } catch (err: any) {
      showToast(err.message || '加载公告失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await markAnnouncementRead(id);
      setAnnouncements(prev =>
        prev.map(a => (a.id === id ? { ...a, is_read: 1 } : a))
      );
      if (onUnreadChange) {
        const unread = announcements.filter((a: any) => !a.is_read && a.id !== id).length;
        onUnreadChange(unread);
      }
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAnnouncementsRead();
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: 1 })));
      if (onUnreadChange) {
        onUnreadChange(0);
      }
      showToast('已全部标记为已读');
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  }

  const unreadCount = announcements.filter((a: any) => !a.is_read).length;

  return (
    <div>
      <div className="card">
        <div className="page-header">
          <h3>公告通知</h3>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
              全部标记已读
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <p>暂无公告</p>
          </div>
        ) : (
          <div className="announcement-list">
            {announcements.map((a) => {
              const isUnread = !a.is_read;
              return (
                <div key={a.id} className={`announcement-item ${isUnread ? 'unread' : ''}`}>
                  <div className="announcement-header">
                    <div className={`announcement-title ${isUnread ? 'unread-badge' : ''}`}>
                      {a.title}
                    </div>
                    {isUnread && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMarkRead(a.id)}
                      >
                        标记已读
                      </button>
                    )}
                  </div>
                  <div className="announcement-meta">
                    <span className={`announcement-badge badge-${a.target_role}`}>
                      {TARGET_ROLE_LABELS[a.target_role]}
                    </span>
                    <span>发布人：{a.creator_name}</span>
                    <span>发布时间：{a.created_at}</span>
                    {!isUnread && a.read_at && (
                      <span style={{ color: '#28a745' }}>已读于 {a.read_at}</span>
                    )}
                  </div>
                  <div className="announcement-content">{a.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
