import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { AuthPayload, Announcement, AnnouncementWithDetail } from '../types';

const router = Router();

// POST /api/announcements - 管理员创建公告
router.post('/', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const { title, content, target_role } = req.body;

  if (!title || !content || !target_role) {
    res.status(400).json({ error: '请填写标题、内容和接收角色' });
    return;
  }

  if (!['all', 'admin', 'driver'].includes(target_role)) {
    res.status(400).json({ error: '接收角色无效' });
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO announcements (title, content, target_role, created_by) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(title, content, target_role, user.userId);

  const announcement = db.prepare(
    'SELECT a.*, u.name as creator_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.id = ?'
  ).get(result.lastInsertRowid);

  res.json(announcement);
});

// GET /api/announcements - 管理员查看所有公告
router.get('/', authMiddleware, adminOnly, (_req: Request, res: Response) => {
  const announcements = db.prepare(
    `SELECT a.*, u.name as creator_name 
     FROM announcements a 
     LEFT JOIN users u ON a.created_by = u.id 
     ORDER BY a.created_at DESC`
  ).all();

  res.json(announcements);
});

// GET /api/announcements/mine - 当前用户查看可见的公告
router.get('/mine', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;

  const announcements = db.prepare(
    `SELECT a.*, u.name as creator_name, 
            CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
            ar.read_at
     FROM announcements a 
     LEFT JOIN users u ON a.created_by = u.id
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
     WHERE a.target_role = 'all' OR a.target_role = ?
     ORDER BY a.created_at DESC`
  ).all(user.userId, user.role);

  res.json(announcements);
});

// GET /api/announcements/unread-count - 获取未读公告数量
router.get('/unread-count', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;

  const result = db.prepare(
    `SELECT COUNT(*) as count
     FROM announcements a 
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
     WHERE (a.target_role = 'all' OR a.target_role = ?) AND ar.id IS NULL`
  ).get(user.userId, user.role) as { count: number };

  res.json({ unreadCount: result.count });
});

// POST /api/announcements/:id/read - 标记公告为已读
router.post('/:id/read', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;
  const announcementId = Number(req.params.id);

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId) as Announcement | undefined;
  if (!announcement) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }

  if (announcement.target_role !== 'all' && announcement.target_role !== user.role) {
    res.status(403).json({ error: '无权查看此公告' });
    return;
  }

  db.prepare(
    'INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)'
  ).run(announcementId, user.userId);

  res.json({ message: '已标记为已读' });
});

// POST /api/announcements/read-all - 标记所有公告为已读
router.post('/read-all', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthPayload;

  const visibleAnnouncements = db.prepare(
    `SELECT id FROM announcements WHERE target_role = 'all' OR target_role = ?`
  ).all(user.role) as Array<{ id: number }>;

  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)'
  );

  const tx = db.transaction((announcements: Array<{ id: number }>) => {
    for (const a of announcements) {
      insertStmt.run(a.id, user.userId);
    }
  });

  tx(visibleAnnouncements);

  res.json({ message: '已全部标记为已读', count: visibleAnnouncements.length });
});

// DELETE /api/announcements/:id - 管理员删除公告
router.delete('/:id', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const announcementId = Number(req.params.id);

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
  if (!announcement) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }

  db.prepare('DELETE FROM announcements WHERE id = ?').run(announcementId);

  res.json({ message: '公告已删除' });
});

export default router;
