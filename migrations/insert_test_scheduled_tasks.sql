-- Test data for scheduled_tasks
-- User ID: 7d41ba64-9f9e-11f0-8c14-02daa209c137
-- Project ID: fc10ce3a-06ab-47ef-967a-f31d079c050c

-- Task 1: Today
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Review Sprint Goals',
  'Review and update sprint goals for the current iteration',
  CURDATE(),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 2: Tomorrow
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Team Standup Meeting',
  'Daily standup with development team',
  DATE_ADD(CURDATE(), INTERVAL 1 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'medium',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 3: In 3 days
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Code Review Session',
  'Review pending pull requests from team members',
  DATE_ADD(CURDATE(), INTERVAL 3 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'in_progress',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 4: In 5 days
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Client Presentation',
  'Present project progress to stakeholders',
  DATE_ADD(CURDATE(), INTERVAL 5 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 5: In 7 days (next week)
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Database Backup',
  'Perform weekly database backup and verification',
  DATE_ADD(CURDATE(), INTERVAL 7 DAY),
  NULL,
  'medium',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 6: In 10 days
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Security Audit',
  'Conduct security audit of authentication system',
  DATE_ADD(CURDATE(), INTERVAL 10 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 7: In 14 days (2 weeks)
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Update Documentation',
  'Update API documentation with new endpoints',
  DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  NULL,
  'low',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 8: In 21 days (3 weeks)
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Performance Testing',
  'Run performance tests on production environment',
  DATE_ADD(CURDATE(), INTERVAL 21 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'medium',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 9: In 30 days (1 month)
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Deploy to Production',
  'Deploy latest release to production environment',
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'todo',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Task 10: Yesterday (overdue)
INSERT INTO scheduled_tasks (id, project_id, title, description, due_date, assigned_to, importance, status, created_by, created_at, updated_at)
VALUES (
  UUID(),
  'fc10ce3a-06ab-47ef-967a-f31d079c050c',
  'Fix Critical Bug',
  'Urgent bug fix needed in authentication module',
  DATE_SUB(CURDATE(), INTERVAL 1 DAY),
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  'high',
  'in_progress',
  '7d41ba64-9f9e-11f0-8c14-02daa209c137',
  NOW(),
  NOW()
);

-- Verify inserts
SELECT 
  id,
  title,
  due_date,
  importance,
  status,
  CASE 
    WHEN due_date < CURDATE() THEN 'OVERDUE'
    WHEN due_date = CURDATE() THEN 'TODAY'
    WHEN due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 'TOMORROW'
    ELSE CONCAT('IN ', DATEDIFF(due_date, CURDATE()), ' DAYS')
  END as time_status
FROM scheduled_tasks
WHERE project_id = 'fc10ce3a-06ab-47ef-967a-f31d079c050c'
ORDER BY due_date ASC;
