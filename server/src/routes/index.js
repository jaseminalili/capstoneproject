const { Router } = require('express')
const { body } = require('express-validator')

const { authenticate, requireWorkspaceRole, requireProjectMember } = require('../middleware/auth')
const { validate } = require('../middleware/errorHandler')

const auth      = require('../controllers/authController')
const pwdReset  = require('../controllers/passwordResetController')
const ws        = require('../controllers/workspaceController')
const team      = require('../controllers/teamController')
const proj      = require('../controllers/projectController')
const task      = require('../controllers/taskController')
const search    = require('../controllers/searchController')
const notify    = require('../controllers/notificationController')

const router = Router()

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/register',
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min:2, max:120 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min:8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  validate,
  auth.register
)

router.post('/auth/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  auth.login
)

router.get('/auth/me',      authenticate, auth.me)
router.put('/auth/profile', authenticate, auth.updateProfile)
router.put('/auth/password',
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min:8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  validate,
  auth.changePassword
)
router.delete('/auth/account', authenticate, auth.deleteAccount)

// ── Forgot / Reset Password ───────────────────────────────────────────────────
router.post('/auth/forgot-password',
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  validate,
  pwdReset.forgotPassword
)

router.get('/auth/verify-reset-token', pwdReset.verifyResetToken)

router.post('/auth/reset-password',
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min:8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Must contain a special character'),
  validate,
  pwdReset.resetPassword
)

// ── Invitations (public) ──────────────────────────────────────────────────────
router.get('/invite/info',    team.getInviteInfo)
router.post('/invite/accept', authenticate, team.acceptInvite)

// ── Workspaces ────────────────────────────────────────────────────────────────
router.get('/workspaces',                    authenticate, ws.list)
router.post('/workspaces',                   authenticate, ws.create)
router.get('/workspaces/:workspaceId',       authenticate, requireWorkspaceRole('member'), ws.get)
router.put('/workspaces/:workspaceId',       authenticate, requireWorkspaceRole('owner'),  ws.update)
router.delete('/workspaces/:workspaceId',    authenticate, requireWorkspaceRole('owner'),  ws.delete)
router.get('/workspaces/:workspaceId/stats', authenticate, requireWorkspaceRole('member'), ws.getStats)
router.get('/workspaces/:workspaceId/users', authenticate, requireWorkspaceRole('member'), team.getWorkspaceUsers)

// ── Team ──────────────────────────────────────────────────────────────────────
router.get('/workspaces/:workspaceId/members',
  authenticate, requireWorkspaceRole('member'), team.getMembers)

router.post('/workspaces/:workspaceId/invite',
  authenticate, requireWorkspaceRole('admin'),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin','member']),
  validate,
  team.inviteMember)

router.patch('/workspaces/:workspaceId/members/:userId/role',
  authenticate, requireWorkspaceRole('admin'),
  body('role').isIn(['admin','member']),
  validate,
  team.updateMemberRole)

router.delete('/workspaces/:workspaceId/members/:userId',
  authenticate, requireWorkspaceRole('admin'),
  team.removeMember)

// ── Projects ──────────────────────────────────────────────────────────────────
router.get('/workspaces/:workspaceId/projects',
  authenticate, requireWorkspaceRole('member'), proj.listForWorkspace)

router.post('/workspaces/:workspaceId/projects',
  authenticate, requireWorkspaceRole('member'),
  body('name').trim().notEmpty().isLength({ max:200 }),
  validate,
  proj.create)

router.get('/projects/:id',       authenticate, requireProjectMember, proj.getOne)
router.get('/projects/:id/stats', authenticate, requireProjectMember, proj.getProjectStats)
router.put('/projects/:id',       authenticate, requireProjectMember, proj.update)
router.delete('/projects/:id',    authenticate, proj.delete)

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks/my',     authenticate, task.getMyTasks)
router.get('/tasks/:id',    authenticate, task.getOne)
router.put('/tasks/:id',    authenticate, task.update)
router.delete('/tasks/:id', authenticate, task.delete)

router.get('/projects/:projectId/tasks',
  authenticate, requireProjectMember, task.listForProject)

router.post('/projects/:projectId/tasks',
  authenticate, requireProjectMember,
  body('title').trim().notEmpty().isLength({ max:300 }),
  validate,
  task.create)

// ── Comments ──────────────────────────────────────────────────────────────────
router.post('/tasks/:id/comments',
  authenticate,
  body('content').trim().notEmpty().isLength({ max:5000 }),
  validate,
  task.addComment)

router.put('/tasks/:id/comments/:commentId',    authenticate, task.updateComment)
router.delete('/tasks/:id/comments/:commentId', authenticate, task.deleteComment)

// ── Search ────────────────────────────────────────────────────────────────────
router.get('/workspaces/:workspaceId/search',
  authenticate, requireWorkspaceRole('member'), search.search)

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications',            authenticate, notify.list)
router.patch('/notifications/read',     authenticate, notify.markAllAsRead)
router.patch('/notifications/:id/read', authenticate, notify.markAsRead)

module.exports = router