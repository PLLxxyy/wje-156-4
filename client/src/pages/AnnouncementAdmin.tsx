import React, { useState, useEffect } from 'react';
import { createAnnouncement, getAnnouncements, deleteAnnouncement } from '../api';
import { Announcement, TARGET_ROLE_LABELS } from '../types';

interface Props {
  showToast: (msg: string, type?: string) => void;
}

export default function AnnouncementAdmin({ showToast }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'admin' | 'driver'>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      showToast(err.message || '加载公告失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      showToast('请填写标题和内容', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createAnnouncement({ title: title.trim(), content: content.trim(), target_role: targetRole });
      showToast('公告发布成功');
      setShowModal(false);
      setTitle('');
      setContent('');
      setTargetRole('all');
      loadAnnouncements();
    } catch (err: any) {
      showToast(err.message || '发布失败', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此公告？')) return;
    try {
      await deleteAnnouncement(id);
      showToast('公告已删除');
      loadAnnouncements();
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  }

  return (
    <div>
      <div className="card">
        <div className="page-header">
          <h3>公告管理</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + 发布公告
          </button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <p>暂无公告</p>
          </div>
        ) : (
          <div className="announcement-list">
            {announcements.map((a) => (
              <div key={a.id} className="announcement-item">
                <div className="announcement-header">
                  <div className="announcement-title">{a.title}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>
                    删除
                  </button>
                </div>
                <div className="announcement-meta">
                  <span className={`announcement-badge badge-${a.target_role}`}>
                    {TARGET_ROLE_LABELS[a.target_role]}
                  </span>
                  <span>发布人：{a.creator_name}</span>
                  <span>发布时间：{a.created_at}</span>
                </div>
                <div className="announcement-content">{a.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <h3>发布公告</h3>
            <div className="form-group">
              <label>公告标题</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="请输入公告标题"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>接收角色</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value as any)}>
                <option value="all">全部（管理员和司机）</option>
                <option value="admin">仅管理员</option>
                <option value="driver">仅司机</option>
              </select>
            </div>
            <div className="form-group">
              <label>公告内容</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="请输入公告内容"
                rows={6}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
